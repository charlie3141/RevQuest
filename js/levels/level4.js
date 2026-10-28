/* ============================================================
 * RevQuest — Level 4: Keygen Me
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 4,
  slug: 'keygen-me',
  title: 'Keygen Me',
  goal: 'Binary nhận username rồi hỏi key. Tìm key tương ứng để nó in flag (flag phải submit dạng REV{...}).',
  flag: 'REV{k3yg3n_m4g1c}',

  unlockTools: ['xrefs'],
  paths: [
    { id: 'ltrace-path', tools: ['ltrace'], badge: 'watcher', stars: 2, desc: 'echo "tên bạn 000" | ltrace ./challenge — strcmp lộ key đúng.' },
    { id: 'gdb-path', tools: ['gdb'], badge: 'debugger', stars: 3, desc: 'break strcmp, x/s $rsi — key đúng nằm trong tham số.' },
    { id: 'decomp-path', tools: ['decompiler'], badge: 'keysmith', stars: 4, desc: 'Đọc công thức keygen trong pseudo-C, tự tính key (viết keygen thật).' }
  ],

  files: {
    'challenge': { type: 'elf', binaryKey: 'level4', mode: '0644' },
    'README': { type: 'file', content: 'Keygen me — serial protection kiểu thập niên 90.\nChạy ./challenge (chmod +x nếu cần), nhập username và key.\nKey đúng phụ thuộc username — mỗi người một key.\nTool mới mở: XREFS panel — ai gọi hàm nào, nhảy theo.' }
  },

  hints: [
    'Key là số, tính từ username bằng một công thức trong binary. Ltrace là đường tắt: nạp username + key giả, strcmp sẽ cho thấy key ĐÚNG. Hoặc gdb: break strcmp rồi x/s $rsi.',
    '`echo "admin 123" | ltrace ./challenge` → strcmp("123","96577") — 96577 chính là key của "admin". Pipe quyết định input: echo "TÊNBẠN 000" | ltrace ./challenge để lấy key của chính bạn.',
    'Gần như đáp án (đường decomp): công thức = tổng mã ASCII ký tự × 1337 % 100000. Với "admin": 521 × 1337 = 696577 → 96577. Chạy `echo "admin 96577" | ./challenge` (chmod +x trước) → in flag.'
  ],

  theory: [
    '# Level 4 — Keygen Me',
    '',
    '> **TL;DR:** Serial protection: `key = f(username)` — binary tính f rồi so sánh. Ba cách thắng: **ltrace/gdb** nghe đáp án lúc strcmp (dễ), hoặc **đọc f trong decompiler** rồi tự viết keygen (nghề thật). Ở đây f = `(sum(char codes) × 1337) % 100000`.',
    '',
    '## 1. Tại sao key phụ thuộc username?',
    '',
    '```c',
    'unsigned total = 0;                    // §1',
    'for (int i = 0; user[i]; i++)          // §1',
    '    total += user[i];                  // §1',
    'snprintf(expected, "%u",               // §2',
    '         (total * 1337u) % 100000u);   // §2',
    'if (!strcmp(key, expected))            // §3',
    '    print_flag();                      // §3',
    '```',
    '',
    '```asm',
    'xor  eax, eax                     ; §1  total = 0',
    'loop:                             ; §1',
    'movzx edx, byte ptr [rcx]         ; §1  c = user[i]',
    'add  eax, edx                     ; §1  total += c',
    'inc  rcx                          ; §1',
    'imul eax, eax, 0x539              ; §2  * 1337',
    'call strcmp                       ; §3  (key, expected)',
    'test eax, eax                     ; §3',
    'jne  denied                       ; §3',
    '```',
    '',
    'Copy-paste scheme từ thập niên 90: mỗi user một key → bán key theo tên. Lỗi chết người: **binary phải chứa cả hàm kiểm tra** → đáp án luôn tính được ngược.',
    '',
    '## 2. Xrefs — nhảy theo "ai gọi ai"',
    '',
    'Trong binary lớn bạn không đọc tuần tự. Bạn bắt đầu từ strings "Access granted" → xref ngược → hàm nào in nó → vòng lặp tính key ngay phía trên. Panel **XREFS** mới của bạn làm đúng việc đó: click xref → nhảy. **RE = truy ngược từ mục tiêu**, không phải đọc từ đầu file.',
    '',
    '## 3. Keygen thật trông như thế nào?',
    '',
    'Cùng công thức bạn đọc được, viết lại 5 dòng Python: `key = (sum(map(ord,name)) * 1337) % 100000`. Level 8 sẽ có sẵn script console để chạy; hôm nay tính tay/calculator là đủ cảm giác.'
  ].join('\n'),

  solution: [
    '# Solution — Level 4 (3 con đường)',
    '',
    '## A. ltrace — nghe đáp án (★★)',
    '',
    '```',
    '$ echo "admin 000" | ltrace ./challenge',
    'strcmp("000", "96577") = -9',
    '```',
    '',
    'Đổi username trong pipe thành gì cũng được — strcmp luôn cho biết key đúng của username đó. Dùng chính username của bạn cho vui.',
    '',
    '## B. gdb — breakpoint (★★★)',
    '',
    '```',
    '$ gdb ./challenge',
    '(gdb) break strcmp',
    '(gdb) run admin 000',
    '(gdb) x/s $rsi',
    '"96577"',
    '```',
    '',
    '## C. Decompiler — viết keygen (★★★★)',
    '',
    'Pseudo-C cho thấy: `snprintf(expected, "%u", (total * 0x539) % 0x186a0)` với `total = Σ user[i]`. 0x539 = 1337, 0x186a0 = 100000. Keygen của bạn:',
    '',
    '```python',
    '# keygen.py',
    'name = "admin"',
    'key = (sum(map(ord, name)) * 1337) % 100000',
    'print(name, key)   # admin 96577',
    '```',
    '',
    'Chạy: `echo "admin 96577" | ./challenge` (chmod +x nếu chưa) → `Access granted! Flag: REV{k3yg3n_m4g1c}`.',
    '',
    '## Xrefs dùng ở đâu trong bài này?',
    '',
    'STRINGS panel: "Access granted!" không có xref hiển thị rõ? XREFS panel hiện `Xrefs to 0x2030 ← main+0x89` — nhảy tới nhánh thắng, và code tính key nằm ngay phía trên trong cùng hàm. Loop: notice (chuỗi thắng) → jump (xref) → understand (công thức).'
  ].join('\n'),

  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      '<b>Keygen calculator</b> — công thức trong binary: <code>(Σ charcode × 1337) % 100000</code>. Thử xem username của bạn ra key mấy (đường decomp sẽ tự tính được sau khi đọc pseudo-C):'));
    const row = RQC.el('div', 'field-row');
    row.appendChild(RQC.el('label', null, 'Username:'));
    const inp = RQC.el('input'); inp.type = 'text'; inp.value = 'admin';
    row.appendChild(inp);
    const out = RQC.el('span', 'mono', '');
    out.style.cssText = 'color:var(--yellow);font-size:15px';
    row.appendChild(out);
    container.appendChild(row);
    function calc() {
      let s = 0;
      for (const ch of inp.value) s += ch.charCodeAt(0);
      out.textContent = inp.value ? '→ key = ' + ((s * 1337) % 100000) : '';
    }
    inp.addEventListener('input', calc);
    calc();
    container.appendChild(RQC.el('p', null, '<span style="color:var(--muted);font-size:13px">⚠ Calculator này là "phần thưởng" cho đường decomp — trong challenge hãy tự đọc công thức từ pseudo-C trước khi mở nó ở solution.</span>'));
  },

  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    const bin = RQC.binaries.level4;
    container.appendChild(RQC.el('p', null,
      '<code>./challenge</code> hỏi username + key. Key sai → denied. XREFS panel mới mở — bắt đầu từ chuỗi "Access granted!" và đi ngược. ' +
      'Chạy binary qua pipe: <code>echo "admin 123" | ./challenge</code> (chmod +x trước).'));

    RQC.Ghidra.workbench(container, {
      levelId: 4,
      bin: bin,
      api: api,
      pathsMeta: {}
    });

    RQC.Bus.on('tool-use', function (e) {
      if (e.level !== 4) return;
      if (e.tool === 'ltrace') api.creditPath('ltrace-path');
      if (e.tool === 'gdb') api.creditPath('gdb-path');
      if (e.tool === 'decompiler') api.creditPath('decomp-path');
    });
    RQC.Bus.on('c-line-click', function (e) { if (e.level === 4) api.creditPath('decomp-path'); });

    RQC.renderFlagSubmit(container, api, 4);
  }
});
