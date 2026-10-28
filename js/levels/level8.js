/* ============================================================
 * RevQuest — Level 8: Automation — script console
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 8,
  slug: 'automation',
  title: 'Automation',
  goal: 'Binary in ra data mã hóa XOR 1-byte và có sẵn hàm decode nhưng không ai gọi. Brute-force 256 key bằng script console để tìm flag.',
  flag: 'REV{aut0m4t3_m3}',

  unlockTools: ['script'],
  paths: [
    { id: 'script-path', tools: ['script'], badge: 'automator', stars: 4, desc: 'Vòng for 256 key trong script console — máy làm việc thay bạn.' },
    { id: 'manual-path', tools: ['decompiler'], badge: 'reverse_engineer', stars: 3, desc: 'Đọc hexDump + converter Level 0: thử key bằng tay (chậm mà hiểu sâu).' }
  ],

  files: {
    'challenge': { type: 'elf', binaryKey: 'level8', mode: '0644' },
    'README': { type: 'file', content: 'challenge in ra "data: MZId~jk/r+k,@r,b" — data XOR 1 byte.\nHàm decode(data, key) có trong binary nhưng KHÔNG ai gọi, key cũng không nằm trong file.\n=> chỉ còn cách: brute-force 256 key.\nTool mới: SCRIPT CONSOLE (Python-subset, Ctrl+Enter để chạy).\nBuiltin có sẵn: bytes_of(str), xor_decode(str, key), startswith(str, prefix).' }
  },

  hints: [
    'Script console là Python thu nhỏ: gán biến, for x in range(256):, if startswith(...):, print(...). Lưu ý dòng trong for/if phải thụt 4 space. Flag luôn bắt đầu "REV{".',
    'Code mẫu: biến data = "MZId~jk/r+k,@r,b". Vòng lặp for k in range(256): → d = xor_decode(data, k) → if startswith(d, "REV{"): print(k, d). Ctrl+Enter chạy.',
    'Gần như đáp án — dán vào console:\n\ndata = "MZId~jk/r+k,@r,b"\nfor k in range(256):\n    d = xor_decode(data, k)\n    if startswith(d, "REV{"):\n        print("key =", k)\n        print(d)'
  ],

  theory: [
    '# Level 8 — Automation',
    '',
    '> **TL;DR:** Khi key là 1 byte (0–255), brute-force bằng tay là điều đại kỳ — viết vòng lặp 5 dòng để máy thử. Script console của game là Python-subset: `for`, `if`, `print`, và builtin decode. Tư tưởng: **mọi thao tác bạn làm tay 3 lần trở lên đều đáng viết script.**',
    '',
    '## 1. XOR — mã hóa kinh điển của CTF',
    '',
    '```c',
    'void decode(char *data, unsigned char key) {   // §1',
    '    for (int i = 0; data[i]; i++)              // §1',
    '        data[i] ^= key;                        // §1',
    '}                                              // §1',
    '```',
    '',
    '```asm',
    'xor al, dl        ; §1  1 lệnh — nhanh, đối xứng',
    '```',
    '',
    'XOR đối xứng: mã hóa = giải mã cùng 1 phép. Key 1 byte = 256 khả năng — thử hết trong mili-giây. Vết lộ: nếu biết plaintext prefix (`REV{`), key tìm ngay: `\'M\' ^ \'R\' = 0x1F`.',
    '',
    '## 2. K quan trọng hơn tool',
    '',
    'angr là symbolic execution — với constraint "output bắt đầu REV{" nó tự tìm key. Với XOR 1 byte, angr là dao mổ trâu... nhưng nguyên tắc giống script của bạn: **đặt điều kiện, để máy tìm**. Trong game, console hỗ trợ: gán, `for x in range(a,b):`, `if cond:`, `print`, và builtin `xor_decode/bytes_of/startswith`.',
    '',
    '## 3. Từ game sang đời thật',
    '',
    '```python',
    '# pwntools thật',
    'from pwn import *',
    'data = b"MZId~jk/r+k,@r,b"',
    'for k in range(256):',
    '    d = bytes(c ^ k for c in data)',
    '    if d.startswith(b"REV{"):',
    '        print(k, d)',
    '```',
    '',
    'Giống hệt script bạn sắp viết — chỉ đổi tên builtin. Sau 9 level này,pwntools là câu tiếp theo trong câu chuyện, không phải bức tường.'
  ].join('\n'),

  solution: [
    '# Solution — Level 8',
    '',
    '## Script console (★★★★)',
    '',
    'Dán vào console (Ctrl+Enter):',
    '',
    '```python',
    'data = "MZId~jk/r+k,@r,b"',
    'for k in range(256):',
    '    d = xor_decode(data, k)',
    '    if startswith(d, "REV{"):',
    '        print("key =", k)',
    '        print(d)',
    '```',
    '',
    'Output: `key = 31` (0x1F) và `REV{aut0m4t3_m3}`. Submit.',
    '',
    '## Tại sao key = 0x1F?',
    '',
    '`\'M\' (0x4D) ^ 0x1F = 0x52 = \'R\'`. Nhận ra prefix là cách rút ngắn: chỉ cần thử 1 key là thắng — vòng for 256 key là dạng tổng quát khi không biết prefix.',
    '',
    '## Đường tay (★★★)',
    '',
    'HEX panel/xxd thấy data; converter Level 0 thử: `M(4D) ^ ?? = R(52)` → ?? = 0x1F. Decode từng ký tự thủ công... được, mất ~5 phút. Cảm giác "tao có thể làm tay" là nguồn gốc của mọi script tốt: **hiểu tay trước, tự động sau**.',
    '',
    '## Bạn đã đi hết lộ trình',
    '',
    'hex/endian → terminal → pipeline → hidden compare → keygen → xref → CFG → anti-debug → rename → patch → automation. Ghép lại: bạn có đủ nền để mở Ghidra thật trên 1 crackme bất kỳ và tự đi đường của mình. Flag cuối: **REV{aut0m4t3_m3}** — chúc hunting vui vẻ. 🏴'
  ].join('\n'),

  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      '<b>Script sandbox</b> — học cú pháp console trước khi vào challenge. Builtin: <code>range</code>, <code>xor_decode(s,k)</code>, <code>startswith(s,p)</code>. Nhớ thụt 4 space trong for/if!'));
    const builtins = {
      range: function () { const args = Array.prototype.slice.call(arguments); const r = []; if (args.length === 1) { for (let i = 0; i < args[0]; i++) r.push(i); } else { for (let i = args[0]; i < args[1]; i++) r.push(i); } return r; },
      xor_decode: function (s, k) { let o = ''; for (const ch of String(s)) o += String.fromCharCode(ch.charCodeAt(0) ^ k); return o; },
      startswith: function (s, p) { return String(s).indexOf(p) === 0; },
      print: function () { return Array.prototype.slice.call(arguments).join(' '); }
    };
    const holder = RQC.el('div');
    container.appendChild(holder);
    RQC.ScriptConsole(holder, {
      levelId: -8,
      starter: 's = "Hello"\nfor i in range(3):\n    print(i, s)\n\n# xor demo: thử đoán key của "Jgnnq" (shift +2)\nprint(xor_decode("Jgnnq", 2))',
      builtins: builtins
    });
  },

  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    const bin = RQC.binaries.level8;
    container.appendChild(RQC.el('p', null,
      '<code>./challenge</code> chỉ in data mã hóa. DECODE hàm có nhưng chết trong binary. ' +
      'SCRIPT CONSOLE (dưới) brute-force 256 key — hoặc decode tay bằng converter ở Level 0/1.'));

    // workbench nhưng script console riêng để có builtins đầy đủ
    RQC.Ghidra.workbench(container, {
      levelId: 8,
      bin: bin,
      api: api,
      pathsMeta: {}
    });

    const builtins = {
      range: function () { const args = Array.prototype.slice.call(arguments); const r = []; if (args.length === 1) { for (let i = 0; i < args[0]; i++) r.push(i); } else { for (let i = args[0]; i < args[1]; i++) r.push(i); } return r; },
      xor_decode: function (s, k) { return bin.xorDecode(s, k); },
      startswith: function (s, p) { return String(s).indexOf(p) === 0; }
    };
    const holder = RQC.el('div');
    container.appendChild(holder);
    RQC.ScriptConsole(holder, {
      levelId: 8,
      pathId: 'script-path',
      starter: '# brute-force 256 key\ndata = "MZId~jk/r+k,@r,b"\nfor k in range(256):\n    d = xor_decode(data, k)\n    if startswith(d, "REV{"):\n        print("key =", k)\n        print(d)',
      builtins: builtins
    });

    RQC.Bus.on('tool-use', function (e) {
      if (e.level !== 8) return;
      if (e.tool === 'decompiler') api.creditPath('manual-path');
    });
    RQC.renderFlagSubmit(container, api, 8);
  }
});
