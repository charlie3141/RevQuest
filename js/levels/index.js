/* ============================================================
 * RevQuest — levels/index.js
 * Boot: VFS build (sau khi mọi level đăng ký), badge engine, app init.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
document.addEventListener('DOMContentLoaded', function () {
  RevQuest.App.init();
});
