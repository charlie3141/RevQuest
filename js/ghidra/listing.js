/* ============================================================
 * RevQuest — ghidra/listing.js
 * Disassembly viewer (Ghidra listing): address | bytes | mnemonic operands
 * - Click dòng → select (Bus 'listing-select')
 * - jumpTo(addr) → scroll + flash (dùng bởi strings/xref/…)
 * - '/' tìm kiếm mnemonic/operand
 * Dữ liệu pre-computed từ bundle (ghidra.functions[].instructions).
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  const MNEM_RE = /^([A-Z][A-Z0-9.]*)\s*(.*)$/;

  RQ.Ghidra = RQ.Ghidra = {};

  function renderInstr(instr) {
    const m = (instr.mnemonic + ' ' + (instr.operands || '')).match(MNEM_RE);
    const mnem = m ? m[1] : instr.mnemonic;
    const ops = m ? m[2] : (instr.operands || '');
    const row = RQ.el('div', 'lst-row');
    row.dataset.addr = instr.addr;

    const addr = RQ.el('span', 'lst-addr', instr.addr.replace('0x', ''));
    const bytes = RQ.el('span', 'lst-bytes', RQ.esc(instr.bytes || ''));
    const body = RQ.el('span', 'lst-body');
    body.innerHTML = '<span class="tok-mnem">' + RQ.esc(mnem) + '</span>' +
      (ops ? ' <span class="lst-ops">' + highlightOperands(ops) + '</span>' : '');
    if (instr.comment) {
      body.appendChild(RQ.el('span', 'lst-comment', ' ' + RQ.esc(instr.comment)));
    }
    row.appendChild(addr); row.appendChild(bytes); row.appendChild(body);
    return row;
  }

  /** tô operand: register, immediate, [memory], string ref */
  function highlightOperands(ops) {
    return RQ.esc(ops)
      .replace(/(\[[^\]]*\])/g, '<span class="tok-mem">$1</span>')
      .replace(/(0x[0-9a-fA-F]+)/g, '<span class="tok-num">$1</span>')
      .replace(/(^|[\s,])([a-z][a-z0-9]{1,3})(?=[\s,]|$)/g, '$1<span class="tok-reg">$2</span>')
      .replace(/(&lt;[^&]*&gt;)/g, '<span class="tok-fn">$1</span>');
  }

  RQ.Ghidra.listing = function (container, binData, opts) {
    opts = opts || {};
    const wrap = RQ.el('div', 'listing');
    const funcTabs = RQ.el('div', 'listing-functabs');
    const body = RQ.el('div', 'listing-body');
    wrap.appendChild(funcTabs);
    wrap.appendChild(body);
    container.appendChild(wrap);

    const functions = (binData.ghidra && binData.ghidra.functions) || [];
    let current = null;
    let searchMode = false;

    function selectFunction(f) {
      current = f;
      funcTabs.innerHTML = '';
      functions.forEach(function (fn) {
        const t = RQ.el('button', 'listing-functab' + (fn === current ? ' active' : ''),
          RQ.esc(RQ.resolveName(fn.addr, fn.name)));
        t.addEventListener('click', function () { selectFunction(fn); });
        funcTabs.appendChild(t);
      });
      render();
      RQ.Bus.emit('tool-open', { tool: 'listing', level: opts.levelId });
    }

    function render() {
      body.innerHTML = '';
      const header = RQ.el('div', 'lst-funcheader',
        RQ.esc(RQ.resolveName(current.addr, current.name)) + '():');
      body.appendChild(header);
      (current.instructions || []).forEach(function (instr) {
        const row = renderInstr(instr);
        row.addEventListener('click', function () {
          body.querySelectorAll('.lst-row.selected').forEach(function (r) { r.classList.remove('selected'); });
          row.classList.add('selected');
          RQ.Bus.emit('listing-select', { addr: instr.addr, fn: current.name, level: opts.levelId });
          if (opts.onSelect) opts.onSelect(instr, current);
        });
        body.appendChild(row);
      });
    }

    function jumpTo(addr) {
      // tìm trong hàm hiện tại trước; không có thì chuyển hàm chứa addr
      let row = body.querySelector('.lst-row[data-addr="' + addr + '"]');
      if (!row) {
        const fn = functions.find(function (f) {
          return (f.instructions || []).some(function (i) { return i.addr === addr; });
        });
        if (!fn) return false;
        selectFunction(fn);
        row = body.querySelector('.lst-row[data-addr="' + addr + '"]');
      }
      if (!row) return false;
      body.querySelectorAll('.lst-row.selected').forEach(function (r) { r.classList.remove('selected'); });
      row.classList.add('selected', 'jump-flash');
      row.scrollIntoView({ block: 'center' });
      setTimeout(function () { row.classList.remove('jump-flash'); }, 1600);
      return true;
    }

    function search(term) {
      const rows = Array.prototype.slice.call(body.querySelectorAll('.lst-row'));
      const idx = rows.findIndex(function (r) {
        return r.textContent.toLowerCase().indexOf(term.toLowerCase()) !== -1;
      });
      if (idx !== -1) {
        rows[idx].click();
        rows[idx].scrollIntoView({ block: 'center' });
        return true;
      }
      return false;
    }

    // phím '/' tìm trong listing, Esc thoát
    document.addEventListener('keydown', function (e) {
      if (!wrap.offsetParent) return; // panel đang ẩn
      if (e.key === '/' && !searchMode) {
        e.preventDefault();
        searchMode = true;
        const q = prompt('Tìm trong listing (mnemonic/operand/addr):');
        searchMode = false;
        if (q) {
          const found = search(q.trim());
          if (!found) RQ.toast('Không tìm thấy "' + RQ.esc(q) + '" trong hàm này.', 'toast-info');
          if (!RQ.Store.data.global.shortcutsSeen['/']) {
            RQ.Store.data.global.shortcutsSeen['/'] = 1;
            RQ.Store.save();
            RQ.toast('💡 <b>/</b> — dân RE tìm trong listing hàng trăm lần/ngày. Đây là phím tắt của bạn từ giờ.', 'toast-badge');
          }
        }
      }
    });

    if (functions.length) selectFunction(functions[0]);
    return { jumpTo: jumpTo, selectFunction: selectFunction, search: search };
  };
})(window.RevQuest);
