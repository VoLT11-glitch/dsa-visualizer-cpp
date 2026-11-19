// Compiles every C++ snippet shown in the UI (syntax + type check) with g++.
// Usage: npm run check:cpp
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'cpp');
const needsNode = (f) => /^bst_(in|pre|post)order\.cpp$/.test(f);
let failed = 0;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.cpp'))) {
  const args = ['-std=c++17', '-fsyntax-only', '-Wall', '-include', join(root, 'scripts', 'prelude.hpp')];
  if (needsNode(f)) args.push('-include', join(root, 'scripts', 'node.hpp'));
  args.push(join(dir, f));
  try {
    execFileSync('g++', args, { stdio: 'pipe' });
    console.log(`ok   ${f}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${f}\n${e.stderr?.toString()}`);
  }
}
process.exit(failed ? 1 : 0);
