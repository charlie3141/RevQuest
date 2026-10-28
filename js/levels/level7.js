/* ============================================================
 * RevQuest — Level 7: Patcher
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 7,
  slug: 'patcher',
  title: 'Patcher',
  goal: 'Patch 1 byte trong binary để logic đảo ngược — password SAI lại được chấp nhận và in flag. Chạy lại binary qua pipe để xác nhận.',
  flag: 'REV{p4tch_th3_byt3}',

  unlockTools: ['hex'],
  paths: [
    { id: 'patch-path', tools: ['hex', 'exec'], badge: 'surgeon', stars: 3, desc: 'Hex editor: JNE (75) → JE (74) tại 0x11ff, chạy lại lấy flag.' },
    { id: 'strings-exec-path', tools: ['strings', 'exec'], badge: 'lazy_hacker', stars: 1, desc: 'strings thấy password "s3cr3t!x" — nhập đúng cũng ra flag (không cần patch).' },
    { id: 'decomp-path', tools: ['decompiler'], badge: 'reverse_engineer', stars: 2, desc: 'Pseudo-C chỉ đúng byte cần patch: opcode 75 tại 0x11ff.' }
  ],

  files: {
    'challenge': { type: 'elf', binaryKey: 'level7', mode: '0644' },
    'README': { type: 'file', content: 'Password sai → denied. Password đúng → flag (nếu tìm được).\nCách "nghề": PATCH binary để logic đảo ngược.\nTool mới: HEX EDITOR (panel trái). Click byte → sửa.\nMẹo: byte 0x75 = JNE, 0x74 = JE. Chỉ 1 byte cần đổi.' }
  },

  hints: [
    'Trong listing, sau CALL strcmp là TEST EAX,EAX rồi JNE — opcode 0x75 nằm tại địa chỉ 0x11ff. Hex editor (trái) cho click từng byte.',
    'Patch JNE (75) → JE (74): nhánh "không bằng" thành nhánh "bằng" — password SAI đi vào nhánh in flag. Tại 0x11ff trong hex editor đổi 75 thành 74. Rồi `chmod +x challenge`, `echo "wrong" | ./challenge`.',
    'Gần như đáp án: HEX panel → byte tại 0x11ff đang là 75 → click, gõ 74 → chạy `echo "wrong" | ./challenge` → "Access granted + flag". Đường thay thế: `strings challenge` tìm password thật (s3cr3t!x) rồi nhập đúng.'
  ],

  theory: [
    '# Level 7 — Patcher',
    '',
    '> **TL;DR:** Sau `test eax,eax`, một byte quyết định hướng: `75` = JNE (nhảy nếu khác), `74` = JE (nhảy nếu bằng). Đổi `75` → `74` trong hex editor là **đảo logic** mà không cần source. Patch → chạy lại → password sai được chấp nhận → flag. Đây là cách crack thực thập niên 90 — và vẫn dùng hôm nay (bypass license check).',
    '',
    '## 1. Byte nào là lệnh nhảy?',
    '',
    '```asm',
    'call strcmp        ; eax = 0 nếu bằng',
    'test eax, eax      ; đặt ZF theo eax',
    'jne denied         ; 75 12 — 2 byte: opcode 75 tại 0x11ff + offset 12',
    '```',
    '',
    'Opcode ngắn của jxx: `74`=JE, `75`=JNE, `7C`=JL, `7F`=JG... Chỉ khác nhau 1 bit (bit 0 = "not"). Đó là lý do crack = đổi đúng **1 byte**: 75↔74.',
    '',
    '## 2. Patch là công cụ, không chỉ là hack',
    '',
    'Ngoài bypass: NOP-out anti-debug (đổi `call ptrace` thành 5 byte `0x90`), sửa cỡ buffer, tắt lệnh nguy hiểm trong malware lab... Người RE patch để **thí nghiệm**: đổi nhánh rồi chạy lại xem hành vi — nhanh hơn đọc code cho những case đơn giản.',
    '',
    '## 3. Cách tìm byte cần sửa',
    '',
    'Đường 1: listing — tìm `CALL strcmp` → `TEST` → lệnh `JNE/JE` ngay sau → ghi địa chỉ + opcode. Đường 2: decompiler — pseudo-C chỉ rõ điều kiện `!= 0`. Đường 3: hex editor tìm pattern `85 c0` (test eax,eax) rồi byte kế tiếp. Trong game, HEX panel đã đặt sẵn bạn ngay đúng vùng .text.'
  ].join('\n'),

  solution: [
    '# Solution — Level 7',
    '',
    '## Con đường chính — patch 1 byte (★★★)',
    '',
    '1. LISTING: `CALL strcmp → TEST EAX,EAX → JNE 0x1213`. TEST chiếm `0x11fd–0x11fe`, nên opcode `75` của JNE nằm tại **0x11ff**.',
    '2. HEX EDITOR: click byte `75` tại 0x11ff → gõ `74`.',
    '3. `chmod +x challenge` (nếu chưa) rồi `echo "wrong" | ./challenge`:',
    '',
    '```',
    'password: ',
    'Access granted',
    'Flag: REV{p4tch_th3_byt3}',
    '```',
    '',
    '## Con đường thay thế — strings + exec (★)',
    '',
    '`strings challenge` → thấy luôn "Flag: REV{p4tch_th3_byt3}" VÀ password `"s3cr3t!x"` — nhập đúng password cũng được flag. Author đã lỡ để chuỗi literal. Level này minh họa: số đường tùy binary — game cho bạn chọn.',
    '',
    '## Vì sao patch hợp lệ ở đời thật?',
    '',
    'File ELF là dữ liệu; sửa dữ liệu không cần source. Nhưng có checksum/sigcheck? → patch kèm checksum. Có mã hóa section? → patch sau khi decrypt trong memory (gdb `set {char}0x11ff=0x74`). Mỗi phòng thủ sinh ra một kỹ thuật — và ngược lại.'
  ].join('\n'),

  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      '<b>Opcode jxx</b> — bảng opcode nhảy ngắn (đáng nhớ):'));
    const tbl = RQC.el('table', 'md');
    tbl.innerHTML = '<tr><th>Opcode</th><th>Lệnh</th><th>Nhảy khi</th></tr>' +
      [['74', 'JE', 'bằng (ZF=1)'], ['75', 'JNE', 'khác (ZF=0)'], ['7C', 'JL', 'nhỏ hơn'], ['7D', 'JGE', 'lớn hơn hoặc bằng'], ['7E', 'JLE', 'nhỏ hơn hoặc bằng'], ['7F', 'JG', 'lớn hơn']]
        .map(function (r) { return '<tr><td class="mono">' + r[0] + '</td><td class="mono">' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('');
    container.appendChild(tbl);
    container.appendChild(RQC.el('p', null, '<span style="color:var(--muted);font-size:13px">💡 74 và 75 chỉ khác bit 0 (bit "not") — vì thế crack đảo điều kiện = đổi 1 byte. Trên binary thật có thể phải patch cả dạng dài 0x0F 0x8x (6 byte).</span>'));
  },

  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    const bin = RQC.binaries.level7;
    container.appendChild(RQC.el('p', null,
      'HEX EDITOR mới mở (trái). Mục tiêu: patch sao cho password <b>sai</b> vẫn được chấp nhận. ' +
      'Rồi <code>chmod +x</code>, <code>echo "wrong" | ./challenge</code> để xác nhận, submit flag in ra. ' +
      '<span style="color:var(--muted)">(Đường dễ: thử strings — author để lộ password literal.)</span>'));

    RQC.Ghidra.workbench(container, {
      levelId: 7,
      bin: bin,
      api: api,
      pathsMeta: {}
    });

    RQC.Bus.on('tool-use', function (e) {
      if (e.level !== 7) return;
      if (e.tool === 'decompiler') api.creditPath('decomp-path');
    });
    RQC.Bus.on('patch', function (e) { if (e.level === 7) api.creditPath('patch-path'); });
    let usedStrings7 = false;
    RQC.Bus.on('command', function (e) { if (e.level === 7 && e.name === 'strings') usedStrings7 = true; });
    RQC.Bus.on('exec', function (e) {
      if (e.level === 7 && usedStrings7) api.creditPath('strings-exec-path');
    });

    RQC.renderFlagSubmit(container, api, 7);
  }
});
