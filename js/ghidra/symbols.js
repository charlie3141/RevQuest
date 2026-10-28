/* ============================================================
 * RevQuest — ghidra/symbols.js
 * Symbol tree: hàm + strings + data của binary. Click → nhảy.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Ghidra.symbols = function (container, binData, opts) {
    opts = opts || {};
    const wrap = RQ.el('div', 'gpanel symbols-panel');
    wrap.appendChild(RQ.el('div', 'panel-title', 'SYMBOL TREE'));
    const body = RQ.el('div', 'panel-body');
    wrap.appendChild(body);
    container.appendChild(wrap);

    const functions = (binData.ghidra && binData.ghidra.functions) || [];
    functions.forEach(function (fn) {
      const row = RQ.el('div', 'panel-row fn-row');
      row.innerHTML = '▸ <span class="tok-fn">' + RQ.esc(RQ.resolveName(fn.addr, fn.name)) + '</span> <span class="panel-addr">' + fn.addr.replace('0x', '') + '</span>';
      row.addEventListener('click', function () {
        if (opts.onSelectFunction) opts.onSelectFunction(fn);
        RQ.Bus.emit('xref-jump', { level: opts.levelId, to: fn.addr, from: 'symbols' });
      });
      body.appendChild(row);
    });

    // entry/imports giả lập cho cảm giác thật
    (binData.ghidra && binData.ghidra.imports || ['puts', 'printf', 'scanf', 'strcmp', 'ptrace']).forEach(function (imp) {
      body.appendChild(RQ.el('div', 'panel-row imp-row', '&nbsp;&nbsp;⤷ <span class="tok-dir">' + imp + '@plt</span>'));
    });

    return {};
  };
})(window.RevQuest);
