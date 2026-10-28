/* ============================================================
 * RevQuest — binaries/level7.js — "Patcher"
 * password sai → denied. Patch JNE (75) → JE (74) tại 0x11ff → logic
 * đảo, password SAI được chấp nhận → in flag.
 * Đa đường: hex patch (chủ đạo) · strings tìm password rồi chạy · decomp.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
window.RevQuest.binaries = window.RevQuest.binaries || {};

const RQ7_PASS = 's3cr3t!x';

window.RevQuest.binaries.level7 = {
  name: 'challenge', arch: 'x86-64', format: 'elf64-pie', size: 17240,
  fileOutput: 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9, for GNU/Linux 3.2.0, not stripped',

  readelfOut: [
    'ELF Header:', '  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 ',
    '  Class:                             ELF64', "  Data:                              2's complement, little-endian",
    '  Type:                              DYN (Position-Independent Executable file)',
    '  Machine:                           Advanced Micro Devices X86-64',
    '  Entry point address:               0x1090', '  Number of section headers:         31'
  ].join('\n'),

  stringsOut: [
    '/lib64/ld-linux-x86-64.so.2', 'scanf', 'strcmp', 'puts', '__libc_start_main', 'GLIBC_2.2.5',
    'password: ', '%31s', 'Access granted', 'Flag: REV{p4tch_th3_byt3}', 'Access denied',
    'GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0'
  ].join('\n'),

  objdumpOut: [
    'challenge:     file format elf64-x86-64', '', 'Disassembly of section .text:', '',
    '0000000000001189 <main>:',
    '    1189:\tendbr64',
    '    118d:\tpush   %rbp',
    '    118e:\tmov    %rsp,%rbp',
    '    1191:\tsub    $0x40,%rsp',
    '    ; scanf password → [rbp-0x40]',
    '    ; strcmp với "s3cr3t!x" (lắp runtime)',
    '    11f1:\tlea    -0x40(%rbp),%rax',
    '    11f5:\tmov    %rax,%rdi',
    '    11f8:\tcall   1090 <strcmp@plt>',
    '    11fd:\ttest   %eax,%eax',
    '    11ff:\tjne    1213 <main+0x8a>        ; ★ opcode 75 tại 0x11ff — patch 75→74',
    '    1201:\tlea    0x2e(%rip),%rax        # denied',
    '    1208:\tmov    %rax,%rdi',
    '    120b:\tcall   1090 <puts@plt>',
    '    1210:\tjmp    1223',
    '    1213:\tlea    0x1e(%rip),%rax        # granted + flag',
    '    121a:\tmov    %rax,%rdi',
    '    121d:\tcall   1090 <puts@plt>',
    '    1222:\tnop',
    '    1223:\tmov    $0x0,%eax',
    '    1228:\tleave',
    '    1229:\tret'
  ].join('\n'),

  hexDump: {
    base: 0x11f1,
    bytes: [
      0x48, 0x8d, 0x45, 0xc0, 0x48, 0x89, 0xc7, 0xe8, 0x93, 0xfe, 0xff, 0xff, 0x85, 0xc0, 0x75, 0x12,
      0x48, 0x8d, 0x05, 0x2e, 0x0e, 0x00, 0x00, 0x48, 0x89, 0xc7, 0xe8, 0x82, 0xfe, 0xff, 0xff, 0xeb,
      0x10, 0x48, 0x8d, 0x05, 0x1e, 0x0e, 0x00, 0x00, 0x48, 0x89, 0xc7, 0xe8, 0x72, 0xfe, 0xff, 0xff,
      0x90, 0xb8, 0x00, 0x00, 0x00, 0x00, 0xc9, 0xc3
    ]
  },

  run: function (stdin, patches) {
    const input = String(stdin || '').trim();
    let out = 'password: \n';
    // patch opcode JNE tại 0x11ff: 75 → 74 (JNE → JE) → logic ĐẢO
    const jnePatched = patches['0x11ff'] === '74';
    const correct = input === RQ7_PASS;
    const granted = jnePatched ? !correct : correct;
    if (!input) return out;
    out += (granted ? 'Access granted\nFlag: REV{p4tch_th3_byt3}\n' : 'Access denied\n');
    return out;
  },

  ltrace: {
    wrong: 'printf("password: ") = 10\nscanf("%31s", ...) = 1\nstrcmp("wrong", "s3cr3t!x") = 4\nputs("Access denied") = 14\n+++ exited +++',
    withInput: function (input) {
      const tried = String(input).trim();
      const ok = tried === RQ7_PASS;
      return [
        'printf("password: ") = 10',
        'scanf("%31s", ...) = 1',
        'strcmp("' + tried.slice(0, 31) + '", "s3cr3t!x") = ' + (ok ? '0' : '4'),
        ok ? 'puts("Access granted")' : 'puts("Access denied") = 14',
        ok ? 'puts("Flag: REV{p4tch_th3_byt3}")' : '+++ exited +++'
      ].join('\n');
    }
  },

  gdb: {
    breakpoints: {
      strcmp: {
        addr: '0x7ffff7c812e0',
        hitNote: '__strcmp_avx2 ()',
        args: { RDI: '"<password bạn nhập>"', RSI: '"s3cr3t!x"' },
        registers: { RDI: '0x7ffd1234ab00', RSI: '0x7ffd1234ab20', RIP: '0x7ffff7c812e0 <__strcmp_avx2>', RAX: '0x0', RBP: '0x7fffffffd020', RSP: '0x7fffffffd010', EFLAGS: '0x202 [ IF ]' }
      }
    },
    runOut: 'password: \nAccess denied\n'
  },

  ghidra: {
    functions: [
      {
        name: 'main', addr: '0x00001189',
        decomp: [
          'undefined8 main(void)',
          '{',
          '  char local_40 [32];',
          '  printf("password: ");',
          '  __isoc99_scanf(&DAT_00002010,local_40);',
          '  if (strcmp(local_40,"s3cr3t!x") != 0) {   /* JNE — opcode 75 tại 0x11ff */',
          '    puts("Access denied");',
          '  }',
          '  else {',
          '    puts("Access granted");',
          '    puts("Flag: REV{p4tch_th3_byt3}");',
          '  }',
          '  return 0;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 5, asm: '0x000011bf' },
          { line: 6, asm: '0x000011ff' },
          { line: 7, asm: '0x0000120b' },
          { line: 10, asm: '0x0000121d' }
        ],
        instructions: [
          { addr: '0x00001189', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x0000118d', bytes: '55', mnemonic: 'PUSH', operands: 'RBP' },
          { addr: '0x0000118e', bytes: '48 89 e5', mnemonic: 'MOV', operands: 'RBP,RSP' },
          { addr: '0x00001191', bytes: '48 83 ec 40', mnemonic: 'SUB', operands: 'RSP,0x40' },
          { addr: '0x000011f1', bytes: '48 8d 45 c0', mnemonic: 'LEA', operands: 'RAX,[RBP + -0x40]' },
          { addr: '0x000011f5', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
          { addr: '0x000011f8', bytes: 'e8 93 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'strcmp' },
          { addr: '0x000011fd', bytes: '85 c0', mnemonic: 'TEST', operands: 'EAX,EAX' },
          { addr: '0x000011ff', bytes: '75 12', mnemonic: 'JNE', operands: '0x00001213', comment: '★ 0x11ff = 75 (JNE). Patch thành 74 (JE) → logic ĐẢO!' },
          { addr: '0x00001201', bytes: '48 8d 05 2e 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe2e]', comment: '=> 0x2036 "Access denied"' },
          { addr: '0x00001208', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
          { addr: '0x0000120b', bytes: 'e8 82 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'puts denied' },
          { addr: '0x00001210', bytes: 'eb 10', mnemonic: 'JMP', operands: '0x00001223' },
          { addr: '0x00001213', bytes: '48 8d 05 1e 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe1e]', comment: '=> 0x2040 "Access granted\\nFlag: REV{p4tch_th3_byt3}"' },
          { addr: '0x0000121a', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
          { addr: '0x0000121d', bytes: 'e8 72 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'puts granted' },
          { addr: '0x00001222', bytes: '90', mnemonic: 'NOP', operands: '' },
          { addr: '0x00001223', bytes: 'b8 00 00 00 00', mnemonic: 'MOV', operands: 'EAX,0x0' },
          { addr: '0x00001228', bytes: 'c9', mnemonic: 'LEAVE', operands: '' },
          { addr: '0x00001229', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      }
    ],
    strings: [
      { addr: '0x00002010', value: '%31s', xrefs: [] },
      { addr: '0x00002015', value: 'password: ', xrefs: [] },
      { addr: '0x00002036', value: 'Access denied', xrefs: ['0x00001201'] },
      { addr: '0x00002044', value: 'Flag: REV{p4tch_th3_byt3}', xrefs: ['0x00001213'] }
    ],
    xrefs: {
      '0x00002036': ['0x00001201'],
      '0x00002044': ['0x00001213']
    },
    cfg: {
      main: {
        nodes: [
          { id: 'entry', addr: '0x00001189', label: 'scanf password', succ: ['cmp'] },
          { id: 'cmp', addr: '0x000011fd', label: 'strcmp\\ntest eax', succ: ['denied', 'granted'] },
          { id: 'denied', addr: '0x00001201', label: 'puts denied', succ: ['exit'] },
          { id: 'granted', addr: '0x00001213', label: 'puts granted + FLAG', succ: ['exit'] },
          { id: 'exit', addr: '0x00001223', label: 'return 0', succ: [] }
        ],
        edges: [['entry', 'cmp'], ['cmp', 'denied'], ['cmp', 'granted'], ['denied', 'exit'], ['granted', 'exit']]
      }
    }
  },

  cSource: [
    '#include <stdio.h>',
    '#include <string.h>',
    '',
    'int main(void) {',
    '    char buf[32];',
    '    printf("password: ");',
    '    scanf("%31s", buf);',
    '    if (strcmp(buf, "s3cr3t!x") != 0) {   /* jne 0x1213 — opcode 75 @ 0x11ff */',
    '        puts("Access denied");',
    '    } else {',
    '        puts("Access granted");',
    '        puts("Flag: REV{p4tch_th3_byt3}");',
    '    }',
    '    return 0;',
    '}'
  ].join('\n')
};
