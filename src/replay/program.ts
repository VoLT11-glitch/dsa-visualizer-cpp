import headerSrc from '../../cpp/tracked_vector.hpp?raw';

/** Inline the header, then #line 1 so source_location reports the user's own line numbers. */
const header = headerSrc.replace(/^#pragma once\s*$/m, '');

export function buildTraceProgram(userSrc: string) {
  const body = userSrc.replace(/\r/g, '').split('\n').map((l) => (/#include\s*["<][^">]*tracked_vector\.hpp[">]/.test(l) ? '' : l)).join('\n');
  return `#define TV_STDERR
#define TV_MAX_OPS 3000
${header}
#line 1 "main.cpp"
${body}
`;
}
