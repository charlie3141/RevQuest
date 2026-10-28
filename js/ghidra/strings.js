/* ============================================================
 * RevQuest — ghidra/strings.js
 * Strings panel: các chuỗi ASCII tĩnh trong binary (addr + value).
 * Click 1 chuỗi → nhảy listing tới xref (lệnh tham chiếu nó).
 * Đây là công cụ RE "dễ nhất thế giới" — và đôi khi là đủ.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Ghidra.stringsPanel = function (container, binData, opts) {
    opts = opts || {};
    const wrap = RQ.el('div', 'gpanel strings-panel');
    wrap.appendChild(RQ.el('div', 'panel-title', 'STRINGS (' + ((binData.ghidra && binData.ghidra.strings) || []).length + ')'));
    const list = RQ.el('div', 'panel-body');
    wrap.appendChild(list);
    container.appendChild(wrap);

    const strings = (binData.ghidra && binData.ghidra.strings) || [];
    strings.forEach(function (s) {
      const row = RQ.el('div', 'panel-row string-row');
      row.title = s.xrefs && s.xrefs.length
        ? 'XREF từ ' + s.xrefs.join(', ') + ' — click để nhảy'
        : '(không có tham chiếu)';
      row.appendChild(RQ.el('span', 'panel-addr', s.addr.replace('0x', '')));
      row.appendChild(RQ.el('span', 'string-value', '"' + RQ.esc(s.value) + '"'));
      row.addEventListener('click', function () {
        const xref = s.xrefs && s.xrefs[0];
        RQ.Bus.emit('string-click', { addr: s.addr, value: s.value, level: opts.levelId });
        if (s.flag) {
          RQ.Bus.emit('flag-revealed', { path: opts.pathId || 'strings-panel', level: opts.levelId, value: s.value });
        }
        if (xref && opts.onJump) {
          opts.onJump(xref, s);
          RQ.Store.data.global.xrefJumps++;
          RQ.Store.save();
          RQ.Bus.emit('xref-jump', { level: opts.levelId, from: 'strings', to: xref });
        }
      });
      list.appendChild(row);
    });
    return {};
  };
})(window.RevQuest);
