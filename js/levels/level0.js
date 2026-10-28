/* ============================================================
 * RevQuest — Level 0: Làm quen Linux
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 0,
  slug: 'linux-basics',
  title: 'Làm quen Linux',
  goal: 'Dùng terminal tìm file flag.txt trong ~/challenges/level0 và đọc được flag bên trong.',
  flag: 'REV{sh3ll_1s_h0me}',

  unlockTools: [],
  paths: [
    { id: 'terminal-path', tools: ['ls', 'cat'], badge: 'shell_novice', stars: 1, desc: 'Tìm thấy flag bằng ls + cat — đúng cách học Unix: nhìn, đọc, hiểu.' }
  ],

  files: {
    'welcome.txt': { type: 'file', content: 'Đây là thư mục làm việc của bạn.\nLệnh hữu ích: ls (liệt kê), cd (chuyển thư mục), cat (đọc file), file (nhận diện loại).\nGõ help để xem tất cả. Flag nằm ở đâu đó trong đây — ls là người bạn đầu tiên.\n' },
    'notes': { type: 'dir' },
    'notes/flag.txt': { type: 'file', content: 'REV{sh3ll_1s_h0me}\n' },
    'notes/todo.md': { type: 'file', content: '- [x] cài Linux\n- [ ] học RE\n- [ ] CTF top 1\n' },
    'junk.log': { type: 'file', content: '2026-10-28 09:14 login ok\n2026-10-28 09:15 failed login from 10.0.0.7\n2026-10-28 09:16 login ok\n' }
  },

  hints: [
    'Terminal ở dưới chính là tay chân của bạn. `ls` liệt kê file trong thư mục hiện tại; thấy thư mục (màu xanh) thì `cd <tên>` để chui vào; thấy file thường thì `cat <tên>` để đọc.',
    '`ls` cho thấy có thư mục `notes/`. Thử `cd notes` rồi `ls` lại. File thường in màu trắng, thư mục in màu xanh dương.',
    'Gần như đáp án: `cd notes` rồi `cat flag.txt` — nội dung chính là flag, dán vào ô submit.'
  ],

  theory: [
    '# Level 0 — Làm quen Linux',
    '',
    '> **TL;DR:** RE bắt đầu từ terminal, không phải từ Ghidra. Filesystem là **cây**: `/` là gốc, `~` là nhà bạn (`/home/player`). `ls` nhìn quanh, `cd` di chuyển, `cat` đọc file, `file` nhận diện loại file. Lệnh đúng → im lặng; lệnh sai → bash nói chuyện với bạn. Đọc tin nhắn của nó — mỗi lỗi là một chỉ dẫn.',
    '',
    '## 1. Shell là tay chân của hacker',
    '',
    'Shell (bash) nhận lệnh chữ và trả kết quả chữ. Không chuột, không icon — nhưng nó chạy được ở mọi nơi (SSH server không có màn hình), ghi script được, và **mọi công cụ RE đều là lệnh**: `strings`, `objdump`, `gdb`… Học shell trước = học ngôn ngữ chung của cả nghề.',
    '',
    '## 2. Cây thư mục & đường dẫn',
    '',
    '```',
    '/                     ← gốc (root)',
    '└── home/player       ← ~  (nhà bạn)',
    '    ├── README.txt',
    '    └── challenges/   ← nơi chứa bài tập',
    '        └── level0/   ← bạn đang ở đây',
    '```',
    '',
    '- Đường dẫn **tuyệt đối** bắt đầu bằng `/`: `/home/player/README.txt`',
    '- Đường dẫn **tương đối** tính từ chỗ đứng: `notes/flag.txt`, `..` lùi 1 cấp',
    '',
    '## 3. C mà bạn sẽ RE (làm quen trước)',
    '',
    'Mọi chương trình Linux đều bắt đầu kiểu này:',
    '',
    '```c',
    '#include <stdio.h>        // §1',
    'int main() {              // §1',
    '    printf("hello\\n");    // §2',
    '    return 0;             // §3',
    '}                         // §1',
    '```',
    '',
    '```asm',
    'main:                     ; §1',
    '    push rbp              ; §1  khung hàm — gặp ở mọi binary',
    '    mov  rbp, rsp         ; §1',
    '    lea  rdi, [rip+str]   ; §2  rdi = địa chỉ chuỗi "hello"',
    '    call puts             ; §2  in ra',
    '    mov  eax, 0           ; §3  return 0',
    '    ret                   ; §3',
    '```',
    '',
    'Sau khi `gcc` dịch, file C này thành **ELF binary** — khối byte mà Level 1 sẽ dạy bạn nhìn. Nhưng trước tiên: gõ vài lệnh cho tay quen.'
  ].join('\n'),

  solution: [
    '# Solution — Level 0',
    '',
    '## Con đường duy nhất (và đủ)',
    '',
    '```',
    'player@revquest:~$ cd challenges/level0',
    'player@revquest:~/challenges/level0$ ls',
    'junk.log  notes  welcome.txt',
    'player@revquest:~/challenges/level0$ cd notes',
    'player@revquest:~/challenges/level0/notes$ ls',
    'flag.txt  todo.md',
    'player@revquest:~/challenges/level0/notes$ cat flag.txt',
    'REV{sh3ll_1s_h0me}',
    '```',
    '',
    '## Vì sao từng bước',
    '',
    '- `ls` đầu tiên **không** hiện `flag.txt` — vì nó nằm trong `notes/`. Lesson: flag hiếm khi nằm ở chỗ đầu tiên bạn nhìn. `ls` chỉ nhìn thấy 1 cấp.',
    '- `cd notes` đổi thư mục hiện hành; prompt đổi theo (`~/challenges/level0/notes`) — **đọc prompt**, nó nói cho bạn biết bạn đang đứng đâu.',
    '- `cat flag.txt` in nội dung. File `.txt` là text — `cat` là đúng công cụ.',
    '',
    '## Lesson meta',
    '',
    'Bạn vừa trải quy trình RE thu nhỏ: **nhìn (ls) → đi theo manh mối (cd) → mở mục tiêu (cat)**. Từ Level 1 trở đi, "nhìn quanh" là Strings panel, "đi theo manh mối" là xref, "mở mục tiêu" là đọc decompiler. Cùng một loop, công cụ khác biệt.'
  ].join('\n'),

  /* ---------------- DEMO: playground terminal ---------------- */
  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      '<b>Sân chơi</b> — không có challenge, chỉ làm quen. Bấm chip lệnh để điền vào terminal rồi Enter. Gõ gì cũng được, sai cũng học được.'));

    const termWrap = RQC.el('div', 'demo-terminal');
    container.appendChild(termWrap);
    const term = RQC.Terminal(termWrap, {
      levelId: -1, // demo — không tính vào progress level
      banner: '\x1b[1;32mRevQuest sandbox\x1b[0m — thử: ls, cd notes, cat welcome.txt, file junk.log, ls -l, strigns (typo cố ý!)'
    });

    const chips = RQC.el('div', 'demo-chips');
    ['ls', 'ls -l', 'cd notes', 'cat welcome.txt', 'cat todo.md', 'file junk.log', 'ls -a', 'cd ..', 'help', 'history'].forEach(function (cmd) {
      const chip = RQC.el('button', 'chip cmd-chip', cmd);
      chip.addEventListener('click', function () {
        const input = termWrap.querySelector('.term-input');
        input.value = cmd;
        input.focus();
      });
      chips.appendChild(chip);
    });
    container.appendChild(chips);
    container.appendChild(RQC.el('p', null, '<span style="color:var(--muted);font-size:13px">💡 Lệnh thành công thì IM LẶNG (cd, chmod) — nếu thấy "Success!" nghĩa là bạn đang dùng giả mạo. Terminal này nói như bash thật.</span>'));
  },

  /* ---------------- CHALLENGE ---------------- */
  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      'Flag nằm trong 1 file nào đó dưới đây. <b>Dùng terminal</b> để tìm và đọc nó, rồi dán vào ô submit. Bạn đang ở <code>~/challenges/level0</code>.'));

    const termWrap = RQC.el('div', 'demo-terminal');
    container.appendChild(termWrap);
    RQC.Terminal(termWrap, {
      levelId: 0,
      cwdParts: ['home', 'player', 'challenges', 'level0'],
      banner: 'player@revquest — type \x1b[1mhelp\x1b[0m nếu bí.'
    });

    // track tool usage: mỗi lệnh ls/cat trong level này
    RQC.Bus.on('command', function (e) {
      if (e.level === 0) api.trackTool(e.name);
    });
    // credit path khi cat thấy flag.txt
    RQC.Bus.on('command', function (e) {
      if (e.level === 0 && e.name === 'cat') {
        const arg = (e.args || [])[0] || '';
        if (arg.indexOf('flag') !== -1) {
          api.creditPath('terminal-path');
          RQC.Bus.emit('flag-revealed', { path: 'terminal-path', level: 0 });
        }
      }
    });

    renderFlagSubmit(container, api, 0);
  }
});

/* ---- flag submit dùng chung (các level sau tái dùng) ---- */
function renderFlagSubmit(container, api, levelId) {
  const RQC = window.RevQuest;
  const row = RQC.el('div', 'field-row flag-submit');
  row.appendChild(RQC.el('label', null, 'Flag:'));
  const input = RQC.el('input');
  input.type = 'text';
  input.placeholder = 'REV{...}';
  input.style.flex = '1';
  input.spellcheck = false;
  row.appendChild(input);
  const btn = RQC.el('button', 'btn btn-primary', '✓ Submit flag');
  row.appendChild(btn);
  container.appendChild(row);

  function submit() {
    const val = input.value.trim();
    RQC.Bus.emit('flag-submitted', { level: levelId, ok: val === api.level.flag });
    const rec = RQC.Store.ensureLevel(levelId);
    if (val === api.level.flag) {
      rec.solvedVia = rec.creditedPaths.slice();
      RQC.Store.save();
      api.pass();
    } else if (!val) {
      api.fail('Chưa nhập gì cả — tìm flag trước đã.');
    } else if (val.indexOf('REV{') !== 0 || val[val.length - 1] !== '}') {
      api.fail('Format flag là <code>REV{...}</code> — chữ REV, ngoặc nhọn, không có space. Flag bạn nhập không đúng format.');
    } else {
      api.fail('Flag <code>' + RQC.esc(val) + '</code> sai. Nội dung đúng phải trích từ chính target — đọc lại bằng công cụ, đừng đoán.');
    }
  }
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
}
window.RevQuest.renderFlagSubmit = renderFlagSubmit;
