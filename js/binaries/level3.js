/* ============================================================
 * RevQuest — binaries/level3.js — "The Hidden Compare"
 * Flag KHÔNG có trong strings: được lắp từng byte bằng MOV rồi strcmp.
 * Đa đường: ltrace (dễ) · decompiler (vừa) · gdb breakpoint (khó) · objdump asm.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
window.RevQuest.binaries = window.RevQuest.binaries || {};
window.RevQuest.binaries.level3 = {
  name: 'challenge', arch: 'x86-64', format: 'elf64-pie', size: 17200,

  fileOutput: 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=b3f2a91c7e5d4a8b6c0d2e4f6a8b0c2d4e6f8a1b, for GNU/Linux 3.2.0, not stripped',

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
    '  Start of section headers:          14096 (bytes into file)',
    '  Flags:                             0x0',
    '  Size of this header:               64 (bytes)',
    '  Number of section headers:         31'
  ].join('\n'),

  // KHÔNG có flag ở đây — đây là cả bài học
  stringsOut: [
    '/lib64/ld-linux-x86-64.so.2', 'printf', 'scanf', 'strcmp', 'puts',
    '__libc_start_main', 'GLIBC_2.2.5', '__stack_chk_fail',
    'password: ', '%31s', 'Access granted', 'Access denied',
    'challenge.c', 'GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0'
  ].join('\n'),

  objdumpOut: [
    'challenge:     file format elf64-x86-64',
    '',
    'Disassembly of section .text:',
    '',
    '0000000000001189 <main>:',
    '    1189:\tf3 0f 1e fa         \tendbr64',
    '    118d:\t55                  \tpush   %rbp',
    '    118e:\t48 89 e5            \tmov    %rsp,%rbp',
    '    1191:\t48 83 ec 40         \tsub    $0x40,%rsp',
    '    1195:\t48 8d 05 6c 0e 00 00\tlea    0xe6c(%rip),%rax        # 2008 <password: >',
    '    119c:\t48 89 c7            \tmov    %rax,%rdi',
    '    119f:\tb8 00 00 00 00      \tmov    $0x0,%eax',
    '    11a4:\te8 e7 fe ff ff      \tcall   1090 <printf@plt>',
    '    11a9:\t48 8d 45 c0         \tlea    -0x40(%rbp),%rax',
    '    11ad:\t48 89 c6            \tmov    %rax,%rsi',
    '    11b0:\t48 8d 05 59 0e 00 00\tlea    0xe59(%rip),%rax        # 2010 <%31s>',
    '    11b7:\t48 89 c7            \tmov    %rax,%rdi',
    '    11ba:\tb8 00 00 00 00      \tmov    $0x0,%eax',
    '    11bf:\te8 cc fe ff ff      \tcall   1090 <scanf@plt>',
    '    ; ... lắp flag từng byte (xem listing trong game) ...',
    '    11f1:\t48 8d 45 c0         \tlea    -0x40(%rbp),%rax',
    '    11f5:\t48 89 c7            \tmov    %rax,%rdi',
    '    11f8:\t48 8d 75 d0         \tlea    -0x30(%rbp),%rsi',
    '    11fc:\te8 8f fe ff ff      \tcall   1090 <strcmp@plt>',
    '    1201:\t85 c0               \ttest   %eax,%eax',
    '    1203:\t75 12               \tjne    1217 <main+0x8e>',
    '    1205:\t48 8d 05 22 0e 00 00\tlea    0xe22(%rip),%rax        # 202e <granted>',
    '    120c:\t48 89 c7            \tmov    %rax,%rdi',
    '    120f:\te8 82 fe ff ff      \tcall   1090 <puts@plt>',
    '    1214:\t90                  \tnop',
    '    1215:\teb 10               \tjmp    1227 <main+0x9e>',
    '    1217:\t48 8d 05 19 0e 00 00\tlea    0xe19(%rip),%rax        # 2037 <denied>',
    '    121e:\t48 89 c7            \tmov    %rax,%rdi',
    '    1221:\te8 70 fe ff ff      \tcall   1090 <puts@plt>',
    '    1226:\t90                  \tnop',
    '    1227:\tb8 00 00 00 00      \tmov    $0x0,%eax',
    '    122c:\tc9                  \tleave  ',
    '    122d:\tc3                  \tret'
  ].join('\n'),

  execOutput: 'password: \nAccess denied\n',

  /** mô phỏng hành vi: đọc stdin, so flag lắp-runtime */
  run: function (stdin) {
    const input = String(stdin || '').trim();
    if (!input) return 'password: \n';
    return 'password: \n' + (input === 'REV{runt1m3_str}' ? 'Access granted\n' : 'Access denied\n');
  },

  ltrace: {
    wrong: [
      'printf("password: ")                              = 10',
      'scanf("%31s", 0x7ffd1234ab00)                     = 1',
      'strcmp("wrong", "REV{runt1m3_str}")               = -5',
      'puts("Access denied")                             = 14',
      '+++ exited (status 0) +++'
    ].join('\n'),
    withInput: function (input) {
      return [
        'printf("password: ")                              = 10',
        'scanf("%31s", 0x7ffd1234ab00)                     = 1',
        'strcmp("' + String(input).slice(0, 31) + '", "REV{runt1m3_str}")' +
          ' '.repeat(Math.max(1, 16 - String(input).length)) + '= ' + (input === 'REV{runt1m3_str}' ? '0' : String(input < 'REV{runt1m3_str}' ? -5 : 5)),
        input === 'REV{runt1m3_str}' ? 'puts("Access granted")                             = 15' : 'puts("Access denied")                             = 14',
        '+++ exited (status 0) +++'
      ].join('\n');
    }
  },

  gdb: {
    breakpoints: {
      strcmp: {
        addr: '0x7ffff7c812e0',
        hitNote: '__strcmp_avx2 () at ../sysdeps/x86_64/multiarch/strcmp-avx2.S',
        args: { RDI: '"<input của bạn>"', RSI: '"REV{runt1m3_str}"' },
        registers: {
          RDI: '0x7ffd1234ab00', RSI: '0x7ffd1234ab20',
          RIP: '0x7ffff7c812e0 <__strcmp_avx2>', RAX: '0x0', RBX: '0x0', RCX: '0x0', RDX: '0x31',
          RBP: '0x7fffffffd020', RSP: '0x7fffffffd010', EFLAGS: '0x202 [ IF ]'
        }
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
          '  char local_30 [16];',
          '  char local_40 [32];',
          '  printf("password: ");',
          '  __isoc99_scanf(&DAT_00002010,local_40);',
          '  local_30[0] = \'R\';',
          '  local_30[1] = \'E\';',
          '  local_30[2] = \'V\';',
          '  local_30[3] = \'{\';',
          '  local_30[4] = \'r\';',
          '  local_30[5] = \'u\';',
          '  local_30[6] = \'n\';',
          '  local_30[7] = \'t\';',
          '  local_30[8] = \'1\';',
          '  local_30[9] = \'m\';',
          '  local_30[10] = \'3\';',
          '  local_30[11] = \'_\';',
          '  local_30[12] = \'s\';',
          '  local_30[13] = \'t\';',
          '  local_30[14] = \'r\';',
          '  local_30[15] = \'}\';',
          '  if (strcmp(local_40,local_30) == 0) {',
          '    puts("Access granted");',
          '  }',
          '  else {',
          '    puts("Access denied");',
          '  }',
          '  return 0;',
          '}'
        ].join('\n'),
        cMap: [
          { line: 6, asm: '0x00001195' },
          { line: 7, asm: '0x000011bf' },
          { line: 8, asm: '0x000011c4' },
          { line: 24, asm: '0x000011f1' },
          { line: 25, asm: '0x000011fc' },
          { line: 26, asm: '0x00001201' },
          { line: 28, asm: '0x0000120f' },
          { line: 32, asm: '0x00001221' },
          { line: 35, asm: '0x00001227' }
        ],
        instructions: (function () {
          const head = [
            { addr: '0x00001189', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
            { addr: '0x0000118d', bytes: '55', mnemonic: 'PUSH', operands: 'RBP' },
            { addr: '0x0000118e', bytes: '48 89 e5', mnemonic: 'MOV', operands: 'RBP,RSP' },
            { addr: '0x00001191', bytes: '48 83 ec 40', mnemonic: 'SUB', operands: 'RSP,0x40' },
            { addr: '0x00001195', bytes: '48 8d 05 6c 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe6c]', comment: '=> 0x2008 "password: "' },
            { addr: '0x0000119c', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
            { addr: '0x0000119f', bytes: 'b8 00 00 00 00', mnemonic: 'MOV', operands: 'EAX,0x0' },
            { addr: '0x000011a4', bytes: 'e8 e7 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'printf' },
            { addr: '0x000011a9', bytes: '48 8d 45 c0', mnemonic: 'LEA', operands: 'RAX,[RBP + -0x40]' },
            { addr: '0x000011ad', bytes: '48 89 c6', mnemonic: 'MOV', operands: 'RSI,RAX' },
            { addr: '0x000011b0', bytes: '48 8d 05 59 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe59]', comment: '=> 0x2010 "%31s"' },
            { addr: '0x000011b7', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
            { addr: '0x000011ba', bytes: 'b8 00 00 00 00', mnemonic: 'MOV', operands: 'EAX,0x0' },
            { addr: '0x000011bf', bytes: 'e8 cc fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'scanf' }
          ];
          // flag "REV{runt1m3_str}" lắp từng byte tại [rbp-0x30 + i]
          const flag = 'REV{runt1m3_str}';
          const movs = [];
          let a = 0x11c4;
          for (let i = 0; i < flag.length; i++) {
            const c = flag.charCodeAt(i);
            movs.push({
              addr: '0x' + a.toString(16).padStart(16, '0'),
              bytes: 'c6 45 ' + (0xd0 + i).toString(16).padStart(2, '0') + ' ' + c.toString(16).padStart(2, '0'),
              mnemonic: 'MOV', operands: 'byte ptr [RBP + -0x' + (0x30 - i).toString(16) + '],0x' + c.toString(16),
              comment: i === flag.length - 1 ? '=> byte cuối của flag — lắp runtime, strings KHÔNG thấy!' : undefined
            });
            a += 4;
          }
          const tail = [
            { addr: '0x' + (a + 4).toString(16).padStart(16, '0'), bytes: 'c6 45 e0 00', mnemonic: 'MOV', operands: 'byte ptr [RBP + -0x20],0x0' },
            { addr: '0x000011f1', bytes: '48 8d 45 c0', mnemonic: 'LEA', operands: 'RAX,[RBP + -0x40]' },
            { addr: '0x000011f5', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
            { addr: '0x000011f8', bytes: '48 8d 75 d0', mnemonic: 'LEA', operands: 'RSI,[RBP + -0x30]' },
            { addr: '0x000011fc', bytes: 'e8 8f fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'strcmp' },
            { addr: '0x00001201', bytes: '85 c0', mnemonic: 'TEST', operands: 'EAX,EAX' },
            { addr: '0x00001203', bytes: '75 12', mnemonic: 'JNE', operands: '0x00001217', comment: 'không bằng → nhảy tới nhánh denied' },
            { addr: '0x00001205', bytes: '48 8d 05 22 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe22]', comment: '=> 0x202e "Access granted"' },
            { addr: '0x0000120c', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
            { addr: '0x0000120f', bytes: 'e8 82 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'puts' },
            { addr: '0x00001215', bytes: 'eb 10', mnemonic: 'JMP', operands: '0x00001227' },
            { addr: '0x00001217', bytes: '48 8d 05 19 0e 00 00', mnemonic: 'LEA', operands: 'RAX,[rip + 0xe19]', comment: '=> 0x2037 "Access denied"' },
            { addr: '0x0000121e', bytes: '48 89 c7', mnemonic: 'MOV', operands: 'RDI,RAX' },
            { addr: '0x00001221', bytes: 'e8 70 fe ff ff', mnemonic: 'CALL', operands: '0x00001090', comment: 'puts' },
            { addr: '0x00001227', bytes: 'b8 00 00 00 00', mnemonic: 'MOV', operands: 'EAX,0x0' },
            { addr: '0x0000122c', bytes: 'c9', mnemonic: 'LEAVE', operands: '' },
            { addr: '0x0000122d', bytes: 'c3', mnemonic: 'RET', operands: '' }
          ];
          return head.concat(movs, tail);
        })()
      }
    ],

    strings: [
      { addr: '0x00002008', value: 'password: ', xrefs: ['0x00001195'] },
      { addr: '0x00002010', value: '%31s', xrefs: ['0x000011b0'] },
      { addr: '0x0000202e', value: 'Access granted', xrefs: ['0x00001205'] },
      { addr: '0x00002037', value: 'Access denied', xrefs: ['0x00001217'] }
    ],

    xrefs: {
      '0x00002008': ['0x00001195'],
      '0x00002010': ['0x000011b0'],
      '0x0000202e': ['0x00001205'],
      '0x00002037': ['0x00001217']
    },

    cfg: {
      main: {
        nodes: [
          { id: 'entry', addr: '0x00001189', label: 'printf+scanf', succ: ['assemble'] },
          { id: 'assemble', addr: '0x000011c4', label: 'lắp want[]\\ntừng byte', succ: ['cmp'] },
          { id: 'cmp', addr: '0x000011fc', label: 'strcmp(buf,want)\\ntest eax,eax', succ: ['granted', 'denied'] },
          { id: 'granted', addr: '0x00001205', label: 'puts granted', succ: ['exit'] },
          { id: 'denied', addr: '0x00001217', label: 'puts denied', succ: ['exit'] },
          { id: 'exit', addr: '0x00001227', label: 'return 0', succ: [] }
        ],
        edges: [['entry', 'assemble'], ['assemble', 'cmp'], ['cmp', 'granted'], ['cmp', 'denied'], ['granted', 'exit'], ['denied', 'exit']]
      }
    }
  },

  cSource: [
    '#include <stdio.h>',
    '#include <string.h>',
    '',
    'int main(void) {',
    '    char buf[32];',
    '    char want[16];',
    '    printf("password: ");',
    '    scanf("%31s", buf);',
    '    /* lắp flag TỪNG BYTE — strings không bao giờ thấy */',
    '    want[0]=\'R\'; want[1]=\'E\'; want[2]=\'V\'; want[3]=\'{\';',
    '    want[4]=\'r\'; want[5]=\'u\'; want[6]=\'n\'; want[7]=\'t\';',
    '    want[8]=\'1\'; want[9]=\'m\'; want[10]=\'3\'; want[11]=\'_\';',
    '    want[12]=\'s\'; want[13]=\'t\'; want[14]=\'r\'; want[15]=\'}\';',
    '    if (strcmp(buf, want) == 0) puts("Access granted");',
    '    else puts("Access denied");',
    '    return 0;',
    '}'
  ].join('\n')
};
