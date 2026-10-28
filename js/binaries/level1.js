/* ============================================================
 * RevQuest — binaries/level1.js
 * Pre-computed data cho binary "challenge" của Level 1.
 * Được tools/build_binaries.py sinh từ challenges/level1.c bằng
 * gcc + Ghidra headless (file/readelf/strings/objdump thật).
 * Mọi output dưới đây khớp format của tool thật.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
window.RevQuest.binaries = window.RevQuest.binaries || {};
window.RevQuest.binaries.level1 = {
  name: 'challenge',
  arch: 'x86-64',
  format: 'elf64-pie',
  size: 16544,

  fileOutput: 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=9c1a8f4e2b7d6a3c5e8f1a2b4c6d8e0f2a4b6c8d, for GNU/Linux 3.2.0, not stripped',

  readelfOut: [
    'ELF Header:',
    '  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 ',
    '  Class:                             ELF64',
    '  Data:                              2\'s complement, little-endian',
    '  Version:                           1 (current)',
    '  OS/ABI:                            UNIX - System V',
    '  ABI Version:                       0',
    '  Type:                              DYN (Position-Independent Executable file)',
    '  Machine:                           Advanced Micro Devices X86-64',
    '  Version:                           0x1',
    '  Entry point address:               0x1090',
    '  Start of program headers:          64 (bytes into file)',
    '  Start of section headers:          13552 (bytes into file)',
    '  Flags:                             0x0',
    '  Size of this header:               64 (bytes)',
    '  Size of program headers:           56 (bytes)',
    '  Number of program headers:         13',
    '  Size of section headers:           64 (bytes)',
    '  Number of section headers:         31',
    '  Section header string table index: 30'
  ].join('\n'),

  stringsOut: [
    '/lib64/ld-linux-x86-64.so.2',
    'puts',
    '__libc_start_main',
    'GLIBC_2.2.5',
    '_ITM_deregisterTMCloneTable',
    '__gmon_start__',
    '_ITM_registerTMCloneTable',
    '__cxa_finalize',
    '__stack_chk_fail',
    'Access granted',
    '=== Secure Access v1.0 ===',
    'Access denied',
    'REV{b1n4ry_n0t_t3xt}',
    'challenge.c',
    '__FRAME_END__',
    '__JCR_LIST__',
    '_DYNAMIC',
    '__TMC_END__',
    'GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0'
  ].join('\n'),

  objdumpOut: [
    'challenge:     file format elf64-x86-64',
    '',
    '',
    'Disassembly of section .text:',
    '',
    '0000000000001090 <puts@plt>:',
    '    1090:\tff 25 6a 2f 00 00\tjmp    *0x2f6a(%rip)        # 4000 <puts@Base>',
    '    1096:\t68 00 00 00 00      \tpush   $0x0',
    '    109b:\te9 e0 ff ff ff      \tjmp    1080 <.plt>',
    '',
    '0000000000001160 <check_password>:',
    '    1160:\tf3 0f 1e fa         \tendbr64',
    '    1164:\t55                  \tpush   %rbp',
    '    1165:\t48 89 e5            \tmov    %rsp,%rbp',
    '    1168:\t48 8d 05 d1 0e 00 00\tlea    0xed1(%rip),%rax        # 2040 <_IO_stdin_used+0x40>',
    '    116f:\t48 89 c7            \tmov    %rax,%rdi',
    '    1172:\te8 19 ff ff ff      \tcall   1090 <puts@plt>',
    '    1177:\t90                  \tnop',
    '    1178:\t5d                  \tpop    %rbp',
    '    1179:\tc3                  \tret',
    '',
    '0000000000001189 <main>:',
    '    1189:\tf3 0f 1e fa         \tendbr64',
    '    118d:\t55                  \tpush   %rbp',
    '    118e:\t48 89 e5            \tmov    %rsp,%rbp',
    '    1191:\t48 83 ec 10         \tsub    $0x10,%rsp',
    '    1195:\t89 7d fc            \tmov    %edi,-0x4(%rbp)',
    '    1198:\t48 89 75 f0         \tmov    %rsi,-0x8(%rbp)',
    '    119c:\t48 8d 05 70 0e 00 00\tlea    0xe70(%rip),%rax        # 2013 <_IO_stdin_used+0x13>',
    '    11a3:\t48 89 c7            \tmov    %rax,%rdi',
    '    11a6:\te8 e5 fe ff ff      \tcall   1090 <puts@plt>',
    '    11ab:\t48 8d 05 7e 0e 00 00\tlea    0xe7e(%rip),%rax        # 2030 <_IO_stdin_used+0x30>',
    '    11b2:\t48 89 c7            \tmov    %rax,%rdi',
    '    11b5:\te8 d6 fe ff ff      \tcall   1090 <puts@plt>',
    '    11ba:\tb8 00 00 00 00      \tmov    $0x0,%eax',
    '    11bf:\tc9                  \tleave  ',
    '    11c0:\tc3                  \tret'
  ].join('\n'),

  execOutput: '=== Secure Access v1.0 ===\nAccess denied\n',

  ghidra: {
    functions: [
      {
        name: 'check_password',
        addr: '0x00001160',
        decomp: [
          'void check_password(void)',
          '{',
          '  puts("REV{b1n4ry_n0t_t3xt}");',
          '  return;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 1, asm: null }, { line: 2, asm: null },
          { line: 3, asm: '0x00001168' }, { line: 4, asm: null }, { line: 5, asm: null }
        ],
        instructions: [
          { addr: '0x00001160', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x00001164', bytes: '55', mnemonic: 'PUSH', operands: 'RBP' },
          { addr: '0x00001165', bytes: '48 89 e5', mnemonic: 'MOV', operands: 'RBP,RSP' },
          { addr: '0x00001168', bytes: '48 8d 05 d1 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xed1]', comment: '=> 0x2040 "REV{b1n4ry_n0t_t3xt}"' },
          { addr: '0x0000116f', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
          { addr: '0x00001172', bytes: 'e8 19 ff ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'puts' },
          { addr: '0x00001177', bytes: '90', mnemonic: 'NOP', operands: '' },
          { addr: '0x00001178', bytes: '5d', mnemonic: 'POP', operands: 'RBP' },
          { addr: '0x00001179', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      },
      {
        name: 'main',
        addr: '0x00001189',
        decomp: [
          'undefined8 main(long param_1, long param_2)',
          '{',
          '  puts("=== Secure Access v1.0 ===");',
          '  puts("Access denied");',
          '  return 0;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 1, asm: null }, { line: 2, asm: null },
          { line: 3, asm: '0x0000119c' }, { line: 4, asm: '0x000011ab' },
          { line: 5, asm: '0x000011ba' }, { line: 6, asm: null }
        ],
        instructions: [
          { addr: '0x00001189', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x0000118d', bytes: '55', mnemonic: 'PUSH', operands: 'RBP' },
          { addr: '0x0000118e', bytes: '48 89 e5', mnemonic: 'MOV', operands: 'RBP,RSP' },
          { addr: '0x00001191', bytes: '48 83 ec 10', mnemonic: 'SUB', operands: 'RSP,0x10' },
          { addr: '0x00001195', bytes: '89 7d fc', mnemonic: 'MOV', operands: 'dword ptr [RBP + -0x4],EDI' },
          { addr: '0x00001198', bytes: '48 89 75 f0', mnemonic: 'MOV', operands: 'qword ptr [RBP + -0x8],RSI' },
          { addr: '0x0000119c', bytes: '48 8d 05 70 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe70]', comment: '=> 0x2013 "=== Secure Access v1.0 ==="' },
          { addr: '0x000011a3', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
          { addr: '0x000011a6', bytes: 'e8 e5 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'puts' },
          { addr: '0x000011ab', bytes: '48 8d 05 7e 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe7e]', comment: '=> 0x2030 "Access denied"' },
          { addr: '0x000011b2', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
          { addr: '0x000011b5', bytes: 'e8 d6 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'puts' },
          { addr: '0x000011ba', bytes: 'b8 00 00 00 00', mnemonic: 'MOV', operands: 'EAX,0x0' },
          { addr: '0x000011bf', bytes: 'c9', mnemonic: 'LEAVE', operands: '' },
          { addr: '0x000011c0', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      }
    ],

    strings: [
      { addr: '0x00002004', value: 'Access granted', xrefs: [] },
      { addr: '0x00002013', value: '=== Secure Access v1.0 ===', xrefs: ['0x0000119c'] },
      { addr: '0x00002030', value: 'Access denied', xrefs: ['0x000011ab'] },
      { addr: '0x00002040', value: 'REV{b1n4ry_n0t_t3xt}', xrefs: ['0x00001168'], flag: true }
    ],

    xrefs: {
      '0x00002013': ['0x0000119c'],
      '0x00002030': ['0x000011ab'],
      '0x00002040': ['0x00001168']
    },

    // CFG sẽ dùng từ Level 5 — bundle sẵn cho đủ
    cfg: {
      main: {
        nodes: [
          { id: 'entry', addr: '0x00001189', label: 'entry', succ: ['print_banner'] },
          { id: 'print_banner', addr: '0x0000119c', label: 'puts(banner)\\nputs(denied)', succ: ['exit'] },
          { id: 'exit', addr: '0x000011ba', label: 'return 0', succ: [] }
        ],
        edges: [['entry', 'print_banner'], ['print_banner', 'exit']]
      },
      check_password: {
        nodes: [
          { id: 'entry', addr: '0x00001160', label: 'puts(FLAG)', succ: ['exit'] },
          { id: 'exit', addr: '0x00001178', label: 'return', succ: [] }
        ],
        edges: [['entry', 'exit']]
      }
    }
  },

  /* Source C để người chơi tải về xem (và build script dùng để compile lại) */
  cSource: [
    '#include <stdio.h>',
    '',
    'const char *PASSWORD = "REV{b1n4ry_n0t_t3xt}";',
    '',
    '/* Hàm này không ai gọi — nhưng chuỗi vẫn nằm trong binary! */',
    'void check_password(void) {',
    '    puts(PASSWORD);',
    '}',
    '',
    'int main(void) {',
    '    puts("=== Secure Access v1.0 ===");',
    '    puts("Access denied");',
    '    return 0;',
    '}'
  ].join('\n'),

  /* elfBase64: build_binaries.py sẽ điền sau khi compile thật.
     Khi chưa có → nút Download trả về source C. */
  elfBase64: null
};
