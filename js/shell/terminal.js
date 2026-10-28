/* ============================================================
 * RevQuest — shell/terminal.js
 * Terminal UI: prompt màu, ANSI → span, history ↑↓, Tab completion,
 * Ctrl+C/L/A/E, flash khi lỗi. Mount vào 1 container.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  function ansiToHtml(s) {
    let out = '', open = 0;
    // xử lý các code: 1 bold, 30-37/90-97 fg, 0 reset
    const tokens = String(s).split(/(\x1b\[[0-9;]*m)/);
    tokens.forEach(function (t) {
      const m = t.match(/^\x1b\[([0-9;]*)m$/);
      if (m) {
        const codes = m[1].split(';').map(Number);
        if (codes.indexOf(0) !== -1) { out += '</span>'.repeat(open); open = 0; return; }
        let cls = '';
        codes.forEach(function (c) {
          if (c === 1) cls += ' ansi-bold';
          else if (c >= 30 && c <= 37) cls += ' ansi-fg' + (c - 30);
          else if (c >= 90 && c <= 97) cls += ' ansi-fg' + (c - 90 + 8);
        });
        if (cls) { out += '<span class="' + cls.trim() + '">'; open++; }
        return;
      }
      out += RQ.esc(t);
    });
    return out + '</span>'.repeat(open);
  }
  window.__rqAnsiToHtml = ansiToHtml; // pager/script dùng chung

  RQ.Terminal = function (container, opts) {
    opts = opts || {};
    const term = RQ.el('div', 'terminal');
    const out = RQ.el('div', 'term-out');
    const inputRow = RQ.el('div', 'term-row');
    const promptEl = RQ.el('span', 'term-prompt');
    const input = document.createElement('input');
    input.className = 'term-input';
    input.spellcheck = false;
    input.autocomplete = 'off';
    inputRow.appendChild(promptEl);
    inputRow.appendChild(input);
    term.appendChild(out);
    term.appendChild(inputRow);
    container.appendChild(term);

    const vfs = RQ.VFS;
    const ctx = {
      levelId: opts.levelId,
      bin: opts.bin || null,
      vfs: vfs,
      get cwd() { return cwdParts; },
      setCwd: function (parts) { cwdParts = parts; renderPrompt(); }
    };
    let cwdParts = opts.cwdParts ? opts.cwdParts.slice() : ['home', 'player'];
    let histIdx = -1;
    let histDraft = '';
    let gdb = null;        // RQ.Gdb instance khi đang trong mode (gdb)
    let gdbCtx = null;

    function renderPrompt() {
      if (gdb) {
        promptEl.innerHTML = '<span class="p-user">(gdb)</span>&nbsp;';
        return;
      }
      const pretty = vfs.prettyPath(cwdParts);
      promptEl.innerHTML = '<span class="p-user">player@revquest</span><span class="p-colon">:</span>' +
        '<span class="p-path">' + RQ.esc(pretty) + '</span><span class="p-dollar">$</span>&nbsp;';
    }

    function printAnsi(s, toOut) {
      const html = ansiToHtml(s);
      const div = RQ.el('div', 'term-line');
      div.innerHTML = html;
      // dòng chứa flag → gắn nút copy nhanh
      const fm = s.match(/((?:REV|PWN)\{[^}\s]*\})/);
      if (fm) {
        const btn = RQ.el('button', 'term-copy', '⧉ copy');
        btn.title = 'Copy ' + fm[1];
        btn.addEventListener('click', function () {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(fm[1]).then(function () {
              btn.textContent = '✓ đã copy';
              setTimeout(function () { btn.textContent = '⧉ copy'; }, 1500);
            });
          }
        });
        div.appendChild(btn);
      }
      (toOut || out).appendChild(div);
      term.scrollTop = term.scrollHeight;
    }

    /** Echo dòng lệnh: prompt là HTML có sẵn, phần gõ của user cần escape */
    function printEcho(raw) {
      const div = RQ.el('div', 'term-line');
      div.innerHTML = promptHtmlText() + RQ.esc(raw);
      out.appendChild(div);
      term.scrollTop = term.scrollHeight;
    }

    function flash() {
      term.classList.remove('term-flash');
      void term.offsetWidth;
      term.classList.add('term-flash');
    }

    function runLine(raw) {
      const line = raw.trim();
      printEcho(raw); // echo lệnh đã gõ
      if (!line) return;

      if (gdb) {
        if (!line) return;
        const r = gdb.handle(line);
        if (r.out) printAnsi(r.out.replace(/\n?$/, '\n') + '\n');
        if (r.err) { printAnsi(r.err + '\n'); flash(); }
        if (r.quit) {
          gdb = null;
          input.placeholder = '';
          printAnsi('[(gdb) exited]\n');
          renderPrompt();
        }
        return;
      }

      const log = RQ.Store.data.global;
      log.commandLog.push({ cmd: line, level: ctx.levelId, ts: Date.now() });
      if (log.commandLog.length > 400) log.commandLog.shift();
      RQ.Store.save();

      const tokens = RQ.Shell.tokenize(line);
      const stages = RQ.Shell.splitPipes(tokens);
      if (stages.length > 1) {
        RQ.Store.data.global.pipesUsed++;
        RQ.Store.save();
        RQ.Bus.emit('pipe', { level: ctx.levelId, stages: stages.length });
      }

      let stdin = '';
      for (let si = 0; si < stages.length; si++) {
        const toks = stages[si];
        const isLast = si === stages.length - 1;
        const isTty = isLast; // stdout cuối → tty (có màu); vào pipe → plain
        let res;

        const cmd0 = toks[0];
        const cctx = Object.assign({}, ctx, { stdinIsPipe: !isTty, stdin: stdin });
        if (cmd0.indexOf('./') === 0 || cmd0.indexOf('/') === 0) {
          res = RQ.Shell.execFile(cmd0, toks.slice(1), cctx);
        } else {
          const cmd = RQ.Shell.commands[cmd0];
          if (!cmd) {
            if (cmd0 === 'gdb') {
              const target = toks[1] || 'challenge';
              const node = ctx.vfs.lookup(target, ctx.cwd);
              if (!node || node.type !== 'elf') {
                res = { err: '\x1b[31mgdb: "' + target + '": not in executable format\x1b[0m', code: 1 };
              } else if (!ctx.bin || !ctx.bin.gdb) {
                res = { err: '\x1b[31mgdb: không có debug data cho binary này\x1b[0m', code: 1 };
              } else {
                gdb = RQ.Gdb(ctx.bin, { target: target, levelId: ctx.levelId, execOutput: ctx.bin.execOutput });
                printAnsi(gdb.banner + '\n');
                input.placeholder = '(gdb)';
                renderPrompt();
                RQ.Bus.emit('tool-use', { tool: 'gdb', level: ctx.levelId });
                res = { out: '', code: 0 };
              }
            } else {
              res = unknownCommand(cmd0);
            }
          } else {
            RQ.Bus.emit('command', { name: cmd0, args: toks.slice(1), level: ctx.levelId });
            const r = cmd.run(toks.slice(1), stdin, cctx) || { out: '', code: 0 };
            res = r;
          }
        }

        if (res.clearScreen) { out.innerHTML = ''; stdin = ''; continue; }
        if (res.long && isTty) {
          // output dài → pager less-like
          RQ.Shell.pager(term, res.out).then(function () { input.focus(); });
          stdin = RQ.Shell.stripAnsi(res.out);
          continue;
        }
        if (res.out) {
          stdin = RQ.Shell.stripAnsi(res.out);
          if (isTty) printAnsi(res.out.replace(/\n?$/, '\n'));
        } else if (!res.err) {
          stdin = '';
        }
        if (res.err && isLast) {
          printAnsi(res.err.replace(/\n?$/, '\n'));
          flash();
          const g = RQ.Store.data.global;
          g.consecutiveErrors++;
          g.maxConsecutiveErrors = Math.max(g.maxConsecutiveErrors, g.consecutiveErrors);
          RQ.Store.save();
          RQ.Bus.emit('error', { level: ctx.levelId, cmd: cmd0 });
        }
        if (!res.err && res.code === 0) {
          RQ.Store.data.global.consecutiveErrors = 0;
          RQ.Store.save();
        }
        if (si < stages.length - 1 && res.err) {
          printAnsi(res.err.replace(/\n?$/, '\n'));
        }
      }
    }

    function promptHtmlText() {
      return '<span class="p-user">player@revquest</span><span class="p-colon">:</span>' +
        '<span class="p-path">' + RQ.esc(vfs.prettyPath(cwdParts)) + '</span><span class="p-dollar">$</span> ';
    }

    function unknownCommand(cmd) {
      const names = Object.keys(RQ.Shell.commands).filter(function (n) { return !RQ.Shell.commands[n].hidden; });
      let best = null, bestD = 3;
      names.forEach(function (n) {
        const d = RQ.Shell.levenshtein(cmd, n);
        if (d < bestD) { bestD = d; best = n; }
      });
      let err = 'bash: ' + cmd + ': command not found';
      if (best && bestD <= 2) {
        err += '\nDid you mean: \x1b[1m' + best + '\x1b[0m?  (gõ `help` xem tất cả lệnh)';
        const g = RQ.Store.data.global;
        const key = cmd;
        g.typoCounts[key] = (g.typoCounts[key] || 0) + 1;
        RQ.Store.save();
        RQ.Bus.emit('typo', { typed: cmd, meant: best, level: ctx.levelId });
      } else {
        err += '\nGõ \x1b[1mhelp\x1b[0m để xem các lệnh có sẵn.';
      }
      return { err: err, code: 127 };
    }

    /* hàm unknownCommand duy nhất ở trên */

    function complete() {
      const v = input.value;
      const parts = v.split(/\s+/);
      const last = parts[parts.length - 1] || '';
      let options = [];
      if (parts.length <= 1) {
        options = Object.keys(RQ.Shell.commands).filter(function (n) { return !RQ.Shell.commands[n].hidden && n.indexOf(last) === 0; });
      } else {
        const node = vfs.lookup('.', cwdParts);
        options = vfs.listDir(node)
          .filter(function (n) { return n.name.indexOf(last) === 0; })
          .map(function (n) { return n.name; });
      }
      if (options.length === 1) {
        parts[parts.length - 1] = options[0];
        input.value = parts.join(' ');
      } else if (options.length > 1) {
        printEcho(v);
        printAnsi(options.join('  '));
      }
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const v = input.value;
        input.value = '';
        histIdx = -1; histDraft = '';
        runLine(v);
      } else if (e.key === 'ArrowUp') {
        const log = RQ.Store.data.global.commandLog.filter(function (x) { return x.level === ctx.levelId; });
        if (!log.length) return;
        if (histIdx === -1) { histDraft = input.value; histIdx = log.length; }
        histIdx = Math.max(0, histIdx - 1);
        input.value = log[histIdx].cmd;
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        const log = RQ.Store.data.global.commandLog.filter(function (x) { return x.level === ctx.levelId; });
        if (histIdx === -1) return;
        histIdx++;
        if (histIdx >= log.length) { histIdx = -1; input.value = histDraft; }
        else input.value = log[histIdx].cmd;
        e.preventDefault();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        complete();
      } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        printEcho(input.value + '^C');
        input.value = '';
      } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        out.innerHTML = '';
      } else if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        input.setSelectionRange(0, 0);
      } else if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    // Chỉ focus input khi user KHÔNG bôi đen text — để copy flag từ output được.
    term.addEventListener('mouseup', function () {
      const sel = String(window.getSelection());
      if (sel.length === 0) input.focus();
    });
    term.addEventListener('dblclick', function () {
      // double-click 1 dòng có flag → copy luôn
      const sel = String(window.getSelection());
      const m = sel.match(/((?:REV|PWN)\{[^}\s]*\})/);
      if (m && navigator.clipboard) {
        navigator.clipboard.writeText(m[1]).then(function () {
          RQ.toast('📋 Đã copy <code>' + RQ.esc(m[1]) + '</code> vào clipboard.', 'toast-info');
        });
      }
    });

    renderPrompt();
    if (opts.banner) printAnsi(opts.banner.replace(/\n?$/, '\n'));

    const api = {
      print: printAnsi,
      run: runLine,
      focus: function () { input.focus(); },
      clear: function () { out.innerHTML = ''; },
      get cwdParts() { return cwdParts; },
      setBin: function (b) { ctx.bin = b; }
    };
    return api;
  };
})(window.RevQuest);
