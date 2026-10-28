/* ============================================================
 * RevQuest — binaries/level5.js — "Graph View"
 * 3 cổng tuần tự: sai một là deny. Đọc CFG để biết thứ tự.
 * Path: graph · decompiler · ltrace.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
window.RevQuest.binaries = window.RevQuest.binaries || {};

const RQ5_GATE1 = 'alpha', RQ5_GATE2 = 'bravo2', RQ5_GATE3 = 'charlie';

window.RevQuest.binaries.level5 = {
  name: 'challenge', arch: 'x86-64', format: 'elf64-pie', size: 18100,
  fileOutput: 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=d7f9b2e4a6c8d0f2b4a6c8e0d2f4a6b8c0d2e4f6, for GNU/Linux 3.2.0, not stripped',

  readelfOut: [
    'ELF Header:', '  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 ',
    '  Class:                             ELF64', "  Data:                              2's complement, little-endian",
    '  Type:                              DYN (Position-Independent Executable file)',
    '  Machine:                           Advanced Micro Devices X86-64',
    '  Entry point address:               0x1090', '  Number of section headers:         31'
  ].join('\n'),

  stringsOut: [
    '/lib64/ld-linux-x86-64.so.2', 'printf', 'scanf', 'strcmp', 'puts', '__libc_start_main',
    'GLIBC_2.2.5', 'Gate 1: ', 'Gate 2: ', 'Gate 3: ', '%31s',
    'Access granted', 'Wrong sequence', 'Access denied', 'GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0'
  ].join('\n'),

  objdumpOut: [
    'challenge:     file format elf64-x86-64', '', 'Disassembly of section .text:', '',
    '0000000000001189 <main>:',
    '    1189:\tendbr64',
    '    118d:\tpush   %rbp',
    '    118e:\tmov    %rsp,%rbp',
    '    1191:\tsub    $0x70,%rsp',
    '    ; Gate 1: scanf → strcmp với chuỗi lắp runtime ("alpha")',
    '    11d0:\ttest   %eax,%eax',
    '    11d2:\tjne    1260 <main+0xd7>       ; fail ngay → denied',
    '    ; Gate 2: scanf → strcmp ("bravo2")',
    '    121a:\ttest   %eax,%eax',
    '    121c:\tjne    1260 <main+0xd7>',
    '    ; Gate 3: scanf → strcmp ("charlie")',
    '    1264:\ttest   %eax,%eax',
    '    1266:\tjne    127a <main+0xf1>',
    '    ; cả 3 đúng → puts("Access granted") + in flag lắp runtime',
    '    127a:\tlea    0xe1f(%rip),%rax        # denied',
    '    1281:\tmov    %rax,%rdi',
    '    1284:\tcall   1090 <puts@plt>',
    '    1289:\tmov    $0x0,%eax',
    '    128e:\tleave',
    '    128f:\tret'
  ].join('\n'),

  run: function (stdin) {
    const lines = String(stdin || '').trim().split(/\s+/).filter(function (x) { return x; });
    const gates = [RQ5_GATE1, RQ5_GATE2, RQ5_GATE3];
    let out = '';
    for (let i = 0; i < 3; i++) out += 'Gate ' + (i + 1) + ': ';
    if (lines.length < 3) return out + '\n';
    for (let i = 0; i < 3; i++) {
      if (lines[i] !== gates[i]) {
        return out + '\nWrong sequence (Gate ' + (i + 1) + ')\n';
      }
    }
    return out + '\nAccess granted\nFlag: REV{f0ll0w_th3_p4th}\n';
  },

  ltrace: {
    wrong: [
      'printf("Gate 1: ") = 8', 'scanf("%31s", ...) = 1',
      'strcmp("wrong", "alpha") = -2', 'puts("Wrong sequence") = 15',
      '+++ exited +++'
    ].join('\n'),
    withInput: function (input) {
      const lines = String(input).trim().split(/\s+/);
      const gates = [RQ5_GATE1, RQ5_GATE2, RQ5_GATE3];
      const out = [];
      for (let i = 0; i < 3; i++) {
        out.push('printf("Gate ' + (i + 1) + ': ") = 8');
        out.push('scanf("%31s", ...) = 1');
        const tried = lines[i] || '';
        out.push('strcmp("' + tried + '", "' + gates[i] + '") = ' + (tried === gates[i] ? '0' : '-2'));
        if (tried !== gates[i]) { out.push('puts("Wrong sequence") = 15'); break; }
      }
      if (lines.length >= 3 && lines[0] === gates[0] && lines[1] === gates[1] && lines[2] === gates[2]) {
        out.push('puts("Access granted")');
        out.push('printf("Flag: %s", "REV{f0ll0w_th3_p4th}")');
      }
      out.push('+++ exited +++');
      return out.join('\n');
    }
  },

  gdb: {
    breakpoints: {
      strcmp: {
        addr: '0x7ffff7c812e0',
        hitNote: '__strcmp_avx2 () — Gate check',
        args: { RDI: '"<input>", RSI: "<gate đúng>"' }
      }
    },
    runOut: 'Gate 1: Gate 2: Gate 3: \nAccess denied\n'
  },

  ghidra: {
    functions: [
      {
        name: 'main', addr: '0x00001189',
        decomp: [
          'undefined8 main(void)',
          '{',
          '  char g1 [32];',
          '  char g2 [32];',
          '  char g3 [32];',
          '  printf("Gate 1: ");',
          '  __isoc99_scanf(&DAT_00002010,g1);',
          '  if (strcmp(g1,"alpha") != 0) {',
          '    puts("Wrong sequence");',
          '    /* подразумевается exit */',
          '    return 1;',
          '  }',
          '  printf("Gate 2: ");',
          '  __isoc99_scanf(&DAT_00002010,g2);',
          '  if (strcmp(g2,"bravo2") != 0) {',
          '    puts("Wrong sequence");',
          '    return 1;',
          '  }',
          '  printf("Gate 3: ");',
          '  __isoc99_scanf(&DAT_00002010,g3);',
          '  if (strcmp(g3,"charlie") != 0) {',
          '    puts("Wrong sequence");',
          '    return 1;',
          '  }',
          '  puts("Access granted");',
          '  printf("Flag: %s","REV{f0ll0w_th3_p4th}");',
          '  return 0;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 6, asm: '0x00001195' }, { line: 9, asm: '0x000011d0' },
          { line: 14, asm: '0x000011e8' }, { line: 17, asm: '0x0000120a' },
          { line: 22, asm: '0x0000122c' }, { line: 27, asm: '0x00001264' },
          { line: 30, asm: '0x00001272' }
        ],
        instructions: [
          { addr: '0x00001189', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
          { addr: '0x0000118d', bytes: '55', mnemonic: 'PUSH', operands: 'RBP' },
          { addr: '0x0000118e', bytes: '48 89 e5', mnemonic: 'MOV', operands: 'RBP,RSP' },
          { addr: '0x00001191', bytes: '48 83 ec 70', mnemonic: 'SUB', operands: 'RSP,0x70' },
          { addr: '0x00001195', bytes: '48 8d 05 6c 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe6c]', comment: '=> 0x2008 "Gate 1: "' },
          { addr: '0x000011d0', bytes: '85 c0', mnemonic: 'TEST', operands: 'EAX,EAX', comment: 'strcmp kết quả — 0 thì qua Gate 1' },
          { addr: '0x000011d2', bytes: '75 8c', mnemonic: 'JNE', operands: '0x00001260', comment: 'sai Gate 1 → thoát' },
          { addr: '0x000011e8', bytes: '85 c0', mnemonic: 'TEST', operands: 'EAX,EAX', comment: 'Gate 2' },
          { addr: '0x0000120a', bytes: '85 c0', mnemonic: 'TEST', operands: 'EAX,EAX', comment: 'Gate 3' },
          { addr: '0x00001264', bytes: '85 c0', mnemonic: 'TEST', operands: 'EAX,EAX' },
          { addr: '0x00001272', bytes: '48 8d 05 07 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe07]', comment: '=> 0x2080 "Access granted"' },
          { addr: '0x0000128e', bytes: 'c9', mnemonic: 'LEAVE', operands: '' },
          { addr: '0x0000128f', bytes: 'c3', mnemonic: 'RET', operands: '' }
        ]
      }
    ],
    strings: [
      { addr: '0x00002008', value: 'Gate 1: ', xrefs: ['0x00001195'] },
      { addr: '0x00002011', value: 'Gate 2: ', xrefs: [] },
      { addr: '0x0000201a', value: 'Gate 3: ', xrefs: [] },
      { addr: '0x00002080', value: 'Access granted', xrefs: ['0x00001272'] },
      { addr: '0x00002090', value: 'Wrong sequence', xrefs: [] }
    ],
    xrefs: { '0x00002008': ['0x00001195'], '0x00002080': ['0x00001272'] },
    cfg: {
      main: {
        nodes: [
          { id: 'entry', addr: '0x00001189', label: 'printf+scanf\\nGate 1', succ: ['chk1'] },
          { id: 'chk1', addr: '0x000011d0', label: 'strcmp g1,"alpha"', succ: ['gate2', 'fail'] },
          { id: 'gate2', addr: '0x000011e8', label: 'scanf Gate 2', succ: ['chk2'] },
          { id: 'chk2', addr: '0x0000120a', label: 'strcmp g2,"bravo2"', succ: ['gate3', 'fail'] },
          { id: 'gate3', addr: '0x0000122c', label: 'scanf Gate 3', succ: ['chk3'] },
          { id: 'chk3', addr: '0x00001264', label: 'strcmp g3,"charlie"', succ: ['win', 'fail'] },
          { id: 'win', addr: '0x00001272', label: 'puts granted\\nprintf FLAG', succ: [] },
          { id: 'fail', addr: '0x0000127a', label: 'puts denied', succ: [] }
        ],
        edges: [['entry', 'chk1'], ['chk1', 'gate2'], ['chk1', 'fail'], ['gate2', 'chk2'], ['chk2', 'gate3'], ['chk2', 'fail'], ['gate3', 'chk3'], ['chk3', 'win'], ['chk3', 'fail']]
      }
    }
  },

  cSource: [
    '#include <stdio.h>',
    '#include <string.h>',
    '',
    'int main(void) {',
    '    char g1[32], g2[32], g3[32];',
    '    printf("Gate 1: "); scanf("%31s", g1);',
    '    if (strcmp(g1, "alpha"))   { puts("Wrong sequence"); return 1; }',
    '    printf("Gate 2: "); scanf("%31s", g2);',
    '    if (strcmp(g2, "bravo2"))  { puts("Wrong sequence"); return 1; }',
    '    printf("Gate 3: "); scanf("%31s", g3);',
    '    if (strcmp(g3, "charlie")) { puts("Wrong sequence"); return 1; }',
    '    puts("Access granted");',
    '    printf("Flag: %s", "REV{f0ll0w_th3_p4th}");',
    '    return 0;',
    '}'
  ].join('\n')
};
