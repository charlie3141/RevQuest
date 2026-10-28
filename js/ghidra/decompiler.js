/* ============================================================
 * RevQuest — ghidra/decompiler.js
 * Pseudo-C viewer. Cross-highlight qua cMap (C-line ↔ asm-address):
 * click dòng C → listing nhảy; listing select → dòng C sáng.
 * Giữ "xấu" có chủ đích: undefined8, uVar1, local_20, in_RAX.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Ghidra.decompiler = function (container, binData, opts) {
    opts = opts || {};
    const wrap = RQ.el('div', 'gpanel decomp-panel');
    wrap.appendChild(RQ.el('div', 'panel-title', 'DECOMPILED (pseudo-C)'));
    const body = RQ.el('div', 'panel-body decomp-body');
    wrap.appendChild(body);
    container.appendChild(wrap);

    const functions = (binData.ghidra && binData.ghidra.functions) || [];
    let current = null;
    let lineEls = [];

    function show(fn) {
      current = fn;
      body.innerHTML = '';
      lineEls = [];
      wrap.querySelector('.panel-title').textContent =
        'DECOMPILED — ' + RQ.resolveName(fn.addr, fn.name) + '()';
      const lines = (fn.decomp || '').split('\n');
      const cMap = fn.cMap || [];
      lines.forEach(function (text, i) {
        const map = cMap.find(function (m) { return m.line === i + 1; });
        const el = RQ.el('div', 'decomp-line', highlightC(text));
        if (map && map.asm) {
          el.dataset.asm = map.asm;
          el.title = '→ ' + map.asm + ' — click để nhảy listing';
          el.classList.add('has-asm');
          el.addEventListener('click', function () {
            body.querySelectorAll('.decomp-line.hl').forEach(function (x) { x.classList.remove('hl'); });
            el.classList.add('hl');
            if (opts.onJumpAsm) opts.onJumpAsm(map.asm);
            RQ.Bus.emit('c-line-click', { level: opts.levelId, asm: map.asm });
          });
        }
        body.appendChild(el);
        lineEls.push(el);
      });
    }

    function highlightC(text) {
      return RQ.esc(text)
        .replace(/(&quot;[^&]*?&quot;|"[^"]*")/g, '<span class="tok-str">$1</span>')
        .replace(/\b(undefined\d*|int|void|char|long|if|else|return|for|while|uint|byte|dword|bool)\b/g, '<span class="tok-kw">$1</span>')
        .replace(/\b(0x[0-9a-fA-F]+|\d+)\b/g, '<span class="tok-num">$1</span>')
        .replace(/\b([a-zA-Z_]\w*)(\()/g, '<span class="tok-fn">$1</span>$2');
    }

    /** listing chọn dòng asm → highlight dòng C tương ứng */
    function highlightForAsm(addr) {
      lineEls.forEach(function (el) { el.classList.remove('hl'); });
      if (!current) return;
      const map = (current.cMap || []).find(function (m) { return m.asm === addr; });
      if (map) {
        const el = lineEls[map.line - 1];
        if (el) el.classList.add('hl');
      }
    }

    if (functions.length) show(functions[functions.length - 1]); // thường main cuối
    return { show: show, highlightForAsm: highlightForAsm };
  };
})(window.RevQuest);
