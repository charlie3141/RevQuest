/* ============================================================
 * RevQuest — binaries/level6.js — "Anti-Debug"
 * ptrace(PTRACE_TRACEME) chặn debugger; flag bị XOR-obfuscate thành
 * "SFW{bouj_efch}" (mỗi chữ +1). Đa đường: decomp+rename decode ·
 * gdb break ptrace · ltrace nhận diện anti-debug.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
window.RevQuest.binaries = window.RevQuest.binaries || {};

const RQ6_ENC = 'SFW{bouj_efch}';

window.RevQuest.binaries.level6 = {
  name: 'challenge', arch: 'x86-64', format: 'elf64-pie', size: 18560,
  fileOutput: 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=e9a1c3f5b7d9e1a3c5f7b9d1e3a5c7f9b1d3e5a7, for GNU/Linux 3.2.0, not stripped',

  readelfOut: [
    'ELF Header:', '  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 ',
    '  Class:                             ELF64', "  Data:                              2's complement, little-endian",
    '  Type:                              DYN (Position-Independent Executable file)',
    '  Machine:                           Advanced Micro Devices X86-64',
    '  Entry point address:               0x1090', '  Number of section headers:         31'
  ].join('\n'),

  stringsOut: [
    '/lib64/ld-linux-x86-64.so.2', 'ptrace', 'printf', 'puts', '__libc_start_main', 'GLIBC_2.2.5',
    'SFW{bouj_efch}', '[anti-debug] debugger detected, exiting', 'here is your data: ',
    'GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0'
  ].join('\n'),

  objdumpOut: [
    'challenge:     file format elf64-x86-64', '', 'Disassembly of section .text:', '',
    '0000000000001160 <sub_1160>:',
    '    1160:\tendbr64',
    '    1164:\tpush   %rbp',
    '    1165:\tmov    %rsp,%rbp',
    '    1168:\tmov    0x8(%rdi),%rax          ; char *s',
    '    116c:\tmovzbl (%rax),%eax',
    '    116f:\ttest   %al,%al',
    '    1171:\tje     118f',
    '    ; vòng lặp: sub $0x1, %al  (mỗi ký tự -1)',
    '    118f:\tpop    %rbp',
    '    1190:\tret',
    '',
    '00000000000011a0 <sub_11a0>:',
    '    11a0:\tendbr64',
    '    11a4:\tpush   %rbp',
    '    11a5:\tmov    %rsp,%rbp',
    '    11a8:\tmov    $0x0,%edi               ; PTRACE_TRACEME',
    '    11ad:\tmov    $0x0,%esi',
    '    11b2:\tmov    $0x0,%edx',
    '    11b7:\tmov    $0x0,%ecx',
    '    11bc:\tcall   1090 <ptrace@plt>',
    '    11c1:\tcmp    $0xffffffffffffffff,%rax',
    '    11c5:\tje     11d9                    ; đã bị trace → exit',
    '    11c7:\tmov    $0x0,%eax',
    '    11cc:\tcall   1090 <exit@plt>',
    '',
    '0000000000001200 <main>:',
    '    1200:\tendbr64',
    '    1204:\tpush   %rbp',
    '    1205:\tmov    %rsp,%rbp',
    '    1208:\tcall   11a0 <sub_11a0>         ; ai gọi cái gì? rename để hiểu!',
    '    120d:\tlea    0xdf4(%rip),%rax        # 2004 <SFW{bouj_efch}>',
    '    1214:\tmov    %rax,%rdi',
    '    1217:\tcall   1160 <sub_1160>',
    '    121c:\tmov    %rax,%rdi',
    '    121f:\tcall   1090 <puts@plt>',
    '    1224:\tmov    $0x0,%eax',
    '    1229:\tpop    %rbp',
    '    122a:\tret'
  ].join('\n'),

  run: function (stdin) {
    return 'here is your data: SFW{bouj_efch}\n';
  },

  ltrace: {
    wrong: [
      'ptrace(0, 0, 0, 0)                                = 0',
      'puts("here is your data: SFW{bouj_efch}")          = 34',
      '+++ exited +++',
      '(nhận ra chưa? ptrace(0,...) = PTRACE_TRACEME — anti-debug!)'
    ].join('\n'),
    withInput: function (input) {
      return this.wrong;
    }
  },

  gdb: {
    breakpoints: {
      ptrace: {
        addr: '0x7ffff7c4a110',
        hitNote: 'ptrace (requests=PTRACE_TRACEME, ...) — binary đang TỰ KIỂM TRA xem nó bị trace!',
        args: { RDI: 'PTRACE_TRACEME (0)', RSI: '0x0' },
        registers: { RDI: '0x0', RSI: '0x0', RDX: '0x0', RCX: '0x0', RIP: '0x7ffff7c4a110 <ptrace>', RAX: '0x0', RBP: '0x7fffffffd020', RSP: '0x7fffffffd010', EFLAGS: '0x202 [ IF ]' }
      }
    },
    runOut: 'here is your data: SFW{bouj_efch}\n'
  },

  ghidra: {
    functions: [
      {
        name: 'main', addr: '0x00001200',
        decomp: [
          'undefined8 main(void)',
          '{',
          '  undefined8 ret;',
          '  (*sub_11a0)();                      /* hint: rename nó! */',
          '  ret = (*sub_1160)("SFW{bouj_efch}");',
          '  puts(ret);',
          '  return 0;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 4, asm: '0x00001208' },
          { line: 5, asm: '0x0000120d' },
          { line: 6, asm: '0x0000121f' }
        ],
        instructions: [
          { addr: '0x00001200', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x00001208', bytes: 'e8 93 ff ff ff', mnemonic: 'CALL', operands: '0x000011a0', comment: 'sub_11a0 — rename (N) để biết nó làm gì' },
          { addr: '0x0000120d', bytes: '48 8d 05 f0 0d 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xdf0]', comment: '=> 0x2004 "SFW{bouj_efch}"' },
          { addr: '0x00001217', bytes: 'e8 44 ff ff ff', mnemonic: 'CALL', operands: '0x00001160', comment: 'sub_1160 — transform' },
          { addr: '0x0000121f', bytes: 'e8 6c fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'puts' },
          { addr: '0x00001229', bytes: '5d', mnemonic: 'POP', operands: 'RBP' },
          { addr: '0x0000122a', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      },
      {
        name: 'sub_11a0', addr: '0x000011a0',
        decomp: [
          'void sub_11a0(void)',
          '{',
          '  long lVar1;',
          '  lVar1 = ptrace(PTRACE_TRACEME,0,0,0);',
          '  if (lVar1 == -1) {',
          '    /* có debugger gắn vào → tự huỷ */',
          '    puts("[anti-debug] debugger detected, exiting");',
          '    /* exit(1) */',
          '  }',
          '  return;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 4, asm: '0x000011bc' },
          { line: 5, asm: '0x000011c1' }
        ],
        instructions: [
          { addr: '0x000011a0', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x000011a8', bytes: 'bf 00 00 00 00', mnemonic: 'MOV', operands: 'EDI,0x0', comment: 'PTRACE_TRACEME' },
          { addr: '0x000011bc', bytes: 'e8 cf fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'ptrace' },
          { addr: '0x000011c1', bytes: '48 83 f8 ff', mnemonic: 'CMP', operands: 'RAX,-0x1', comment: 'ret == -1 → đang bị trace' },
          { addr: '0x000011c5', bytes: '74 12', mnemonic: 'JE', operands: '0x000011d9', comment: 'exit' },
          { addr: '0x000011d8', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      },
      {
        name: 'sub_1160', addr: '0x00001160',
        decomp: [
          'undefined8 sub_1160(char *param_1)',
          '{',
          '  char *s;',
          '  byte bVar;',
          '  /* decode: mỗi ký tự -1 (chỉ chữ cái) */',
          '  s = param_1;',
          '  for (char *p = s; *p != \'\\0\'; p = p + 1) {',
          '    bVar = *p;',
          '    if ((bVar < 0x7b) && (0x60 < bVar || (0x40 < bVar && (bVar < 0x5b)))) {',
          '      *p = bVar - 1;',
          '    }',
          '  }',
          '  return (undefined8)s;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 8, asm: '0x0000116c' },
          { line: 11, asm: '0x0000117a' }
        ],
        instructions: [
          { addr: '0x00001160', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x00001168', bytes: '48 8b 47 08', mnemonic: 'MOV', operands: 'RAX,qword ptr [RDI + 0x8]' },
          { addr: '0x0000116c', bytes: '0f b6 00', mnemonic: 'MOVZX', operands: 'EAX,byte ptr [RAX]' },
          { addr: '0x0000116f', bytes: '84 c0', mnemonic: 'TEST', operands: 'AL,AL' },
          { addr: '0x0000117a', bytes: 'fe c8', mnemonic: 'DEC', operands: 'AL', comment: '★解码: mỗi chữ cái -1' },
          { addr: '0x0000118f', bytes: '5d', mnemonic: 'POP', operands: 'RBP' },
          { addr: '0x00001190', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      }
    ],
    strings: [
      { addr: '0x00002004', value: 'SFW{bouj_efch}', xrefs: ['0x0000120d'] },
      { addr: '0x00002013', value: '[anti-debug] debugger detected, exiting', xrefs: [] },
      { addr: '0x0000203b', value: 'here is your data: ', xrefs: [] }
    ],
    xrefs: { '0x00002004': ['0x0000120d'] },
    cfg: {
      main: {
        nodes: [
          { id: 'entry', addr: '0x00001200', label: 'call sub_11a0\\n(ptrace check)', succ: ['decode'] },
          { id: 'decode', addr: '0x0000120d', label: 'sub_1160("SFW{...}")\\nputs', succ: [] }
        ],
        edges: [['entry', 'decode']]
      },
      sub_11a0: {
        nodes: [
          { id: 'pt', addr: '0x000011a0', label: 'ptrace(TRACEME)', succ: ['chk'] },
          { id: 'chk', addr: '0x000011c1', label: 'ret == -1 ?', succ: ['exit_now', 'ok'] },
          { id: 'exit_now', addr: '0x000011c5', label: 'exit (debugger!)', succ: [] },
          { id: 'ok', addr: '0x000011d8', label: 'return', succ: [] }
        ],
        edges: [['pt', 'chk'], ['chk', 'exit_now'], ['chk', 'ok']]
      }
    }
  },

  cSource: [
    '#include <stdio.h>',
    '#include <string.h>',
    '#include <sys/ptrace.h>',
    '#include <unistd.h>',
    '',
    'void check_debugger(void) {',
    '    if (ptrace(PTRACE_TRACEME, 0, 0, 0) == -1) {',
    '        puts("[anti-debug] debugger detected, exiting");',
    '        _exit(1);',
    '    }',
    '}',
    '',
    'char *decode(char *s) {',
    '    for (char *p = s; *p; p++)',
    '        if ((*p >= \'a\' && *p <= \'z\') || (*p >= \'A\' && *p <= \'Z\')) (*p)--;',
    '    return s;',
    '}',
    '',
    'int main(void) {',
    '    check_debugger();',
    '    char data[] = "SFW{bouj_efch}";   /* flag +1 mỗi chữ cái */',
    '    puts(decode(data));',
    '    return 0;',
    '}'
  ].join('\n')
};
