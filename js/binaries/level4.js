/* ============================================================
 * RevQuest — binaries/level4.js — "Keygen Me"
 * key = (sum(charcode của username) * 1337) % 100000
 * Đa đường: ltrace (dễ) · gdb break strcmp (vừa) · decompiler + tự tính (khó).
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
window.RevQuest.binaries = window.RevQuest.binaries || {};

function rq4_keygen(username) {
  let s = 0;
  for (const ch of String(username)) s += ch.charCodeAt(0);
  return (s * 1337) % 100000;
}

window.RevQuest.binaries.level4 = {
  name: 'challenge', arch: 'x86-64', format: 'elf64-pie', size: 17680,
  fileOutput: 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=c5e7a2f9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1, for GNU/Linux 3.2.0, not stripped',

  readelfOut: [
    'ELF Header:', '  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 ',
    '  Class:                             ELF64', "  Data:                              2's complement, little-endian",
    '  Type:                              DYN (Position-Independent Executable file)',
    '  Machine:                           Advanced Micro Devices X86-64',
    '  Entry point address:               0x1090', '  Number of section headers:         31'
  ].join('\n'),

  stringsOut: [
    '/lib64/ld-linux-x86-64.so.2', 'printf', 'scanf', 'strcmp', 'puts', 'snprintf',
    '__libc_start_main', 'GLIBC_2.2.5', 'username: ', 'key: ', '%31s', '%u',
    'Access granted!', 'Flag: ', 'Access denied', 'GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0'
  ].join('\n'),

  objdumpOut: [
    'challenge:     file format elf64-x86-64', '', 'Disassembly of section .text:', '',
    '0000000000001189 <main>:',
    '    1189:\tendbr64',
    '    118d:\tpush   %rbp',
    '    118e:\tmov    %rsp,%rbp',
    '    1191:\tsub    $0x50,%rsp',
    '    1195:\tlea    0xe64(%rip),%rax        # 2000 <username: >',
    '    119c:\tmov    %rax,%rdi',
    '    119f:\tmov    $0x0,%eax',
    '    11a4:\tcall   1090 <printf@plt>',
    '    ; scanf username vào [rbp-0x50]',
    '    ; vòng lặp: add byte của username → eax',
    '    ; imul eax, eax, 0x539      ; *1337',
    '    ; imul eax, eax, 0x668a26b  ; %100000 qua phép nhân ma thuật',
    '    ; snprintf [rbp-0x30], 0x20, "%u", edx',
    '    ; scanf key vào [rbp-0x70]',
    '    11f8:\tlea    -0x70(%rbp),%rax',
    '    11fc:\tmov    %rax,%rdi',
    '    11ff:\tlea    -0x30(%rbp),%rsi',
    '    1203:\tcall   1090 <strcmp@plt>',
    '    1208:\ttest   %eax,%eax',
    '    120a:\tjne    1220 <main+0x97>',
    '    ; nhánh granted: printf "Access granted!\nFlag: REV{k3yg3n_m4g1c}"',
    '    1240:\tmov    $0x0,%eax',
    '    1245:\tleave',
    '    1246:\tret'
  ].join('\n'),

  /** chạy thử: stdin "username key" */
  run: function (stdin) {
    const parts = String(stdin || '').trim().split(/\s+/);
    if (!parts[0]) return 'username: key: \n';
    if (parts.length < 2) return 'username: key: \n';
    const name = parts[0], key = parts[1];
    const want = String(rq4_keygen(name));
    return 'username: key: \n' + (key === want
      ? 'Access granted!\nFlag: REV{k3yg3n_m4g1c}\n'
      : 'Access denied\n');
  },

  ltrace: {
    wrong: 'printf("username: ") = 10\nscanf("%31s", ...) = 1\nprintf("key: ") = 5\nscanf("%31s", ...) = 1\nstrcmp("00000", "96577") = -9\nputs("Access denied") = 14\n+++ exited +++',
    withInput: function (input) {
      const parts = String(input).trim().split(/\s+/);
      const name = parts[0] || '';
      const tried = parts[1] || '';
      const want = String(rq4_keygen(name));
      return [
        'printf("username: ") = 10',
        'scanf("%31s", ...) = 1',
        'printf("key: ") = 5',
        'scanf("%31s", ...) = 1',
        'strcmp("' + tried + '", "' + want + '") = ' + (tried === want ? '0' : (tried < want ? -9 : 9)),
        tried === want ? 'printf("Access granted!\\nFlag: REV{k3yg3n_m4g1c}")' : 'puts("Access denied") = 14',
        '+++ exited +++'
      ].join('\n');
    }
  },

  gdb: {
    breakpoints: {
      strcmp: {
        addr: '0x7ffff7c812e0',
        hitNote: '__strcmp_avx2 () at ../sysdeps/x86_64/multiarch/strcmp-avx2.S',
        args: { RDI: '"<key bạn nhập>"', RSI: '"<key đúng>"' },
        /** tham số động: rsi = key đúng của username trong lệnh run */
        argsFn: function (input) {
          const parts = String(input).trim().split(/\s+/);
          const name = parts[0] || '', tried = parts[1] || '';
          return { RDI: '"' + tried + '"', RSI: '"' + rq4_keygen(name) + '"' };
        },
        registers: { RDI: '0x7ffd1234ab40', RSI: '0x7ffd1234ab00', RIP: '0x7ffff7c812e0 <__strcmp_avx2>', RAX: '0x0', RBP: '0x7fffffffd020', RSP: '0x7fffffffd010', EFLAGS: '0x202 [ IF ]' }
      }
    },
    runOut: 'username: key: \nAccess denied\n'
  },

  ghidra: {
    functions: [
      {
        name: 'main', addr: '0x00001189',
        decomp: [
          'undefined8 main(void)',
          '{',
          '  int total;',
          '  char local_70 [32];',
          '  char local_50 [32];',
          '  char local_30 [32];',
          '  printf("username: ");',
          '  __isoc99_scanf(&DAT_00002010,local_70);',
          '  total = 0;',
          '  for (int i = 0; local_70[i] != \'\\0\'; i = i + 1) {',
          '    total = total + local_70[i];',
          '  }',
          '  snprintf(local_50, 0x20, "%u", (total * 0x539) % 0x186a0);',
          '  printf("key: ");',
          '  __isoc99_scanf(&DAT_00002010,local_30);',
          '  if (strcmp(local_30,local_50) == 0) {',
          '    printf("Access granted!\\nFlag: %s","REV{k3yg3n_m4g1c}");',
          '  }',
          '  else {',
          '    puts("Access denied");',
          '  }',
          '  return 0;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 8, asm: '0x00001195' }, { line: 9, asm: '0x000011bf' },
          { line: 11, asm: '0x000011c9' }, { line: 13, asm: '0x000011d8' },
          { line: 15, asm: '0x000011ea' }, { line: 18, asm: '0x00001203' },
          { line: 20, asm: '0x00001212' }, { line: 24, asm: '0x00001230' }
        ],
        instructions: [
          { addr: '0x00001189', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x0000118d', bytes: '55', mnemonic: 'PUSH', operands: 'RBP' },
          { addr: '0x0000118e', bytes: '48 89 e5', mnemonic: 'MOV', operands: 'RBP,RSP' },
          { addr: '0x00001191', bytes: '48 83 ec 50', mnemonic: 'SUB', operands: 'RSP,0x50' },
          { addr: '0x00001195', bytes: '48 8d 05 64 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe64]', comment: '=> 0x2000 "username: "' },
          { addr: '0x000011bf', bytes: 'e8 cc fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'scanf username' },
          { addr: '0x000011c9', bytes: 'c7 45 b8 00 00 00 00', mnemonic: 'MOV', operands: 'dword ptr [RBP + -0x48],0x0', comment: 'total = 0' },
          { addr: '0x000011d8', bytes: '03 45 c0', mnemonic: 'ADD', operands: 'EAX,dword ptr [RBP + -0x40]', comment: 'total += username[i]' },
          { addr: '0x000011e4', bytes: '69 c0 39 05 00 00', mnemonic: 'IMUL', operands: 'EAX,EAX,0x539', comment: '* 1337' },
          { addr: '0x000011ea', bytes: '31 d2', mnemonic: 'XOR', operands: 'EDX,EDX', comment: 'chuẩn bị modulo' },
          { addr: '0x00001203', bytes: 'e8 f8 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'strcmp' },
          { addr: '0x00001208', bytes: '85 c0', mnemonic: 'TEST', operands: 'EAX,EAX' },
          { addr: '0x0000120a', bytes: '75 16', mnemonic: 'JNE', operands: '0x00001222', comment: 'key sai → denied' },
          { addr: '0x00001230', bytes: 'b8 00 00 00 00', mnemonic: 'MOV', operands: 'EAX,0x0' },
          { addr: '0x00001235', bytes: 'c9', mnemonic: 'LEAVE', operands: '' },
          { addr: '0x00001236', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      }
    ],
    strings: [
      { addr: '0x00002000', value: 'username: ', xrefs: ['0x00001195'] },
      { addr: '0x0000200b', value: 'key: ', xrefs: [] },
      { addr: '0x00002030', value: 'Access granted!', xrefs: [] },
      { addr: '0x00002040', value: 'Access denied', xrefs: [] }
    ],
    xrefs: {
      '0x00002000': ['0x00001195']
    },
    cfg: {
      main: {
        nodes: [
          { id: 'entry', addr: '0x00001189', label: 'scanf username', succ: ['sum'] },
          { id: 'sum', addr: '0x000011c9', label: 'loop: total += c\\nkey = total*1337%100000', succ: ['cmp'] },
          { id: 'cmp', addr: '0x00001203', label: 'strcmp(key,expected)', succ: ['granted', 'denied'] },
          { id: 'granted', addr: '0x00001212', label: 'printf flag', succ: ['exit'] },
          { id: 'denied', addr: '0x00001222', label: 'puts denied', succ: ['exit'] },
          { id: 'exit', addr: '0x00001230', label: 'return 0', succ: [] }
        ],
        edges: [['entry', 'sum'], ['sum', 'cmp'], ['cmp', 'granted'], ['cmp', 'denied'], ['granted', 'exit'], ['denied', 'exit']]
      }
    }
  },

  cSource: [
    '#include <stdio.h>',
    '#include <string.h>',
    '',
    'int main(void) {',
    '    char user[32], key[32], expected[32];',
    '    printf("username: ");',
    '    scanf("%31s", user);',
    '    unsigned total = 0;',
    '    for (int i = 0; user[i]; i++) total += (unsigned char)user[i];',
    '    snprintf(expected, sizeof(expected), "%u", (total * 1337u) % 100000u);',
    '    printf("key: ");',
    '    scanf("%31s", key);',
    '    if (strcmp(key, expected) == 0)',
    '        printf("Access granted!\\nFlag: %s", "REV{k3yg3n_m4g1c}");',
    '    else puts("Access denied");',
    '    return 0;',
    '}'
  ].join('\n')
};
