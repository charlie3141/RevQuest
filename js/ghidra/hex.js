/* ============================================================
 * RevQuest — ghidra/hex.js
 * Hex editor: xem byte (.text region từ bundle.hexDump), click byte
 * → sửa (patch). Patch lưu vào Store; binary run() đọc patch state
 * để đổi hành vi. Đây là "sửa binary thật".
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Ghidra.hex = function (container, binData, opts) {
    opts = opts || {};
    const levelId = opts.levelId;
    const base = (binData.hexDump && binData.hexDump.base) || 0x1160;
    const bytes = (binData.hexDump && binData.hexDump.bytes) || [];

    const wrap = RQ.el('div', 'gpanel hex-panel');
    wrap.appendChild(RQ.el('div', 'panel-title', 'HEX EDITOR — click 1 byte để patch'));
    const holder = RQ.el('div', 'panel-body hex-body');
    wrap.appendChild(holder);
    const note = RQ.el('div', 'panel-row hex-note', '');
    wrap.appendChild(note);
    container.appendChild(wrap);

    function effective(offset) {
      const addr = '0x' + (base + offset).toString(16);
      const patched = RQ.Patch.get(levelId)[addr];
      return { addr: addr, value: patched !== undefined ? parseInt(patched, 16) : bytes[offset], patched: patched !== undefined };
    }

    function render() {
      holder.innerHTML = '';
      for (let off = 0; off < bytes.length; off += 16) {
        const row = RQ.el('div', 'hex-row');
        row.appendChild(RQ.el('span', 'panel-addr', (base + off).toString(16).padStart(8, '0')));
        for (let b = 0; b < 16 && off + b < bytes.length; b++) {
          const eff = effective(off + b);
          const cell = RQ.el('span', 'hex-byte' + (eff.patched ? ' patched' : ''), eff.value.toString(16).padStart(2, '0'));
          cell.title = eff.addr + (eff.patched ? ' (đã patch từ ' + bytes[off + b].toString(16).padStart(2, '0') + ')' : '');
          cell.addEventListener('click', function () {
            const cur = prompt('Byte mới tại ' + eff.addr + ' (2 chữ số hex, vd 74):', eff.value.toString(16).padStart(2, '0'));
            if (cur === null) return;
            const v = cur.trim();
            if (!/^[0-9a-fA-F]{1,2}$/.test(v)) { RQ.toast('Byte phải là 1–2 chữ số hex.', 'toast-info'); return; }
            RQ.Patch.set(levelId, eff.addr, v.padStart(2, '0').toLowerCase());
            render();
            RQ.toast('🔨 Patched ' + eff.addr + ' → ' + v.padStart(2, '0') + '. Chạy lại <code>./challenge</code> để thấy thay đổi.', 'toast-info');
          });
          row.appendChild(cell);
        }
        const asc = [];
        for (let b = 0; b < 16 && off + b < bytes.length; b++) {
          const eff = effective(off + b);
          asc.push(eff.value >= 0x20 && eff.value < 0x7f ? String.fromCharCode(eff.value) : '.');
        }
        row.appendChild(RQ.el('span', 'hex-asc', asc.join('')));
        holder.appendChild(row);
      }
      const n = Object.keys(RQ.Patch.get(levelId)).length;
      note.innerHTML = n ? 'Đã patch <b>' + n + '</b> byte. <button class="btn btn-sm" id="unpatch-all">↺ undo tất cả</button>' :
        'Chưa patch byte nào. Offset quan trọng thường là lệnh JNE/JE (75/74) sau CALL strcmp.';
      const undo = holder.parentElement.querySelector('#unpatch-all') || note.querySelector('#unpatch-all');
      if (undo) undo.addEventListener('click', function () { RQ.Patch.clear(levelId); render(); });
    }

    render();
    // patch từ nguồn khác (vd run lại level) → vẽ lại
    RQ.Bus.on('patch', function (e) { if (e.level === levelId) render(); });
    return { render: render };
  };
})(window.RevQuest);
