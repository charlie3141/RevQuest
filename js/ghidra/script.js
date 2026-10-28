/* ============================================================
 * RevQuest — ghidra/script.js
 * Script console: Python-subset interpreter (giả lập angr workflow).
 * Hỗ trợ: gán biến · for x in range(a,b): · if <expr>:
 * print(...) · gọi builtin (len, xor_decode, startswith, bytes_of...).
 * Đây là "automation": brute-force 1 dòng thay vì đoán tay.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  /* --- mini interpreter --- */
  function evalExpr(src, env, builtins) {
    src = src.trim();
    // chuỗi
    const sm = src.match(/^"([^"]*)"$/);
    if (sm) return sm[1];
    if (/^\d+$/.test(src)) return parseInt(src, 10);
    // call
    const cm = src.match(/^(\w+)\((.*)\)$/);
    if (cm) {
      const fn = cm[1];
      const argSrcs = splitArgs(cm[2]);
      const args = argSrcs.map(function (a) { return evalExpr(a, env, builtins); });
      if (builtins[fn]) return builtins[fn].apply(null, args);
      if (env[fn] && typeof env[fn] === 'function') return env[fn].apply(null, args);
      throw new Error("name '" + fn + "' is not defined");
    }
    // var
    if (/^\w+$/.test(src)) {
      if (src in env) return env[src];
      throw new Error("name '" + src + "' is not defined");
    }
    // binop ^ + - * % (ưu tiên ^ theo yêu cầu game — không đúng Python precedence nhưng đơn giản)
    const bm = src.match(/^(.+?)(\^|\+|-|\*|%)(.+)$/);
    if (bm) {
      const a = evalExpr(bm[1], env, builtins);
      const b = evalExpr(bm[3], env, builtins);
      switch (bm[2]) {
        case '^': return a ^ b; case '+': return typeof a === 'string' || typeof b === 'string' ? String(a) + String(b) : a + b;
        case '-': return a - b; case '*': return a * b; case '%': return a % b;
      }
    }
    throw new Error('syntax error: ' + src);
  }

  function splitArgs(s) {
    const out = []; let cur = '', depth = 0, q = null;
    for (const c of s) {
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) out.push(cur);
    return out.map(function (x) { return x.trim(); });
  }

  /**
   * run(src, builtins) → { output: [dòng], error }
   * Cú pháp hỗ trợ: gán, for-in-range (khối thụt 4 space), if (khối), print.
   */
  function run(src, builtins) {
    const out = [];
    const env = {};
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    let i = 0;

    function execBlock(start, end, indent) {
      let idx = start;
      while (idx < end) {
        const raw = lines[idx];
        if (raw.trim() === '' || raw.trim()[0] === '#') { idx++; continue; } // comment + blank
        const ind = raw.match(/^ */)[0].length;
        if (ind < indent) return idx; // kết thúc block
        const line = raw.trim();
        let m;
        if ((m = line.match(/^for\s+(\w+)\s+in\s+range\((.+)\):$/))) {
          const a = evalExpr(m[2], env, builtins);
          const startV = Array.isArray(a) ? 0 : (m[2].includes(',') ? 0 : 0);
          // range(n) | range(a,b) | range(a,b,step) — evalExpr trả về mảng khi gọi range
          const seq = Array.isArray(a) ? a : [a];
          const bodyStart = idx + 1;
          let bodyEnd = bodyStart;
          while (bodyEnd < end && (lines[bodyEnd].trim() === '' || lines[bodyEnd].match(/^ {4,}/))) bodyEnd++;
          const list = Array.isArray(a) ? a : buildRange(m[2], env, builtins);
          for (const v of list) {
            env[m[1]] = v;
            execBlock(bodyStart, bodyEnd, indent + 4);
          }
          idx = bodyEnd;
          continue;
        }
        if ((m = line.match(/^if\s+(.+):$/))) {
          const condSrc = m[1];
          const bodyStart = idx + 1;
          let bodyEnd = bodyStart;
          while (bodyEnd < end && (lines[bodyEnd].trim() === '' || lines[bodyEnd].match(/^ {4,}/))) bodyEnd++;
          const cm = condSrc.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
          let truth = false;
          if (cm) {
            const a = evalExpr(cm[1], env, builtins), b = evalExpr(cm[3], env, builtins);
            switch (cm[2]) {
              case '==': truth = a === b; break; case '!=': truth = a !== b; break;
              case '>=': truth = a >= b; break; case '<=': truth = a <= b; break;
              case '>': truth = a > b; break; case '<': truth = a < b; break;
            }
          } else truth = !!evalExpr(condSrc, env, builtins);
          if (truth) execBlock(bodyStart, bodyEnd, indent + 4);
          idx = bodyEnd;
          continue;
        }
        if ((m = line.match(/^print\((.*)\)$/))) {
          const args = splitArgs(m[1]).map(function (a) { return evalExpr(a, env, builtins); });
          out.push(args.map(function (x) { return typeof x === 'string' ? x : String(x); }).join(' '));
          idx++; continue;
        }
        if ((m = line.match(/^(\w+)\s*=\s*(.+)$/))) {
          env[m[1]] = evalExpr(m[2], env, builtins);
          idx++; continue;
        }
        throw new Error('SyntaxError: không hiểu dòng: ' + line);
      }
      return idx;
    }

    function buildRange(src, env, builtins) {
      const args = splitArgs(src).map(function (a) { return evalExpr(a, env, builtins); });
      if (args.length === 1) { const r = []; for (let k = 0; k < args[0]; k++) r.push(k); return r; }
      if (args.length === 2) { const r = []; for (let k = args[0]; k < args[1]; k++) r.push(k); return r; }
      const r = []; for (let k = args[0]; k < args[1]; k += args[2]) r.push(k); return r;
    }

    try {
      execBlock(0, lines.length, 0);
      return { output: out };
    } catch (e) {
      return { output: out, error: e.message };
    }
  }

  /* --- console UI --- */
  RQ.ScriptConsole = function (container, opts) {
    opts = opts || {};
    const builtins = opts.builtins || {};
    const wrap = RQ.el('div', 'gpanel script-panel');
    wrap.appendChild(RQ.el('div', 'panel-title', 'SCRIPT CONSOLE — Python-subset (giả lập angr)'));
    const ta = document.createElement('textarea');
    ta.className = 'script-editor';
    ta.spellcheck = false;
    ta.value = opts.starter || '';
    wrap.appendChild(ta);
    const row = RQ.el('div', 'field-row');
    const runBtn = RQ.el('button', 'btn btn-primary', '▶ Run (Ctrl+Enter)');
    row.appendChild(runBtn);
    const out = RQ.el('div', 'output-term script-out');
    out.style.display = 'none';
    wrap.appendChild(row);
    wrap.appendChild(out);
    container.appendChild(wrap);

    function doRun() {
      const res = run(ta.value, builtins);
      out.style.display = 'block';
      let text = res.output.join('\n');
      if (res.error) text += '\n\x1b[31m' + res.error + '\x1b[0m';
      out.innerHTML = window.__rqAnsiToHtml ? window.__rqAnsiToHtml(text) : RQ.esc(text);
      RQ.Store.data.global.scriptsRun++;
      RQ.Store.save();
      RQ.Bus.emit('script-run', { level: opts.levelId });
      if (res.output.join('\n').match(/(REV|PWN)\{/)) {
        RQ.Bus.emit('flag-revealed', { path: opts.pathId || 'script-path', level: opts.levelId, value: 'script' });
      }
    }
    runBtn.addEventListener('click', doRun);
    ta.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); doRun(); }
    });
    return {};
  };

  RQ.ScriptConsole.run = run;
})(window.RevQuest);
