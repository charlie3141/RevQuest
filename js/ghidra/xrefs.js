/* ============================================================
 * RevQuest — ghidra/xrefs.js
 * Xrefs panel: "Xrefs to <addr/func>" — ai tham chiếu tới đây.
 * Click → nhảy listing. Nút Back (Esc) giữ history.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Ghidra.xrefs = function (container, binData, opts) {
    opts = opts || {};
    const wrap = RQ.el('div', 'gpanel xrefs-panel');
    wrap.appendChild(RQ.el('div', 'panel-title', 'XREFS'));
    const body = RQ.el('div', 'panel-body xrefs-body');
    wrap.appendChild(body);
    container.appendChild(wrap);

    const all = (binData.ghidra && binData.ghidra.xrefs) || {};
    const functions = (binData.ghidra && binData.ghidra.functions) || [];

    function fnNameOf(addr) {
      const fn = functions.find(function (f) {
        return (f.instructions || []).some(function (i) { return i.addr === addr; });
      });
      return fn ? RQ.resolveName(fn.addr, fn.name) : null;
    }

    /** hiển thị xrefs tới 1 địa chỉ (string/func/instr) */
    function show(targetAddr) {
      body.innerHTML = '';
      const froms = all[targetAddr] || [];
      body.appendChild(RQ.el('div', 'panel-row xref-target', 'Xrefs to <span class="panel-addr">' + targetAddr.replace('0x', '') + '</span>'));
      if (!froms.length) {
        body.appendChild(RQ.el('div', 'panel-row', '<span style="color:var(--muted)">(không có — đây là leaf, hoặc dữ liệu chưa dùng: red flag thú vị!)</span>'));
        return;
      }
      froms.forEach(function (from) {
        const row = RQ.el('div', 'panel-row xref-row');
        const fn = fnNameOf(from);
        row.innerHTML = '&nbsp;&nbsp;← ' + (fn ? '<span class="tok-fn">' + RQ.esc(fn) + '</span>+' : '') +
          ' <span class="panel-addr">' + from.replace('0x', '') + '</span>';
        row.addEventListener('click', function () {
          if (opts.onJump) opts.onJump(from);
          RQ.Store.data.global.xrefJumps++;
          RQ.Store.save();
          RQ.Bus.emit('xref-jump', { level: opts.levelId, to: from, from: 'xrefs-panel' });
        });
        body.appendChild(row);
      });
    }

    function updateForInstr(addr) {
      // tìm xref tới địa chỉ này; nếu không có, hiển thị target mà instr tham chiếu (xref from)
      if (all[addr]) { show(addr); return; }
      const instr = findInstr(addr);
      if (instr && instr.comment) {
        const m = instr.comment.match(/=> (0x[0-9a-fA-F]+)/);
        if (m && all[m[1]]) { show(m[1]); return; }
      }
      show(addr);
    }

    function findInstr(addr) {
      for (const f of functions) {
        const i = (f.instructions || []).find(function (x) { return x.addr === addr; });
        if (i) return i;
      }
      return null;
    }

    show(Object.keys(all)[0] || '0x00000000');
    return { show: show, updateForInstr: updateForInstr };
  };
})(window.RevQuest);
