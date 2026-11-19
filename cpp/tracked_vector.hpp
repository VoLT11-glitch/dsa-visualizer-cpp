// tracked_vector.hpp — drop-in-ish replacement for vector<int> that records every
// read / write / compare / swap as JSON, so dsa-visualizer-cpp can replay it.
//
//   #include "tracked_vector.hpp"
//   TrackedVector<int> a = {5, 2, 9, 1};      // instead of vector<int>
//   ... your algorithm, unchanged: a[i], a[j] > a[j+1], swap(a[i], a[j]) ...
//
// Compile with C++20:  g++ -std=c++20 -O0 your.cpp -o your
// On exit it writes trace.json (or the path in env var TV_TRACE). Load that file
// on the "Trace replay" page.
//
// Limits (on purpose, MVP): arithmetic element types only; indexing via operator[]
// only (no iterators, no std::sort on it); `auto x = a[i]` gives a proxy — write
// `int x = a[i]` instead. Logging stops after TV_MAX_OPS ops (default 200000).
#pragma once
#include <cstdio>
#include <cstdlib>
#include <initializer_list>
#include <source_location>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

#ifndef TV_MAX_OPS
#define TV_MAX_OPS 200000
#endif

namespace tv {

struct Op {
    char type;  // r=read w=write c=compare s=swap p=push o=pop
    int vec;
    long long i, j;
    double x;
    unsigned line;
};

class Tracer {
public:
    static Tracer& get() {
        static Tracer t;
        return t;
    }
    int addVector(const std::string& name, const std::vector<double>& init) {
        names_.push_back(name);
        inits_.push_back(init);
        return static_cast<int>(names_.size()) - 1;
    }
    void log(char type, int vec, long long i, long long j, double x, unsigned line) {
        if (dumped_) return;
        if (ops_.size() >= TV_MAX_OPS) { truncated_ = true; return; }
        ops_.push_back({type, vec, i, j, x, line});
    }
    void dump() {
        if (dumped_) return;
        dumped_ = true;
        const char* path = std::getenv("TV_TRACE");
        FILE* f = std::fopen(path ? path : "trace.json", "w");
        if (!f) return;
        std::fprintf(f, "{\"version\":1,\"truncated\":%s,\"vectors\":[", truncated_ ? "true" : "false");
        for (size_t v = 0; v < names_.size(); v++) {
            std::fprintf(f, "%s{\"id\":%zu,\"name\":\"%s\",\"init\":[", v ? "," : "", v, names_[v].c_str());
            for (size_t k = 0; k < inits_[v].size(); k++) std::fprintf(f, "%s%.17g", k ? "," : "", inits_[v][k]);
            std::fprintf(f, "]}");
        }
        std::fprintf(f, "],\"ops\":[");
        for (size_t k = 0; k < ops_.size(); k++) {
            const Op& o = ops_[k];
            std::fprintf(f, "%s\n{\"t\":\"%c\",\"v\":%d,\"i\":%lld", k ? "," : "", o.type, o.vec, o.i);
            if (o.type == 'c' || o.type == 's') std::fprintf(f, ",\"j\":%lld", o.j);
            if (o.type == 'w' || o.type == 'p' || o.type == 'r' || (o.type == 'c' && o.j < 0))
                std::fprintf(f, ",\"x\":%.17g", o.x);
            std::fprintf(f, ",\"line\":%u}", o.line);
        }
        std::fprintf(f, "\n]}\n");
        std::fclose(f);
    }
    ~Tracer() { dump(); }

private:
    std::vector<std::string> names_;
    std::vector<std::vector<double>> inits_;
    std::vector<Op> ops_;
    bool truncated_ = false, dumped_ = false;
};

/** Index wrapper: its converting constructor captures the caller's line number. */
struct Index {
    size_t v;
    unsigned line;
    template <class I, class = std::enable_if_t<std::is_integral_v<I>>>
    Index(I i, std::source_location loc = std::source_location::current())
        : v(static_cast<size_t>(i)), line(loc.line()) {}
};

inline void dump() { Tracer::get().dump(); }

template <class T>
class TrackedVector {
    static_assert(std::is_arithmetic_v<T>, "TrackedVector<T> supports arithmetic T only");
    std::vector<T> d_;
    int id_;

    void reg(const std::string& name) {
        id_ = Tracer::get().addVector(name, std::vector<double>(d_.begin(), d_.end()));
    }

public:
    class Ref {
        TrackedVector* p_;
        size_t i_;
        unsigned line_;
        T& raw() const { return p_->d_[i_]; }
        void log(char t, long long j, double x) const { Tracer::get().log(t, p_->id_, (long long)i_, j, x, line_); }

    public:
        Ref(TrackedVector* p, size_t i, unsigned line) : p_(p), i_(i), line_(line) {}
        operator T() const { log('r', 0, (double)raw()); return raw(); }
        Ref& operator=(const T& x) { raw() = x; log('w', 0, (double)x); return *this; }
        Ref& operator=(const Ref& o) { T x = o; return *this = x; }
        Ref& operator+=(const T& x) { T v = *this; return *this = v + x; }
        Ref& operator-=(const T& x) { T v = *this; return *this = v - x; }
        Ref& operator++() { return *this += 1; }
        Ref& operator--() { return *this -= 1; }

        // Element-vs-element comparisons log one "c" op with both indices.
#define TV_CMP(OP)                                                                      \
    friend bool operator OP(const Ref& a, const Ref& b) {                               \
        Tracer::get().log('c', a.p_->id_, (long long)a.i_, (long long)b.i_, 0, a.line_); \
        return a.raw() OP b.raw();                                                      \
    }                                                                                   \
    friend bool operator OP(const Ref& a, const T& b) {                                 \
        Tracer::get().log('c', a.p_->id_, (long long)a.i_, -1, (double)b, a.line_);     \
        return a.raw() OP b;                                                            \
    }                                                                                   \
    friend bool operator OP(const T& b, const Ref& a) {                                 \
        Tracer::get().log('c', a.p_->id_, (long long)a.i_, -1, (double)b, a.line_);     \
        return b OP a.raw();                                                            \
    }
        TV_CMP(<) TV_CMP(>) TV_CMP(<=) TV_CMP(>=) TV_CMP(==) TV_CMP(!=)
#undef TV_CMP

        // Found by ADL for swap(a[i], a[j]); std::swap can't bind to these temporaries.
        friend void swap(Ref a, Ref b) {
            Tracer::get().log('s', a.p_->id_, (long long)a.i_, (long long)b.i_, 0, a.line_);
            std::swap(a.raw(), b.raw());
        }
    };

    TrackedVector(std::initializer_list<T> il, const std::string& name = "a") : d_(il) { reg(name); }
    TrackedVector(const std::vector<T>& v, const std::string& name = "a") : d_(v) { reg(name); }
    explicit TrackedVector(size_t n, T val = T(), const std::string& name = "a") : d_(n, val) { reg(name); }
    TrackedVector(const TrackedVector&) = delete;
    TrackedVector& operator=(const TrackedVector&) = delete;

    Ref operator[](Index i) { return Ref(this, i.v, i.line); }
    size_t size() const { return d_.size(); }
    bool empty() const { return d_.empty(); }
    void push_back(const T& x, std::source_location loc = std::source_location::current()) {
        d_.push_back(x);
        Tracer::get().log('p', id_, (long long)d_.size() - 1, 0, (double)x, loc.line());
    }
    void pop_back(std::source_location loc = std::source_location::current()) {
        d_.pop_back();
        Tracer::get().log('o', id_, (long long)d_.size(), 0, 0, loc.line());
    }
    const std::vector<T>& raw() const { return d_; }
};

}  // namespace tv

using tv::TrackedVector;
