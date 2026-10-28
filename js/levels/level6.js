/* ============================================================
 * RevQuest — Level 6: Anti-Debug + Rename
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 6,
  slug: 'anti-debug',
  title: 'Anti-Debug',
  goal: 'Binary in ra chuỗi mã hóa "SFW{bouj_efch}" và có ptrace chống debugger. Hiểu hàm biến đổi (đặt tên cho nó!) rồi decode thành flag REV{...}.',
  flag: 'REV{anti_dbg}',

  unlockTools: ['rename'],
  paths: [
    { id: 'decomp-rename-path', tools: ['decompiler', 'rename'], badge: 'reverse_engineer', stars: 3, desc: 'Rename sub_1160 → decode, đọc logic -1 từng chữ cái, decode tay.' },
    { id: 'gdb-path', tools: ['gdb'], badge: 'debugger', stars: 3, desc: 'break ptrace — thấy PTRACE_TRACEME, nhận diện anti-debug.' },
    { id: 'ltrace-path', tools: ['ltrace'], badge: 'watcher', stars: 2, desc: 'ltrace thấy ptrace(0,0,0,0) — dấu hiệu anti-debug kinh điển.' }
  ],

  files: {
    'challenge': { type: 'elf', binaryKey: 'level6', mode: '0644' },
    'README': { type: 'file', content: 'Challenge này: (1) ptrace anti-debug, (2) hàm không tên (sub_11xx),\n(3) chuỗi "SFW{bouj_efch}" in ra y nguyên.\nTool mới: RENAME — bấm tab hàm trong listing rồi phím N.\nĐặt tên đúng = hiểu chương trình. Mẹo: độ lệch giữa S và R là...' }
  },

  hints: [
    '"SFW{bouj_efch}" vs format flag REV{...}: S→R là -1. Toàn bộ chuỗi có vẻ bị +1 mỗi CHỮ CÁI (ngoặc giữ nguyên). Hàm sub_1160 làm gì đó từng byte — rename nó rồi đọc pseudo-C.',
    'Bấm tab hàm trong listing (hoặc symbol tree) chọn sub_1160, phím N → đặt tên "decode". Pseudo-C nói: nếu byte là chữ cái thì -1. Decode "SFW{bouj_efch}" bằng tay: mỗi chữ -1, giữ { } _ và số.',
    'Gần như đáp án: S-1=R, F-1=E, W-1=V, { giữ, b-1=a, o-1=n, u-1=t, j-1=i, _ giữ, e-1=d, f-1=e, c-1=b, h-1=g → REV{anti_dbg}. Gdb path: `gdb ./challenge`, `break ptrace`, `run` → thấy PTRACE_TRACEME.'
  ],

  theory: [
    '# Level 6 — Anti-Debug',
    '',
    '> **TL;DR:** Binary chống debugger bằng `ptrace(PTRACE_TRACEME)` — process chỉ trace được bởi 1 cha; tự trace mình → debugger ngoài bị từ chối (ptrace trả -1). Nhưng anti-debug chỉ chống **động** — static (decompiler + rename) vẫn nhìn thẳng logic: chuỗi bị mã hóa +1 mỗi chữ cái. **Rename hàm vô danh là lúc "đặt tên = hiểu".**',
    '',
    '## 1. ptrace hoạt động thế nào?',
    '',
    '```c',
    'void check_debugger(void) {            // §1',
    '    if (ptrace(PTRACE_TRACEME,         // §1',
    '               0, 0, 0) == -1) {       // §1',
    '        puts("debugger detected");     // §1',
    '        _exit(1);                      // §1',
    '    }                                  // §1',
    '}                                      // §1',
    '```',
    '',
    '```asm',
    'mov  edi, 0                       ; §1  PTRACE_TRACEME',
    'call ptrace                       ; §1',
    'cmp  rax, -1                      ; §1  bị trace rồi?',
    'je   exit_now                     ; §1',
    '```',
    '',
    'Một process chỉ được trace bởi **một** cha. Khi gdb attach, gdb trở thành cha — `PTRACE_TRACEME` từ trong binary fail → trả -1 → binary biết mình đang bị soi. Đó là lối thoát duy nhất cho anti-debug kiểu này: **không dùng debugger**, dùng tĩnh.',
    '',
    '## 2. Sub_11xx — hàm vô danh',
    '',
    'Binary stripped (bỏ symbol) → mọi hàm thành `sub_1160`, `sub_11a0`... Ghidra cho bạn **N** để rename: `sub_11a0` → `check_debugger`, `sub_1160` → `decode`. Tên mới lan truyền khắp listing/decompiler/tree — và **não bạn** đỡ phải nhớ địa chỉ.',
    '',
    '## 3. Decode bằng tay',
    '',
    '`"SFW{bouj_efch}"`: mỗi **chữ cái** -1, giữ `{ } _` và số: `S→R, F→E, W→V, {→{, b→a, o→n, u→t, j→i, _→_, e→d, f→e, c→b, h→g`. Ghép: `REV{anti_dbg}`. Cách này chính là viết decoder 1 dòng — Level 8 sẽ tự động hóa nó.'
  ].join('\n'),

  solution: [
    '# Solution — Level 6 (3 con đường)',
    '',
    '## A. Decompiler + Rename (★★★) — con đường "hiểu"',
    '',
    '1. SYMBOL TREE → chọn `sub_1160` → phím **N** → rename `decode`. Chọn `sub_11a0` → rename `check_debugger`.',
    '2. Pseudo-C của decode: mọi chữ cái `-1`. Toàn bộ decompiler giờ hiển thị `decode(...)` và `check_debugger()` — code tự kể chuyện.',
    '3. Decode tay: `SFW{bouj_efch}` → **`REV{anti_dbg}`**.',
    '',
    '## B. ltrace — nhận diện anti-debug (★★)',
    '',
    '`ltrace ./challenge` → `ptrace(0, 0, 0, 0) = 0`. `0` = `PTRACE_TRACEME` — dấu hiệu anti-debug kinh điển. Binary không đọc input → dynamic hết đường → phải quay lại tĩnh. Biết **khi nào một đường cụt** cũng là kỹ năng.',
    '',
    '## C. gdb — chứng minh anti-debug (★★★)',
    '',
    '```',
    '$ gdb ./challenge',
    '(gdb) break ptrace',
    '(gdb) run',
    'Breakpoint 1, ptrace (requests=PTRACE_TRACEME, ...)',
    '```',
    '',
    'Đúng như đoán. Ở đời thật có thể patch ptrace call (Level 7!) hoặc LD_PRELOAD giả ptrace — nhưng decode chuỗi thì không cần.',
    '',
    '## Vì sao "SFW..." chứa flag?',
    '',
    'Vì author muốn bạn decode chứ không muốn grep: mã hóa +1 nhẹ nhàng để decoder chỉ là 1 vòng for. Trong CTF thật tầng mã hóa sâu hơn (XOR nhiều vòng, RC4...) — bản chất vẫn vậy: **thuật toán decode nằm trong binary, bạn chỉ cần đọc nó**.'
  ].join('\n'),

  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      '<b>Caesar mini</b> — shift ±1 từng chữ cái (giữ ký tự khác). Đây chính là decode của level:'));
    const row = RQC.el('div', 'field-row');
    row.appendChild(RQC.el('label', null, 'Text:'));
    const inp = RQC.el('input'); inp.type = 'text'; inp.value = 'SFW{bouj_efch}';
    row.appendChild(inp);
    const out = RQC.el('div', 'mono', '');
    out.style.cssText = 'color:var(--yellow);font-size:16px;margin:8px 0';
    container.appendChild(row);
    container.appendChild(out);
    function dec() {
      let s = '';
      for (const ch of inp.value) {
        const c = ch.codePointAt(0);
        if ((c >= 97 && c <= 122)) s += String.fromCharCode(c - 1 === 96 ? 122 : c - 1);
        else if (c >= 65 && c <= 90) s += String.fromCharCode(c - 1 === 64 ? 90 : c - 1);
        else s += ch;
      }
      out.textContent = '→ ' + s;
    }
    inp.addEventListener('input', dec);
    dec();
    container.appendChild(RQC.el('p', null, '<span style="color:var(--muted);font-size:13px">💡 Đây là Caesar shift −1. Challenge thật: bạn phải TỰ phát hiện điều đó bằng cách đọc hàm decode (sau khi rename!).</span>'));
  },

  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    const bin = RQC.binaries.level6;
    container.appendChild(RQC.el('p', null,
      'Chạy <code>./challenge</code> (chmod +x trước) — nó in chuỗi lạ, không in flag. ' +
      'RENAME vừa mở: chọn tab hàm trong listing → phím <b>N</b>. Đặt tên cho 2 hàm <code>sub_11xx</code> rồi đọc logic.'));

    RQC.Ghidra.workbench(container, {
      levelId: 6,
      bin: bin,
      api: api,
      pathsMeta: {}
    });

    RQC.Bus.on('tool-use', function (e) {
      if (e.level !== 6) return;
      if (e.tool === 'ltrace') api.creditPath('ltrace-path');
      if (e.tool === 'gdb') api.creditPath('gdb-path');
      if (e.tool === 'decompiler') api.creditPath('decomp-rename-path');
    });
    RQC.Bus.on('rename', function (e) {
      if (e.level === 6) { api.creditPath('decomp-rename-path'); api.trackTool('rename'); }
    });

    RQC.renderFlagSubmit(container, api, 6);
  }
});
