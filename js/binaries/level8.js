/* ============================================================
 * RevQuest — binaries/level8.js — "Automation"
 * data = flag XOR 0x1F, in ra màn hình. Brute-force 256 key bằng
 * script console. Đa đường: script (automator) · decomp đọc key rồi
 * decode tay bằng converter · hex editor xem data.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
window.RevQuest.binaries = window.RevQuest.binaries || {};

const RQ8_DATA = 'MZId~jk/r+k,@r,b';          // "REV{aut0m4t3_m3}" ^ 0x1F
const RQ8_FLAG = 'REV{aut0m4t3_m3}';

window.RevQuest.binaries.level8 = {
  name: 'challenge', arch: 'x86-64', format: 'elf64-pie', size: 17800,
  fileOutput: 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=a3c5e7f9b1d3a5c7e9f1b3d5a7c9e1f3b5d7a9c1, for GNU/Linux 3.2.0, not stripped',

  readelfOut: [
    'ELF Header:', '  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 ',
    '  Class:                             ELF64', "  Data:                              2's complement, little-endian",
    '  Type:                              DYN (Position-Independent Executable file)',
    '  Machine:                           Advanced Micro Devices X86-64',
    '  Entry point address:               0x1090', '  Number of section headers:         31'
  ].join('\n'),

  stringsOut: [
    '/lib64/ld-linux-x86-64.so.2', 'printf', 'puts', '__libc_start_main', 'GLIBC_2.2.5',
    'data: ', 'MZId~jk/r+k,@r,b', 'GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0'
  ].join('\n'),

  objdumpOut: [
    'challenge:     file format elf64-x86-64', '', 'Disassembly of section .text:', '',
    '0000000000001160 <decode>:',
    '    1160:\tendbr64',
    '    1164:\tzf     ; (giả lập — hàm chưa được gọi trong main)',
    '    1190:\tret',
    '',
    '0000000000001200 <main>:',
    '    1200:\tendbr64',
    '    1204:\tpush   %rbp',
    '    1205:\tmov    %rsp,%rbp',
    '    1208:\tlea    0xdf0(%rip),%rax        # 2004 <data>',
    '    120f:\tmov    %rax,%rsi',
    '    1212:\tlea    0xdf8(%rip),%rax        # 2010 <"data: ">',
    '    1219:\tmov    %rax,%rdi',
    '    121c:\tmov    $0x0,%eax',
    '    1221:\tcall   1090 <printf@plt>',
    '    1226:\tmov    $0x0,%eax',
    '    122b:\tpop    %rbp',
    '    122c:\tret'
  ].join('\n'),

  /** .rodata bytes — data encoded nằm trong hex editor */
  hexDump: {
    base: 0x2004,
    bytes: (function () {
      const arr = [];
      for (const ch of RQ8_DATA) arr.push(ch.charCodeAt(0));
      arr.push(0x00);
      while (arr.length < 48) arr.push(0x00);
      return arr;
    })()
  },

  run: function () {
    return 'data: MZId~jk/r+k,@r,b\n';
  },

  /** xor key brute-force helper cho script console */
  xorDecode: function (data, key) {
    let s = '';
    for (const ch of String(data)) s += String.fromCharCode(ch.charCodeAt(0) ^ key);
    return s;
  },

  ltrace: {
    wrong: 'printf("data: ") = 6\nputs("MZId~jk/r+k,@r,b") = 18\n+++ exited +++\n(binary không đọc input — dynamic analysis hết cờ, phải đọc code)',
    withInput: function () { return this.wrong; }
  },

  gdb: {
    breakpoints: {
      main: {
        addr: '0x00001208',
        hitNote: 'main () at challenge.c',
        args: { RDI: '0x1', RSI: '0x7fffffffdde8' },
        registers: { RDI: '0x1', RSI: '0x7fffffffdde8', RIP: '0x0000555555555208 <main>', RAX: '0x0', RBP: '0x7fffffffd020', RSP: '0x7fffffffd010', EFLAGS: '0x202 [ IF ]' }
      }
    },
    runOut: 'data: MZId~jk/r+k,@r,b\n'
  },

  ghidra: {
    functions: [
      {
        name: 'decode', addr: '0x00001160',
        decomp: [
          'void decode(char *data, byte key)',
          '{',
          '  /* XOR từng byte với key — main KHÔNG gọi hàm này,',
          '     key nằm trong register DL nhưng không ai set! */',
          '  for (int i = 0; data[i] != \'\\0\'; i = i + 1) {',
          '    data[i] = data[i] ^ key;',
          '  }',
          '  return;',
          '}'
        ].join('\n'),
        cMap: [{ line: 5, asm: '0x00001174' }, { line: 6, asm: '0x00001178' }],
        instructions: [
          { addr: '0x00001160', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x00001174', bytes: '30 d0', mnemonic: 'XOR', operands: 'AL,DL', comment: 'data[i] ^= key (DL) — key không xác định!' },
          { addr: '0x00001190', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      },
      {
        name: 'main', addr: '0x00001200',
        decomp: [
          'undefined8 main(void)',
          '{',
          '  printf("data: %s","MZId~jk/r+k,@r,b");',
          '  /* decode() tồn tại nhưng KHÔNG được gọi.',
          '     key là 1 byte 0x00–0xFF → brute force được. */',
          '  return 0;',
          '}'
        ].join('\n'),
        cMap: [{ line: 3, asm: '0x00001221' }, { line: 6, asm: '0x00001226' }],
        instructions: [
          { addr: '0x00001200', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x00001208', bytes: '48 8d 05 f5 0d 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xdf5]', comment: '=> 0x2004 "MZId~jk/r+k,@r,b"' },
          { addr: '0x00001221', bytes: 'e8 6a fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'printf' },
          { addr: '0x00001226', bytes: 'b8 00 00 00 00', mnemonic: 'MOV', operands: 'EAX,0x0' },
          { addr: '0x0000122b', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      }
    ],
    strings: [
      { addr: '0x00002004', value: 'MZId~jk/r+k,@r,b', xrefs: ['0x00001208'] },
      { addr: '0x00002015', value: 'data: ', xrefs: [] }
    ],
    xrefs: { '0x00002004': ['0x00001208'] },
    cfg: {
      main: {
        nodes: [
          { id: 'entry', addr: '0x00001200', label: 'printf("data: %s")', succ: ['exit'] },
          { id: 'exit', addr: '0x00001226', label: 'return 0', succ: [] }
        ],
        edges: [['entry', 'exit']]
      },
      decode: {
        nodes: [
          { id: 'loop', addr: '0x00001160', label: 'data[i] ^= key', succ: ['exit'] },
          { id: 'exit', addr: '0x00001190', label: 'return', succ: [] }
        ],
        edges: [['loop', 'exit']]
      }
    }
  },

  cSource: [
    '#include <stdio.h>',
    '',
    'const char *DATA = "MZId~jk/r+k,@r,b";   /* flag XOR một byte bí mật */',
    '',
    'void decode(char *data, unsigned char key) {',
    '    for (int i = 0; data[i]; i++) data[i] ^= key;',
    '}',
    '',
    'int main(void) {',
    '    printf("data: %s", DATA);',
    '    /* ai đó quên gọi decode... và quên cả key */',
    '    return 0;',
    '}'
  ].join('\n')
};
