/* ============================================================
 * RevQuest — shell/gdb.js
 * Mini-debugger state machine. `gdb ./challenge` vào mode (gdb).
 * Hỗ trợ: break <sym> · run [input] · info registers · x/s · x/20x ·
 * continue · quit. Hit breakpoint → xem tham số ($rdi/$rsi) — con
 * đường "debugger" kinh điển để bắt flag lúc runtime.
 * Dữ liệu từ bundle.gdb (pre-computed).
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Gdb = function (bin, ctx) {
    const g = (bin && bin.gdb) || {};
    const state = {
      breaks: [],        // tên symbol đã break
      running: false,
      stopped: null      // { sym, args }
    };

    function regsBlock() {
      const regs = (state.stopped && state.stopped.registers) || g.registers ||
        {
          RAX: '0x0', RBX: '0x0', RCX: '0x0', RDX: '0x0',
          RSI: '0x1', RDI: '0x7fffffffdde0', RBP: '0x7fffffffd020', RSP: '0x7fffffffd010',
          R8: '0x0', R9: '0x7ffff7fae040', RIP: '0x7ffff7c812e0 <__strcmp_avx2>',
          EFLAGS: '0x202 [ CF PF IF SF OF ]'
        };
      return Object.keys(regs).map(function (k) {
        return k.toLowerCase().padEnd(6) + ' ' + regs[k];
      }).join('\n');
    }

    return {
      banner: [
        'GNU gdb (Ubuntu 12.1-0ubuntu1~22.04) 12.1',
        'Reading symbols from ' + (ctx.target || 'challenge') + '...',
        '(No debugging symbols found in ' + (ctx.target || 'challenge') + ')',
        '(gdb) gõ `break <hàm>`, `run <input>`, `x/s $rsi`, `quit`'
      ].join('\n'),

      /** trả về {out, err, quit} */
      handle: function (line) {
        const parts = line.trim().split(/\s+/);
        const cmd = parts[0];

        if (cmd === 'quit' || cmd === 'q') return { quit: true, out: '' };
        if (cmd === 'help' || cmd === 'h') {
          return { out: ['break <tên hàm>   đặt breakpoint (vd: break strcmp)',
                         'run [input]       chạy tới breakpoint (input nạp vào stdin)',
                         'info registers    xem thanh ghi',
                         'x/s $rdi|$rsi     xem tham số dạng chuỗi',
                         'x/20x $rsp        xem 20 byte trên stack (hex)',
                         'continue          chạy tiếp tới hết',
                         'quit              thoát gdb'].join('\n') };
        }
        if (cmd === 'break' || cmd === 'b') {
          const sym = parts[1];
          if (!sym) return { err: 'Breakpoint requires a symbol' };
          if (!g.breakpoints || !g.breakpoints[sym.replace('@plt', '')]) {
            const known = g.breakpoints ? Object.keys(g.breakpoints).join(', ') : '(không có)';
            return { err: "Function \"" + sym + "\" not defined.\nBreakable trong binary này: " + known };
          }
          state.breaks.push(sym.replace('@plt', ''));
          const n = state.breaks.length;
          return { out: 'Breakpoint ' + n + ' at ' + (g.breakpoints[sym.replace('@plt', '')].addr || '0x7ffff7c812e0') };
        }
        if (cmd === 'run' || cmd === 'r') {
          if (!state.breaks.length) {
            return { out: (g.runOut || (ctx.execOutput || '')) + '\n[Inferior 1 (process 1234) exited normally]' };
          }
          const input = parts.slice(1).join(' ') || (ctx.gdbInput || '');
          const sym = state.breaks[0];
          const bp = g.breakpoints[sym];
          const args = bp.argsFn ? bp.argsFn(input) : bp.args;
          state.stopped = { sym: sym, args: args, registers: bp.registers, input: input };
          state.running = true;
          RQ.Bus.emit('breakpoint', { level: ctx.levelId, sym: sym });
          return {
            out: ['Starting program: ./' + (ctx.target || 'challenge') + (input ? ' "' + input + '"' : ''),
                  '',
                  "Breakpoint 1, " + (bp.hitNote || sym + ' ()'),
                  regsBlock()].join('\n')
          };
        }
        if (cmd === 'info' && parts[1] === 'registers') {
          if (!state.stopped) return { err: "The program is not being run." };
          return { out: regsBlock() };
        }
        if (cmd === 'x' || /^x\//.test(cmd)) {
          if (!state.stopped) return { err: "No registers." };
          const m = line.match(/^x\/(\d*)([sxb]?)\s+(\$\w+|0x[0-9a-fA-F]+)/);
          if (!m) return { err: 'x/[n][fmt] $reg|addr — vd: x/s $rsi, x/20x $rsp' };
          const n = m[1] ? parseInt(m[1], 10) : 1;
          const fmt = m[2] || 's';
          const what = m[3];
          const key = what.replace('$', '').toUpperCase();
          let val = state.stopped.args && state.stopped.args[key];
          if (val === undefined) {
            // addr trực tiếp trong bundle?
            const addrKey = what;
            val = g.mem && g.mem[addrKey];
          }
          if (val === undefined) return { err: '0x0: Cannot access memory at address 0x0' };
          if (fmt === 's') {
            const s = String(val).replace(/^"|"$/g, '');
            return { out: what + ': ' + JSON.stringify(s.length > n && n > 1 ? s.slice(0, n) : s) };
          }
          // hex dump
          const s = String(val).replace(/^"|"$/g, '');
          const lines = [];
          for (let i = 0; i < Math.min(n, s.length); i += 16) {
            const slice = s.slice(i, i + 16);
            const hex = Array.from(slice).map(function (c) { return c.charCodeAt(0).toString(16).padStart(2, '0'); }).join(' ');
            lines.push('0x' + (0x7ffffff000 + i).toString(16) + ':\t' + hex);
          }
          return { out: lines.join('\n') };
        }
        if (cmd === 'continue' || cmd === 'c') {
          if (!state.stopped) return { err: "The program is not being run." };
          return { out: "Continuing.\n" + (g.runOut || ctx.execOutput || '') + "\n[Inferior 1 (process 1234) exited normally]" };
        }
        return { err: 'Undefined command: "' + line + '". Try `help`.' };
      }
    };
  };
})(window.RevQuest);
