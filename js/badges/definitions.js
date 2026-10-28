/* ============================================================
 * RevQuest — badges/definitions.js
 * Badge = hàm predicate thuần trên ngữ cảnh (state), KHÔNG match chuỗi.
 * cond(ctx) đọc RevQuest.Store.data; engine gọi lại sau mỗi event.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  const D = [];

  function def(id, icon, name, desc, stars, cond) {
    D.push({ id: id, icon: icon, name: name, desc: desc, stars: stars, cond: cond });
  }

  function sumTypos(g) {
    return Object.keys(g.typoCounts).reduce(function (a, k) { return a + g.typoCounts[k]; }, 0);
  }

  /* ---- M1: có thể đạt ngay ---- */
  def('first_blood', '🩸', 'First Blood', 'Pass level đầu tiên. Mọi hacker đều nhớ cú chạm đầu tiên.', 1,
    function (ctx) { return Object.keys(ctx.levels).some(function (k) { return ctx.levels[k].passed; }); });

  def('typo_survivor', '🩹', 'Typo Survivor', 'Gõ sai lệnh ≥3 lần mà vẫn không bỏ cuộc. Thất bại cũng là dữ liệu.', 1,
    function (ctx) { return sumTypos(ctx.global) >= 3; });

  def('persistent', '🪨', 'Persistent', 'Gõ sai 5 lệnh LIÊN TIẾP mà vẫn tiếp tục. Đúng chất RE: thử-sai là quy trình.', 2,
    function (ctx) { return ctx.global.maxConsecutiveErrors >= 5; });

  def('explorer', '🧭', 'Explorer', 'Chạy ≥10 lệnh trong terminal. Bạn đang dùng shell như một công cụ suy luận.', 1,
    function (ctx) { return ctx.global.commandLog.length >= 10; });

  /* ---- cần tool của các milestone sau — để sẵn, tự kích hoạt khi điều kiện đủ ---- */
  def('rtfm', '📚', 'RTFM', 'Đọc ≥3 man page. Người đọc tài liệu không bao giờ bế tắc lâu.', 2,
    function (ctx) { return Object.keys(ctx.global.manPagesRead).length >= 3; });

  def('pipeline_master', '▮', 'Pipeline Master', 'Dùng ≥1 pipe (strings challenge | grep PWN). Unix ghép công cụ nhỏ thành máy lớn.', 2,
    function (ctx) { return ctx.global.pipesUsed >= 1; });

  def('tool_polyglot', 'Toolkit', 'Tool Polyglot', 'Dùng ≥5 công cụ khác nhau trong 1 level.', 3,
    function (ctx) {
      return Object.keys(ctx.levels).some(function (k) {
        return Object.keys(ctx.levels[k].toolsUsed).length >= 5;
      });
    });

  def('curator', '⚖️', 'Curator', 'Dùng cả tĩnh (strings/Ghidra) và động (ltrace/gdb) trên cùng 1 level.', 3,
    function (ctx) {
      return Object.keys(ctx.levels).some(function (k) {
        const t = Object.keys(ctx.levels[k].toolsUsed);
        const hasStatic = t.some(function (x) { return ['strings', 'strings-panel', 'listing', 'decompiler'].indexOf(x) !== -1; });
        const hasDyn = t.some(function (x) { return ['ltrace', 'gdb'].indexOf(x) !== -1; });
        return hasStatic && hasDyn;
      });
    });

  def('full_spectrum', '🌈', 'Full Spectrum', 'Giải cùng 1 level bằng ≥3 con đường khác nhau.', 4,
    function (ctx) {
      return Object.keys(ctx.levels).some(function (k) {
        return (ctx.levels[k].solvedVia || []).length >= 3;
      });
    });

  def('debugger', '🐞', 'Debugger', 'Đặt breakpoint trong gdb và đọc thanh ghi.', 3,
    function (ctx) { return ctx.global.breakpoints >= 1; });

  def('xref_master', '🔗', 'Xref Master', 'Nhảy theo cross-reference ≥10 lần. RE là môn truy ngược, không phải đọc tuần tự.', 3,
    function (ctx) { return ctx.global.xrefJumps >= 10; });

  def('renamer', '✍️', 'Renamer', 'Rename ≥5 symbol. Đặt tên đúng là hiểu chương trình.', 2,
    function (ctx) {
      return Object.keys(ctx.global.renames).some(function (k) { return ctx.global.renames[k].length >= 5; });
    });

  def('graph_explorer', '🕸️', 'Graph Explorer', 'Mở graph view ≥5 lần. CFG cho thấy "hình dạng" của logic.', 2,
    function (ctx) { return ctx.global.graphOpens >= 5; });

  def('patcher', '🔨', 'Patcher', 'Patch byte trong binary để thay đổi hành vi.', 3,
    function (ctx) { return ctx.global.patches >= 1; });

  def('automator', '🤖', 'Automator', 'Chạy script tự động hoá solve.', 4,
    function (ctx) { return ctx.global.scriptsRun >= 1; });

  def('completionist', '🏆', 'Completionist', 'Pass tất cả 9 level.', 5,
    function (ctx) {
      let n = 0;
      for (let i = 0; i < 9; i++) if (ctx.levels[String(i)] && ctx.levels[String(i)].passed) n++;
      return n >= 9;
    });

  /* ---- path-based badges: trao theo CÁCH giải, không phải giải được ---- */
  function solvedViaAny(ctx, pathIds) {
    return Object.keys(ctx.levels).some(function (k) {
      const via = ctx.levels[k].solvedVia || [];
      return pathIds.some(function (p) { return via.indexOf(p) !== -1; });
    });
  }

  def('shell_novice', '🐚', 'Shell Novice', 'Pass level đầu bằng ls + cat thuần. Mọi người đều bắt đầu từ đây.', 1,
    function (ctx) { return ctx.levels['0'] && ctx.levels['0'].passed; });

  def('lazy_hacker', '😎', 'Lazy Hacker', 'Giải bằng strings/click chuột. Đường nhanh nhất — và KHÔNG hề sai.', 1,
    function (ctx) { return solvedViaAny(ctx, ['strings-panel-path', 'eyes-path', 'strings-exec-path']); });

  def('watcher', '👁️', 'Watcher', 'Giải bằng ltrace — nghe trộm library call là đường tắt của dynamic analysis.', 2,
    function (ctx) { return solvedViaAny(ctx, ['ltrace-path']); });

  def('asm_peeker', '🦾', 'Asm Peeker', 'Giải bằng đọc assembly thuần, không phụ thuộc decompiler.', 2,
    function (ctx) { return solvedViaAny(ctx, ['listing-path', 'asm-path']); });

  def('reverse_engineer', '🧠', 'Reverse Engineer', 'Giải bằng decompiler — đọc pseudo-C, hiểu logic thật sự.', 3,
    function (ctx) { return solvedViaAny(ctx, ['decomp-path', 'decomp-rename-path', 'manual-path']); });

  def('keysmith', '🔑', 'Keysmith', 'Pass Keygen Me — đọc được thuật toán sinh key và tính ngược.', 3,
    function (ctx) { return ctx.levels['4'] && ctx.levels['4'].passed; });

  def('pathfinder', '🧩', 'Pathfinder', 'Pass Graph View — đọc CFG như bản đồ, không lạc trong nhánh.', 3,
    function (ctx) { return ctx.levels['5'] && ctx.levels['5'].passed; });

  def('surgeon', '🔬', 'Surgeon', 'Pass Patcher — đổi đúng 1 byte và hành vi binary đảo ngược.', 3,
    function (ctx) { return ctx.levels['7'] && ctx.levels['7'].passed; });

  RQ.Badges = RQ.Badges || {};
  RQ.Badges.definitions = D;
})(window.RevQuest);
