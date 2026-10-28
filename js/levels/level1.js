/* ============================================================
 * RevQuest — Level 1: Binary ≠ Text
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 1,
  slug: 'binary-not-text',
  title: 'Binary ≠ Text',
  goal: 'Binary "challenge" không chịu nói chuyện. Tìm flag đang ẩn bên trong nó (bằng Strings panel hoặc Listing).',
  flag: 'REV{b1n4ry_n0t_t3xt}',

  unlockTools: ['strings-panel', 'listing'],
  paths: [
    { id: 'strings-panel-path', tools: ['strings-panel'], badge: 'lazy_hacker', stars: 1, desc: 'Click chuỗi trong Strings panel — cách nhanh nhất, và KHÔNG hề đáng xấu hổ.' },
    { id: 'listing-path', tools: ['listing'], badge: 'asm_peeker', stars: 2, desc: 'Đọc listing, thấy LEA tham chiếu chuỗi lạ — đi bằng mắt assembly.' }
  ],

  files: {
    'challenge': { type: 'elf', binaryKey: 'level1', mode: '0644' },
    'README': { type: 'file', content: 'challenge — chương trình "Secure Access".\nChạy được sau khi chmod +x. Nó KHÔNG in flag dù bạn nhập gì.\nNhưng flag phải nằm đâu đó trong file — chương trình chỉ là byte mà.' }
  },

  hints: [
    'File ELF = dãy byte. `cat` chỉ tốt với text. Nhưng chuỗi ký tự trong binary vẫn là dãy byte ASCII nằm liền nhau — công cụ `strings` (panel bên trái) rút chính những dãy đó ra.',
    'Mở panel STRINGS bên trái. Có 1 chuỗi trông rất "flag" (REV{...}). Click nó — panel sẽ nhảy listing tới chỗ binary tham chiếu chuỗi đó (xref).',
    'Gần như đáp án: click chuỗi REV{...} trong STRINGS panel → copy nội dung vào ô submit. Đường 2: trong LISTING chọn hàm check_password, dòng LEA có comment "=> 0x2040" trỏ thẳng tới flag.'
  ],

  theory: [
    '# Level 1 — Binary ≠ Text',
    '',
    '> **TL;DR:** Binary là dãy byte, không phải chữ. Nhưng bên trong nó, chuỗi ký tự vẫn là byte ASCII nằm liền nhau (kết thúc bằng `00`). Công cụ `strings` rút toàn bộ dãy ASCII dài ≥4 ra — và flag cố tình in ra màn hình hay không thì vẫn nằm trong file. **80% CTF entry-level chết ở đây.**',
    '',
    '## 1. Byte nào là chữ, byte nào là code?',
    '',
    '```c',
    'const char *PASSWORD = "REV{...}";   // §1',
    'int main() {                         // §2',
    '    puts("Access denied");           // §3',
    '}                                    // §2',
    '```',
    '',
    '```asm',
    'main:                        ; §2',
    '    lea rax, [rip+0xe7e]     ; §3  rax = địa chỉ chuỗi trong .rodata',
    '    mov rdi, rax             ; §3',
    '    call puts                ; §3',
    '    ret                      ; §2',
    '; --- .rodata (dữ liệu, không phải code) ---',
    '; 0x2030 "Access denied\\0"   ; §3',
    '; 0x2040 "REV{...}\\0"        ; §1  NẰM NGUYÊN TRONG FILE',
    '```',
    '',
    'Chuỗi không "chạy" — nó là **dữ liệu** nằm trong section `.rodata`, đúng byte đó, đúng thứ tự đó. `cat` nó ra sẽ thành rác vì giữa các chuỗi là byte code/địa chỉ không in được. `strings` chỉ làm 1 việc: đi qua file, gom các đoạn byte in được liên tiếp dài ≥4, in ra — nhưng chính vậy là đủ thấy flag.',
    '',
    '## 2. Vì sao đây là kỹ năng thật?',
    '',
    'Nhiều binary thật (game, firmware, app) để lại mật khẩu mặc định, URL API private, key bug-tracker… dạng chuỗi. Pentester chạy `strings` **trước tiên** trên mọi file lạ. Ghidra có sẵn panel Strings — vì nó quan trọng đến mức là 1 view riêng.',
    '',
    '## 3. Interaction loop đầu tiên',
    '',
    'Mở STRINGS panel → thấy chuỗi khả nghi `REV{...}` → **click** → panel nhảy listing tới lệnh `LEA` tham chiếu nó (xref) → đọc tên hàm chứa lệnh đó. Notice → jump → understand — bạn vừa làm đúng loop sẽ lặp lại suốt sự nghiệp.'
  ].join('\n'),

  solution: [
    '# Solution — Level 1',
    '',
    '## ≥2 con đường — game này không có "lối đi duy nhất"',
    '',
    '### Đường A — Strings panel (★☆☆☆☆)',
    '',
    '1. Panel **STRINGS** bên trái: 4 chuỗi. Ba chuỗi đầu là noise (2 cái main in ra + 1 red herring "Access granted").',
    '2. Chuỗi `REV{b1n4ry_n0t_t3xt}` — format flag đúng ngay lập tức. Click → copy → submit. Xong.',
    '3. Click còn nhảy listing tới `0x00001168` — lệnh **LEA** trong hàm `check_password` nạp địa chỉ chuỗi. Đó là xref: *ai dùng chuỗi này?*',
    '',
    '### Đường B — Listing / asm (★★☆☆☆)',
    '',
    '1. Không thèm đọc strings? Chuyển tab listing sang hàm `check_password`.',
    '2. Dòng `LEA RAX,[rip + 0xed1]` có comment `=> 0x2040 "REV{b1n4ry_n0t_t3xt}"` — comment này Ghidra tự sinh từ xref.',
    '3. `CALL puts` ngay sau → hàm này **in flag**. Nhưng ai gọi check_password? → không ai cả. Dead code giữ flag — pattern phổ biến trong challenge "nó không in flag dù nhập gì".',
    '',
    '### Đường C — Terminal (dạy cách xin lỗi của bash)',
    '',
    '- `cat challenge` → *"binary file — thử strings hoặc xxd"*. Đường này không ra flag nhưng dạy bạn nhận diện ELF.',
    '- `./challenge` → *Permission denied* → `chmod +x challenge` → `./challenge` → chỉ in banner + Access denied. Cả 1 bài học: hành vi runtime không cho biết binary chứa gì.',
    '',
    '## Vì sao flag "an toàn" trong source lại lộ?',
    '',
    'Compiler chép **toàn bộ** chuỗi literal vào `.rodata`, kể cả của hàm không được gọi — vì linker tách code/data theo hàm nhưng không xoá hàm "chưa ai xài" (chỉ `-O2` + static mới làm). Người RE không cần chạy chương trình; họ đọc xác chết của nó.'
  ].join('\n'),

  /* ---------------- DEMO: hex↔text explorer ---------------- */
  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      '<b>Byte explorer</b> — gõ text, xem nó thành byte hex như trong file. Dấu \\x00 là "vách ngăn" mà strings dùng để tách chuỗi.'));

    const row = RQC.el('div', 'field-row');
    row.appendChild(RQC.el('label', null, 'Text:'));
    const inp = RQC.el('input');
    inp.type = 'text';
    inp.value = 'REV{demo}\x00Access denied\x00\x1bELF garbage';
    inp.style.flex = '1';
    row.appendChild(inp);
    container.appendChild(row);

    const hexBox = RQC.el('div', 'demo-box');
    hexBox.appendChild(RQC.el('div', 'demo-title', 'Hex bytes (như xxd sẽ thấy)'));
    const hexOut = RQC.el('div', 'hex-demo mono');
    hexBox.appendChild(hexOut);
    container.appendChild(hexBox);

    const stringsBox = RQC.el('div', 'demo-box');
    stringsBox.appendChild(RQC.el('div', 'demo-title', 'strings sẽ rút ra (đoạn in được ≥4 byte)'));
    const stringsOut = RQC.el('div', 'hex-demo mono');
    stringsBox.appendChild(stringsOut);
    container.appendChild(stringsBox);

    function render() {
      const bytes = [];
      for (const ch of inp.value) {
        const c = ch.codePointAt(0);
        if (c > 255) bytes.push(0x3f); else bytes.push(c);
      }
      hexOut.innerHTML = '';
      const rows = [];
      for (let i = 0; i < bytes.length; i += 8) {
        const slice = bytes.slice(i, i + 8);
        const hexPart = slice.map(function (b) { return b.toString(16).padStart(2, '0'); }).join(' ');
        const ascPart = slice.map(function (b) { return (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '·'; }).join('');
        rows.push('<span class="hd-off">' + i.toString(16).padStart(4, '0') + '</span>  ' +
          RQC.esc(hexPart.padEnd(23)) + ' <span class="hd-asc">|' + RQC.esc(ascPart) + '|</span>');
      }
      hexOut.innerHTML = rows.join('<br>');

      // strings: runs of printable >= 4
      const runs = [];
      let cur = '';
      for (const b of bytes) {
        if (b >= 0x20 && b < 0x7f) cur += String.fromCharCode(b);
        else { if (cur.length >= 4) runs.push(cur); cur = ''; }
      }
      if (cur.length >= 4) runs.push(cur);
      stringsOut.innerHTML = runs.length
        ? runs.map(function (r) { return '<div class="string-value">"' + RQC.esc(r) + '"</div>'; }).join('')
        : '(không có đoạn nào dài ≥4 — strings bỏ hết)';
    }
    inp.addEventListener('input', render);
    render();

    container.appendChild(RQC.el('p', null, '<span style="color:var(--muted);font-size:13px">💡 Thử gõ flag của Level 0 rồi thêm \\x00 ở giữa — strings vẫn rút được. Giờ hiểu vì sao mọi binary đều "nói chuyện" được.</span>'));
  },

  /* ---------------- CHALLENGE ---------------- */
  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    const bin = RQC.binaries.level1;

    container.appendChild(RQC.el('p', null,
      'Trong thư mục có file <code>challenge</code>. Terminal nói nó là ELF, chạy nó thì nó chối bỏ mọi thứ. ' +
      'Hai panel vừa mở khóa: <b>STRINGS</b> (trái) và <b>LISTING</b> (giữa) — cùng nhìn 1 file, 2 cách. Flag nằm trong file.'));

    // ---- ghidra layout
    const grid = RQC.el('div', 'ghidra-grid');
    const leftCol = RQC.el('div', 'ghidra-left');
    const centerCol = RQC.el('div', 'ghidra-center');
    const rightCol = RQC.el('div', 'ghidra-right');
    grid.appendChild(leftCol);
    grid.appendChild(centerCol);
    grid.appendChild(rightCol);
    container.appendChild(grid);

    // strings panel — click chuỗi flag → credit đường strings-panel-path
    RQC.Ghidra.stringsPanel(leftCol, bin, {
      levelId: 1,
      pathId: 'strings-panel-path',
      onJump: function (xrefAddr, s) { listing.jumpTo(xrefAddr); }
    });

    // listing — click dòng LEA tham chiếu flag → credit đường listing-path
    const listing = RQC.Ghidra.listing(centerCol, bin, {
      levelId: 1,
      onSelect: function (instr) {
        if (instr.comment && instr.comment.indexOf('REV{') !== -1) {
          api.creditPath('listing-path');
          RQC.Bus.emit('flag-revealed', { path: 'listing-path', level: 1, value: instr.comment });
        }
      }
    });

    // locked tools preview (Metroidvania)
    const locked = RQC.el('div', 'gpanel locked-panel');
    locked.appendChild(RQC.el('div', 'panel-title', 'TOOLS SẮP MỞ'));
    RQC.TOOLS.forEach(function (t) {
      if (t.id === 'terminal' || t.id === 'strings-panel' || t.id === 'listing') return;
      const unlocked = RQC.toolUnlocked(t.id);
      locked.appendChild(RQC.el('div', 'panel-row tool-row' + (unlocked ? '' : ' tool-locked'),
        '<span class="panel-addr">L' + t.baseLevel + '</span> ' + (unlocked ? '🔓' : '🔒') + ' ' + RQC.esc(t.name)));
    });
    leftCol.appendChild(locked);

    // terminal dock
    const termWrap = RQC.el('div', 'demo-terminal dock');
    container.appendChild(termWrap);
    RQC.Terminal(termWrap, {
      levelId: 1,
      cwdParts: ['home', 'player', 'challenges', 'level1'],
      bin: bin,
      banner: 'Thử: file challenge, cat challenge, ./challenge — mỗi cái dạy 1 điều.'
    });

    RQC.Bus.on('command', function (e) {
      if (e.level === 1) api.trackTool(e.name);
    });
    // sự kiện "nhìn thấy flag" từ panel → credit đường đã đi
    RQC.Bus.on('flag-revealed', function (e) {
      if (e.level === 1 && e.path) api.creditPath(e.path);
    });

    RQC.renderFlagSubmit(container, api, 1);
  }
});
