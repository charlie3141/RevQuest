/* ============================================================
 * RevQuest — badges/engine.js
 * Semantic trigger evaluator: sau mỗi event, chạy lại các predicate
 * chưa đạt; badge mới → toast chúc mừng + lưu store.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  RQ.Badges = RQ.Badges || {};

  RQ.Badges.init = function () {
    RQ.Bus.on('*', function () {
      // debounce nhẹ để không chạy dồn khi gõ liên tiếp
      clearTimeout(RQ.Badges._t);
      RQ.Badges._t = setTimeout(RQ.Badges.evaluate, 60);
    });
  };

  RQ.Badges.evaluate = function () {
    const defs = RQ.Badges.definitions || [];
    defs.forEach(function (d) {
      if (RQ.Store.data.badges[d.id]) return;
      let ok = false;
      try { ok = d.cond(RQ.Store.data); } catch (e) { return; }
      if (ok) {
        RQ.Store.data.badges[d.id] = Date.now();
        RQ.Store.save();
        const stars = '★'.repeat(d.stars) + '☆'.repeat(Math.max(0, 5 - d.stars));
        RQ.toast(
          '<div class="toast-badge-title">' + d.icon + ' Badge mới: ' + RQ.esc(d.name) + '</div>' +
          '<div class="toast-badge-stars">' + stars + '</div>' +
          '<div class="toast-badge-desc">' + RQ.esc(d.desc) + '</div>',
          'toast-badge');
        RQ.Bus.emit('badge-earned', { id: d.id });
      }
    });
  };
})(window.RevQuest);
