/* ============================================================
 * RevQuest — shell/pager.js
 * less-like pager: output dài hiện từng trang, q/Esc thoát,
 * ↑↓/PgUp/PgDn cuộn, G/G đầu-cuối. Đúng kiểu học Unix.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  /**
   * RQ.Shell.pager(termApi, container, ansiText)
   * Thay vùng output bằng pager overlay; trả khi user thoát (q/Esc).
   * Trả về promise (không ai await cũng được).
   */
  RQ.Shell.pager = function (container, ansiText, title) {
    return new Promise(function (resolve) {
      const termEl = container.querySelector('.terminal') || container;
      const overlay = RQ.el('div', 'pager');
      const content = RQ.el('div', 'pager-content');
      const status = RQ.el('div', 'pager-status');

      // tách dòng: ansiToHtml từng dòng
      const lines = String(ansiText).split('\n');
      lines.forEach(function (l) {
        const div = RQ.el('div', 'pager-line');
        // dùng lại ansi parser của terminal qua global nhỏ
        div.innerHTML = window.__rqAnsiToHtml ? window.__rqAnsiToHtml(l) : RQ.esc(l);
        content.appendChild(div);
      });

      let pos = 0; // dòng đầu đang hiển thị
      const PAGE = 22;

      function render() {
        content.style.transform = 'translateY(-' + pos + 'em)';
        status.textContent = ':' + (title || '') + '  —  dòng ' + (pos + 1) + '/' + lines.length +
          '  —  ↑↓ cuộn · G đầu · Shift+G cuối · q thoát';
      }

      function close() {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve();
      }

      function onKey(e) {
        if (e.key === 'q' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (e.key === 'ArrowDown' || e.key === 'j') { pos = Math.min(lines.length - 1, pos + 1); render(); e.preventDefault(); return; }
        if (e.key === 'ArrowUp' || e.key === 'k') { pos = Math.max(0, pos - 1); render(); e.preventDefault(); return; }
        if (e.key === 'PageDown') { pos = Math.min(lines.length - 1, pos + PAGE); render(); e.preventDefault(); return; }
        if (e.key === 'PageUp') { pos = Math.max(0, pos - PAGE); render(); e.preventDefault(); return; }
        if (e.key === 'G') { pos = Math.max(0, lines.length - PAGE); render(); e.preventDefault(); return; }
        if (e.key === 'g') { pos = 0; render(); e.preventDefault(); return; }
        if (e.key === ' ') { pos = Math.min(lines.length - 1, pos + PAGE); render(); e.preventDefault(); return; }
        e.stopPropagation(); // pager nuốt phím còn lại (đúng kiểu less)
      }

      overlay.appendChild(content);
      overlay.appendChild(status);
      termEl.appendChild(overlay);
      document.addEventListener('keydown', onKey, true);
      render();
    });
  };
})(window.RevQuest);
