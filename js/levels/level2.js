/* ============================================================
 * RevQuest — Level 2: Pipeline — strings | grep
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 2,
  slug: 'pipeline',
  title: 'Pipeline',
  goal: 'Blob nhị phân chứa hàng trăm dòng rác và 1 flag. Tìm flag bằng cách ghép lệnh qua pipe.',
  flag: 'REV{p1p3_3v3ryth1ng}',

  unlockTools: [],
  paths: [
    { id: 'pipe-path', tools: ['strings', 'grep'], badge: 'pipeline_master', stars: 3, desc: 'strings blob.bin | grep REV — Unix ghép công cụ nhỏ thành máy lớn.' },
    { id: 'eyes-path', tools: ['strings'], badge: 'lazy_hacker', stars: 1, desc: 'strings + mắt thường cuộn tìm. Chậm nhưng được badge an ủi.' }
  ],

  files: {
    'README': { type: 'file', content: 'blob.bin — dump dữ liệu của một app cũ (500 dòng rác).\nAi đó nói có "một thứ đáng giá" bên trong. `cat` thì đừng hòng.\nGợi ý: đọc man strings, rồi man grep. Ghép chúng bằng dấu |.' },
    'blob.bin': { type: 'binary', content: (function () {
      const junk = ['Xk9f2 data chunk 003f', 'runtime warning: segfault avoided', 'user=p0ly blob_id=8891',
        'cache line 0xFFAA dropped', 'LoRem ipSum dolor 0x3f', 'checksum=deadc0de padding',
        'sync ok 0x0044 west side', 'tmp file removed 0x31', 'network retry 7/3 expired',
        'heap fragment 0x33f1', 'mutex locked 0x77', 'gc pass 12 swept 4MB'];
      const lines = [];
      for (let i = 0; i < 120; i++) {
        lines.push(junk[i % junk.length] + ' #' + (1000 + i));
        if (i % 17 === 0) lines.push('\x00\x01\x02\x03\xff\xfe unprintable junk\x00\x7f');
      }
      lines.splice(61, 0, 'TODO: remove before ship REV{p1p3_3v3ryth1ng}');
      return lines.join('\n');
    })() }
  },

  hints: [
    'Pipe (|) gửi output lệnh trước thành input lệnh sau. Cặp bài trùng: `strings blob.bin` rút dòng chữ ra, `grep REV` lọc dòng chứa REV. Nhớ: grep với binary sẽ chỉ nói "Binary file matches" — phải strings trước.',
    'Gõ: strings blob.bin | grep REV. Nếu muốn thêm màu: thêm -n để grep hiện số dòng.',
    'Gần như đáp án: `strings blob.bin | grep REV` → thấy dòng TODO chứa flag. Khoan vội — thử cả `cat blob.bin | grep REV` để hiểu vì sao grep một mình không đủ.'
  ],

  theory: [
    '# Level 2 — Pipeline',
    '',
    '> **TL;DR:** Sức mạnh Unix nằm ở **pipe** `|`: output lệnh trước → input lệnh sau. `strings blob.bin` rút hàng trăm dòng text từ binary; nối `| grep REV` lọc đúng dòng cần. Mỗi công cụ làm 1 việc tốt — ghép lại thành pipeline mạnh.',
    '',
    '## 1. Pipe hoạt động thế nào?',
    '',
    '```c',
    '// trong shell, "a | b" nghĩa là:', '  // stdout của a → stdin của b',
    '// kernel dựng 1 pipe buffer, nối 2 process', '',
    'int fd[2];               // §1',
    'pipe(fd);                // §1  fd[0] đọc, fd[1] ghi',
    'if (fork() == 0) {       // §1  con: strings',
    '    dup2(fd[1], 1);      // §1  stdout → pipe',
    '    exec("strings...");  // §1',
    '}                        // §1',
    'dup2(fd[0], 0);          // §2  cha: grep, stdin ← pipe',
    'exec("grep REV");        // §2',
    '```',
    '',
    '```asm',
    'mov  dword ptr [rbp-0x10], 0    ; §1  fd[0] = 0',
    'mov  dword ptr [rbp-0xc], 0     ; §1',
    'lea  rax, [rbp-0x10]            ; §1',
    'mov  rdi, rax                   ; §1  pipe(int *fds)',
    'call pipe                       ; §1',
    'mov  eax, fd_w                  ; §2  stdin của grep',
    'mov  edi, eax                   ; §2',
    'call dup2                       ; §2  copy pipe → fd 0',
    '```',
    '',
    '## 2. Ba lệnh của level này',
    '',
    '- `strings FILE` — rút đoạn printable ≥4 byte. Đã thấy ở Level 1, giờ dùng với file KHÔNG phải ELF.',
    '- `grep PATTERN` — lọc dòng khớp. `-n` hiện số dòng, `-i` bỏ hoa/thường.',
    '- `|` — nối chúng lại.',
    '',
    '## 3. Vì sao grep một mình không đủ?',
    '',
    '`grep REV blob.bin` sẽ in đúng 1 dòng: `Binary file blob.bin matches` — grep thấy binary chỉ nói "có match", không in nội dung (tránh làm hỏng terminal bằng byte lạ). Vì thế phải **strings trước, grep sau**. Đây không phải hạn chế — đây là triết lý: mỗi tool một việc, ghép bằng pipe.'
  ].join('\n'),

  solution: [
    '# Solution — Level 2',
    '',
    '## Con đường A — pipe chuẩn (★★★)',
    '',
    '```',
    '$ strings blob.bin | grep REV',
    'TODO: remove before ship REV{p1p3_3v3ryth1ng}',
    '```',
    '',
    'strings rút ~250 dòng printable từ blob; grep giữ lại duy nhất dòng chứa "REV". 2 giây so với 5 phút cuộn tay.',
    '',
    '## Con đường B — strings + mắt (★)',
    '',
    '`strings blob.bin` không pipe, cuộn đọc. Vẫn ra flag — vẫn hợp lệ! Badge thấp hơn vì thời gian của bạn đáng giá hơn thế.',
    '',
    '## Thí nghiệm phụ (không bắt buộc, đáng làm)',
    '',
    '- `cat blob.bin | grep REV` → cat in rác nhét luôn ANSI/byte lạ; grep vẫn lọc được — nhắc bạn vì sao strings "sạch" hơn.',
    '- `grep REV blob.bin` → `Binary file blob.bin matches` — grep lịch sự với binary.',
    '- `strings blob.bin | grep -n REV` → kèm số dòng trong output strings.',
    '',
    '## Lesson meta',
    '',
    'Pipeline là kỹ năng chuyển nghề: `ps aux | grep postgres`, `cat log | grep error | wc -l`... Người giỏi Unix không nhớ lệnh dài — họ ghép lệnh ngắn.'
  ].join('\n'),

  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null, '<b>Thử nghiệm pipe</b> — terminal sandbox, gõ tự do hoặc bấm chip:'));
    const termWrap = RQC.el('div', 'demo-terminal');
    container.appendChild(termWrap);
    RQC.Terminal(termWrap, { levelId: -2, banner: '\x1b[1;32mpipe sandbox\x1b[0m — help để xem lệnh; blob không có ở đây, hãy phác thảo pipeline trước khi vào challenge.' });
    const chips = RQC.el('div', 'demo-chips');
    ['help', 'echo hello world', 'echo "many lines" | grep lines', 'printf "a\\nb\\nc"', 'history'].forEach(function (c) {
      const chip = RQC.el('button', 'chip cmd-chip', c);
      chip.addEventListener('click', function () {
        termWrap.querySelector('.term-input').value = c;
        termWrap.querySelector('.term-input').focus();
      });
      chips.appendChild(chip);
    });
    container.appendChild(chips);
  },

  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      'File <code>blob.bin</code> chứa ~120 dòng rác + đúng 1 dòng vàng. Dùng pipe. ' +
      'Terminal dưới đây chạy trong <code>~/challenges/level2</code>.'));

    const termWrap = RQC.el('div', 'demo-terminal dock');
    container.appendChild(termWrap);
    RQC.Terminal(termWrap, {
      levelId: 2,
      cwdParts: ['home', 'player', 'challenges', 'level2'],
      banner: 'Mẹo: strings blob.bin | grep REV — nhưng đừng tin lời tôi, đọc man trước.'
    });

    // track + credit path
    RQC.Bus.on('command', function (e) {
      if (e.level !== 2) return;
      api.trackTool(e.name);
    });
    let pipeStringsGrep = false, usedStrings = false;
    RQC.Bus.on('pipe', function () { pipeStringsGrep = true; });
    RQC.Bus.on('command', function (e) {
      if (e.level === 2 && e.name === 'strings') usedStrings = true;
    });
    RQC.Bus.on('flag-revealed', function () {});
    // credit khi output thực sự chứa flag (chạy đúng lệnh)
    const checkOut = function (outText) {
      if (/REV\{p1p3_3v3ryth1ng\}/.test(outText)) {
        api.creditPath(pipeStringsGrep && usedStrings ? 'pipe-path' : 'eyes-path');
        RQC.Bus.emit('flag-revealed', { path: pipeStringsGrep ? 'pipe-path' : 'eyes-path', level: 2 });
      }
    };
    // hook: theo dõi output — đơn giản: subscrib 'command' rồi setTimeout đọc .term-out
    RQC.Bus.on('command', function () {
      setTimeout(function () {
        const out = container.querySelector('.term-out');
        if (out) checkOut(out.innerText);
      }, 50);
    });

    RQC.renderFlagSubmit(container, api, 2);
  }
});
