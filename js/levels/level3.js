/* ============================================================
 * RevQuest — Level 3: The Hidden Compare (multi-path chuẩn)
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 3,
  slug: 'hidden-compare',
  title: 'The Hidden Compare',
  goal: 'Binary hỏi password, strings không thấy gì. Tìm password mà chương trình so sánh và submit flag dạng REV{...}.',
  flag: 'REV{runt1m3_str}',

  unlockTools: ['decompiler'],
  paths: [
    { id: 'ltrace-path', tools: ['ltrace'], badge: 'watcher', stars: 2, desc: 'ltrace nghe lén strcmp — đáp án nằm ngay trong call log.' },
    { id: 'decomp-path', tools: ['decompiler'], badge: 'reverse_engineer', stars: 3, desc: 'Đọc pseudo-C: flag được LẮP TỪNG BYTE, tự ghép lại.' },
    { id: 'gdb-path', tools: ['gdb'], badge: 'debugger', stars: 3, desc: 'break strcmp, x/s $rsi — xem tham số lúc runtime.' },
    { id: 'asm-path', tools: ['objdump'], badge: 'asm_peeker', stars: 2, desc: 'objdump, đọc 16 lệnh MOV lắp chuỗi.' }
  ],

  files: {
    'challenge': { type: 'elf', binaryKey: 'level3', mode: '0644' },
    'README': { type: 'file', content: 'Level này KHÔNG có flag trong strings — tác giả đã học được bài\nhọc từ level 1 và lắp flag bằng code. strings là bắt đầu, không phải kết thúc.\nTools mới: Decompiler panel. Lệnh mới: ltrace, gdb, objdump, readelf, man.' }
  },

  hints: [
    'Khi flag không nằm trong strings, nó nằm ở RUNTIME. Ba chỗ nhìn được runtime: ltrace (log mọi library call — strcmp phải so với gì đó), gdb (breakpoint trước strcmp rồi xem tham số), decompiler (đọc logic lắp chuỗi).',
    'Dễ nhất: `echo "wrong" | ltrace ./challenge` — dòng strcmp("wrong", "...") nói thẳng đáp án. Hoặc GUI: panel DECOMPILED bên phải — hàm main lắp flag vào local_30 từng ký tự, đọc và ghép lại.',
    'Gần như đáp án: `echo "x" | ltrace ./challenge` → dòng strcmp có "REV{runt1m3_str}". Hoặc trong listing, 16 lệnh MOV byte ptr [RBP-0x30...],0x52,0x45,0x56... — hex từng byte chính là flag (Level 0 converter!).'
  ],

  theory: [
    '# Level 3 — The Hidden Compare',
    '',
    '> **TL;DR:** Tác giả đã giấu flag khỏi strings: code **lắp chuỗi từng byte** vào biến local rồi `strcmp`. Flag giờ chỉ tồn tại **lúc runtime**. Ba cách nhìn runtime: `ltrace` (log library call — rẻ nhất), **Decompiler** (pseudo-C đọc logic), `gdb` (breakpoint + xem register). Cả ba đều hợp lệ — chọn theo sở thích.',
    '',
    '## 1. Kỹ thuật "không có trong strings"',
    '',
    '```c',
    'char want[16];                    // §1',
    'want[0] = \'R\'; want[1] = \'E\';    // §1',
    'want[2] = \'V\'; want[3] = \'{\';    // §1',
    '/* ...12 byte nữa... */           // §1',
    'if (strcmp(buf, want) == 0)       // §2',
    '    puts("Access granted");       // §2',
    '```',
    '',
    '```asm',
    'mov BYTE PTR [rbp-0x30], 0x52     ; §1  \'R\'',
    'mov BYTE PTR [rbp-0x2f], 0x45     ; §1  \'E\'',
    'mov BYTE PTR [rbp-0x2e], 0x56     ; §1  \'V\'',
    'mov BYTE PTR [rbp-0x2d], 0x7b     ; §1  \'{\'',
    '/* ... */                         ; §1',
    'lea rdi, [rbp-0x40]               ; §2  buf',
    'lea rsi, [rbp-0x30]               ; §2  want',
    'call strcmp                       ; §2',
    '```',
    '',
    '`.rodata` giờ chỉ có "Access denied" — strings chùn tay. Nhưng 16 lệnh `MOV byte ptr` với immediate 0x52 0x45 0x56... chớp mắt trên listing: **đó chính là flag dưới dạng khác**.',
    '',
    '## 2. Ba con đường runtime',
    '',
    '**ltrace** — chạy binary, in mỗi library call: `strcmp("wrong", "REV{runt1m3_str}") = -5`. Bạn vừa nghe trộm cuộc hội thoại.',
    '',
    '**Decompiler** — Ghidra dịch ngược asm thành C giả: `local_30[0] = \'R\'; ...`. Đọc và ghép.',
    '',
    '**gdb** — `break strcmp`, `run`, `x/s $rsi` — dừng đúng khoảnh khắc, nhìn tham số thứ hai.',
    '',
    '## 3. Quy tắc chọn đường',
    '',
    'Không có đường "chuẩn". ltrace nhanh nhưng chỉ được với hàm libc có log (strcmp, getenv...). Decompiler tổng quát nhất nhưng cần luyện đọc pseudo-C. gdb mạnh nhất nhưng tốn thao tác. RE chuyên nghiệp dùng cả ba tùy bài — game của bạn track điều đó và trao badge tương ứng.'
  ].join('\n'),

  solution: [
    '# Solution — Level 3 (3 con đường song song)',
    '',
    '## A. ltrace — 2 lệnh (★★)',
    '',
    '```',
    '$ echo "wrong" | ltrace ./challenge',
    'strcmp("wrong", "REV{runt1m3_str}") = -5',
    '```',
    '',
    'strcmp phải có 2 đối số — đối số thứ hai là điều binary so sánh: chính là flag. Pipe `echo "wrong" |` vì ltrace kế thừa stdin của shell.',
    '',
    '## B. Decompiler — đọc logic (★★★)',
    '',
    'Panel DECOMPILED, hàm `main`: 16 dòng `local_30[i] = ...` ghép lần lượt: `R`,`E`,`V`,`{`,`r`,`u`,`n`,`t`,`1`,`m`,`3`,`_`,`s`,`t`,`r`,`}` → `REV{runt1m3_str}`. Click từng dòng C → listing nhảy tới lệnh MOV tương ứng (cross-highlight) — đối chiếu hex 0x52=\'R\' từ Level 0.',
    '',
    '## C. gdb — breakpoint (★★★)',
    '',
    '```',
    '$ gdb ./challenge',
    '(gdb) break strcmp',
    '(gdb) run wrong',
    'Breakpoint 1, __strcmp_avx2 ()',
    '(gdb) x/s $rsi',
    '0x7ffd...: "REV{runt1m3_str}"',
    '```',
    '',
    '$rdi = tham số 1 (input bạn nhập), $rsi = tham số 2 (đáp án). Quy ước gọi hàm: RDI, RSI, RDX... — nhớ từ Level 0.',
    '',
    '## Vì sao author giấu được — và vì sao vẫn không đủ',
    '',
    'Lắp byte từng cái giấu flag khỏi strings vì không còn chuỗi liền mạch ≥4 byte trong .rodata. Nhưng **mọi secret mà chương trình biết đều phải tồn tại trong bộ nhớ lúc so sánh** — ltrace/gdb nhìn bộ nhớ, nên không secret nào "chống RE được" nếu bạn kiểm soát runtime. Chống được static analysis, không chống được dynamic.'
  ].join('\n'),

  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      '<b>Aha moment: asm → C.</b> Bấm các dòng asm bên trái — dòng C tương ứng sáng lên bên phải. Đó là lý do decompiler là người bạn đầu tiên trong binary lớn.'));

    const miniBin = {
      ghidra: {
        functions: [{
          name: 'main', addr: '0x00001189',
          decomp: [
            'undefined8 main(void)',
            '{',
            '  long local_10;',
            '  local_10 = 0x2a;',
            '  if (local_10 < 0x2b) {',
            '    puts("less");',
            '  }',
            '  return 0;',
            '}'
          ].join('\n'),
          cMap: [
            { line: 4, asm: '0x00001191' },
            { line: 5, asm: '0x0000119a' },
            { line: 6, asm: '0x000011a2' }
          ],
          instructions: [
            { addr: '0x00001189', bytes: 'f3 0f 1e fa', mnemonic: 'ENDBR64', operands: '' },
            { addr: '0x0000118d', bytes: '55', mnemonic: 'PUSH', operands: 'RBP' },
            { addr: '0x00001191', bytes: 'c7 45 f8 2a 00 00 00', mnemonic: 'MOV', operands: 'dword ptr [RBP + -0x8],0x2a', comment: 'local_10 = 42' },
            { addr: '0x0000119a', bytes: '83 7d f8 2b', mnemonic: 'CMP', operands: 'dword ptr [RBP + -0x8],0x2b', comment: 'if (local_10 < 43)' },
            { addr: '0x000011a2', bytes: '74 0c', mnemonic: 'JE', operands: '0x000011b0', comment: '→ puts("less")' }
          ]
        }]
      }
    };

    const grid = RQC.el('div', 'ghidra-grid');
    const center = RQC.el('div', 'ghidra-center');
    const right = RQC.el('div', 'ghidra-right');
    grid.appendChild(center); grid.appendChild(right);
    container.appendChild(grid);
    const lst = RQC.Ghidra.listing(center, miniBin, {
      levelId: -3,
      onSelect: function (instr) { decomp.highlightForAsm(instr.addr); }
    });
    const decomp = RQC.Ghidra.decompiler(right, miniBin, {
      levelId: -3,
      onJumpAsm: function (addr) { lst.jumpTo(addr); }
    });
    container.appendChild(RQC.el('p', null, '<span style="color:var(--muted);font-size:13px">💡 Trong challenge thật: click dòng C có số → listing nhảy; chọn dòng asm → dòng C sáng. Hai chiều.</span>'));
  },

  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    const bin = RQC.binaries.level3;
    container.appendChild(RQC.el('p', null,
      '<code>strings challenge</code> đã không còn giúp gì (thử đi!). Decompiler vừa mở khóa — panel bên phải. ' +
      'Terminal có thêm <code>ltrace</code>, <code>objdump</code>, <code>readelf</code>, <code>gdb</code>, <code>man</code>. Tìm password rồi submit flag.'));

    RQC.Ghidra.workbench(container, {
      levelId: 3,
      bin: bin,
      api: api,
      pathsMeta: { listing: 'asm-path' }
    });

    // credit path khi dùng ltrace/decomp/gdb/objdump rồi submit
    RQC.Bus.on('tool-use', function (e) {
      if (e.level !== 3) return;
      if (e.tool === 'ltrace') api.creditPath('ltrace-path');
      if (e.tool === 'gdb') api.creditPath('gdb-path');
      if (e.tool === 'objdump') api.creditPath('asm-path');
      if (e.tool === 'decompiler') api.creditPath('decomp-path');
    });
    RQC.Bus.on('c-line-click', function (e) {
      if (e.level === 3) api.creditPath('decomp-path');
    });

    RQC.renderFlagSubmit(container, api, 3);
  }
});
