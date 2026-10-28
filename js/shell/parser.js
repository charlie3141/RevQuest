/* ============================================================
 * RevQuest — shell/parser.js
 * Tokenize (tôn trọng quote) + tách pipe.
 * Kết quả stage[i] = mảng token; stdout stage trước = stdin stage sau.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Shell = RQ.Shell = {};

  RQ.Shell.tokenize = function (line) {
    const tokens = [];
    let cur = '', quote = null, has = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === quote) { quote = null; }
        else cur += c;
        continue;
      }
      if (c === '"' || c === "'") { quote = c; has = true; continue; }
      if (c === '|' ) { if (cur || has) { tokens.push(cur); cur = ''; has = false; } tokens.push('|'); continue; }
      if (c === ' ' || c === '\t') { if (cur || has) { tokens.push(cur); cur = ''; has = false; } continue; }
      cur += c; has = true;
    }
    if (cur || has) tokens.push(cur);
    return tokens;
  };

  RQ.Shell.splitPipes = function (tokens) {
    const stages = [[]];
    tokens.forEach(function (t) {
      if (t === '|') stages.push([]);
      else stages[stages.length - 1].push(t);
    });
    return stages.filter(function (s) { return s.length > 0; });
  };

  /** Bỏ ANSI khi output đi vào pipe (như stdout thật khi không phải tty) */
  RQ.Shell.stripAnsi = function (s) {
    return String(s).replace(/\x1b\[[0-9;]*m/g, '');
  };

  /** Khoảng cách Levenshtein — cho gợi ý "Did you mean" */
  RQ.Shell.levenshtein = function (a, b) {
    const m = a.length, n = b.length;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0]; dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return dp[n];
  };
})(window.RevQuest);
