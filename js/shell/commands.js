/* ============================================================
 * RevQuest — shell/commands.js
 * Registry lệnh. Handler thuần: run(args, stdin, ctx) → { out, err, code }
 * out/err là chuỗi ANSI (chỉ tô khi stdout là tty; khi trong pipe → plain).
 *
 * TRIẾT LÝ: sai lệnh là giáo trình — mỗi lỗi gợi ý bước tiếp theo.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';
  const C = RQ.Shell.commands = {};

  function def(name, spec) {
    C[name] = spec;
    spec.name = name;
  }

  /* helpers */
  function green(s) { return '\x1b[32m' + s + '\x1b[0m'; }
  function blue(s) { return '\x1b[1;34m' + s + '\x1b[0m'; }
  function red(s) { return '\x1b[31m' + s + '\x1b[0m'; }
  function bold(s) { return '\x1b[1m' + s + '\x1b[0m'; }
  /** '0644' → false, '0755' → true — bit execute = chữ số lẻ ở 3 vị trí cuối */
  function isExecMode(mode) {
    if (!mode) return false;
    const digits = String(mode).slice(-3);
    return digits.split('').some(function (d) { return (parseInt(d, 8) % 2) === 1; });
  }

  /* ---------------- ls ---------------- */
  def('ls', {
    desc: 'liệt kê nội dung thư mục',
    man: 'ls — liệt kê nội dung thư mục.\nDùng: ls [-l] [-a] [đường_dẫn]\n  -l  dạng dài: mode, kích thước, tên\n  -a  hiện cả file ẩn (bắt đầu bằng dấu chấm)\nFile chạy được (ELF, mode x) in màu xanh lá; thư mục màu xanh dương.',
    run: function (args, stdin, ctx) {
      const showAll = args.indexOf('-a') !== -1 || args.indexOf('-la') !== -1 || args.indexOf('-al') !== -1;
      const long = args.indexOf('-l') !== -1 || showAll;
      const target = args.filter(function (a) { return a[0] !== '-'; })[0] || '.';
      const node = ctx.vfs.lookup(target, ctx.cwd);
      if (!node) return { err: red("ls: cannot access '" + target + "': No such file or directory"), code: 2 };
      if (node.type !== 'dir') return { out: target, code: 0 };

      let names = ctx.vfs.listDir(node);
      if (showAll) {
        names = [{ name: '.', type: 'dir', mode: node.mode }, { name: '..', type: 'dir', mode: '0755' }].concat(names);
      } else {
        names = names.filter(function (n) { return n.name[0] !== '.'; });
      }
      let out = '';
      if (long) {
        const rows = names.map(function (n) {
          const isExec = n.type !== 'dir' && isExecMode(n.mode);
          const name = n.type === 'dir' ? blue(n.name) : (isExec ? green(n.name) : n.name);
          return n.mode + '  ' + name;
        });
        out = 'total ' + names.length + '\n' + rows.join('\n');
      } else {
        out = names.map(function (n) {
          const isExec = n.type !== 'dir' && isExecMode(n.mode);
          return n.type === 'dir' ? blue(n.name) : (isExec ? green(n.name) : n.name);
        }).join('  ');
      }
      return { out: out, code: 0 };
    }
  });

  /* ---------------- cd ---------------- */
  def('cd', {
    desc: 'chuyển thư mục hiện hành',
    man: 'cd — đổi thư mục hiện hành.\nDùng: cd [đường_dẫn]\n  cd ..     lùi 1 cấp\n  cd ~      về /home/player\n  cd        = cd ~\nLệnh thành công thì IM LẶNG — như Linux thật.',
    run: function (args, stdin, ctx) {
      const target = args[0] || '~';
      const parts = ctx.vfs.partsOf(target, ctx.cwd);
      const node = ctx.vfs.lookup('/' + parts.join('/'), []);
      if (!node) return { err: red("bash: cd: " + target + ": No such file or directory") + " — gõ `ls` xem thư mục hiện tại có gì.", code: 1 };
      if (node.type !== 'dir') return { err: red("bash: cd: " + target + ": Not a directory"), code: 1 };
      ctx.setCwd(parts);
      return { out: '', code: 0 };
    }
  });

  /* ---------------- cat ---------------- */
  def('cat', {
    desc: 'in nội dung file ra stdout',
    man: 'cat — nối file và in ra stdout.\nDùng: cat FILE [FILE...]\nCat vào file BINARY sẽ in rác lên màn hình —\nđó là lý do `strings` tồn tại.',
    run: function (args, stdin, ctx) {
      if (!args.length) {
        return { err: red('cat: missing file operand') + ' — gõ `man cat` hoặc `ls` xem có gì để đọc.', code: 1 };
      }
      const outs = [];
      for (const a of args) {
        const node = ctx.vfs.lookup(a, ctx.cwd);
        if (!node) return { err: red('cat: ' + a + ': No such file or directory') + ' — kiểm tra chính tả, gõ `ls`.', code: 1 };
        if (node.type === 'dir') return { err: red('cat: ' + a + ': Is a directory'), code: 1 };
        if (node.type === 'elf') {
          return {
            err: red('cat: ' + a + ': binary file — in ra toàn ký tự rác ^?ELF^C@…') + '\n' +
              'Đây là file ELF (chương trình dịch). Đọc nó bằng ' + bold('strings') + ', ' + bold('xxd') + ' hoặc mở trong ' + bold('Ghidra') + '.',
            code: 1
          };
        }
        outs.push(node.content.replace(/\n$/, ''));
      }
      return { out: outs.join('\n'), code: 0 };
    }
  });

  /* ---------------- file ---------------- */
  def('file', {
    desc: 'nhận diện loại file',
    man: 'file — nhận diện loại file bằng magic bytes.\nDùng: file FILE...\nELF 64-bit x86-64 = chương trình Linux đã dịch.\nLà công cụ đầu tiên bạn nên chạy với mọi file lạ.',
    run: function (args, stdin, ctx) {
      if (!args.length) return { err: red('file: missing operand') + " — thử `file *` sau khi `ls`.", code: 1 };
      const lines = args.map(function (a) {
        const node = ctx.vfs.lookup(a, ctx.cwd);
        if (!node) return red(a + ': cannot open `' + a + "\' (No such file or directory)");
        let desc;
        if (node.type === 'dir') desc = 'directory';
        else if (node.type === 'elf') desc = ctx.bin ? ctx.bin.fileOutput.replace(/^challenge: /, '') : 'ELF 64-bit LSB executable';
        else if (node.type === 'binary') desc = 'data';
        else desc = 'ASCII text';
        return a + ': ' + desc;
      });
      return { out: lines.join('\n'), code: 0 };
    }
  });

  /* ---------------- chmod ---------------- */
  def('chmod', {
    desc: 'đổi quyền file (+x để chạy được)',
    man: 'chmod — đổi mode (quyền) file.\nDùng: chmod +x FILE   (cho phép thực thi)\n     chmod 755 FILE   (rwxr-xr-x)\nFile tải về / copy thường mất bit x — đấy là lý do\n`./challenge` báo Permission denied.',
    run: function (args, stdin, ctx) {
      const mode = args[0], target = args[1];
      if (!mode || !target) return { err: red('chmod: missing operand') + ' — vd: chmod +x challenge', code: 1 };
      const node = ctx.vfs.lookup(target, ctx.cwd);
      if (!node) return { err: red('chmod: cannot access \'' + target + '\': No such file or directory'), code: 1 };
      if (mode === '+x') node.mode = node.mode === '0755' ? node.mode : '0755';
      else if (/^[0-7]{3,4}$/.test(mode)) node.mode = mode.slice(-3);
      else return { err: red('chmod: invalid mode: \'' + mode + '\'') + ' — dùng +x hoặc 755.', code: 1 };
      RQ.Bus.emit('chmod', { level: ctx.levelId });
      return { out: '', code: 0 }; // thành công → im lặng
    }
  });

  /* ---------------- help ---------------- */
  def('help', {
    desc: 'liệt kê lệnh có sẵn',
    run: function (args, stdin, ctx) {
      const names = Object.keys(C).filter(function (n) { return !C[n].hidden; }).sort();
      const lines = ['RevQuest shell — các lệnh có sẵn:', ''];
      names.forEach(function (n) {
        lines.push('  ' + bold(n.padEnd(10)) + C[n].desc);
      });
      lines.push('', 'Gõ `man <lenh>` để xem chi tiết. Tab để tự hoàn tất, ↑↓ để duyệt history.');
      return { out: lines.join('\n'), code: 0 };
    }
  });

  /* ---------------- history ---------------- */
  def('history', {
    desc: 'xem các lệnh đã gõ',
    man: 'history — in các lệnh đã chạy trong phiên.\nMẹo: `!n` chạy lại lệnh thứ n (mẹo thật của bash,\nở đây chỉ xem thôi). ↑↓ lướt nhanh hơn.',
    run: function (args, stdin, ctx) {
      const log = RQ.Store.data.global.commandLog.filter(function (e) { return e.level === ctx.levelId; });
      if (!log.length) return { out: '(chưa có lệnh nào trong level này)', code: 0 };
      return { out: log.map(function (e, i) { return '  ' + String(i + 1).padStart(3) + '  ' + e.cmd; }).join('\n'), code: 0 };
    }
  });

  /* ---------------- echo ---------------- */
  def('echo', {
    desc: 'in text ra stdout',
    man: 'echo — in đối số ra stdout.\nDùng: echo <text>\nHữu nhất khi nối pipe: echo "admin 123" | ./challenge',
    run: function (args) {
      return { out: args.join(' '), code: 0 };
    }
  });

  /* ---------------- printf ---------------- */
  def('printf', {
    desc: 'in text có xử lý \\n, \\t',
    man: 'printf — như echo nhưng xử lý escape \\n \\t.\nDùng: printf "dòng1\\ndòng2"',
    run: function (args) {
      const s = args.join(' ').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      return { out: s, code: 0 };
    }
  });

  /* ---------------- strings ---------------- */
  def('strings', {
    desc: 'rút các chuỗi ASCII ≥4 byte từ file',
    man: 'strings — in các đoạn byte in được (length ≥ 4) trong file.\nDùng: strings FILE\nCông cụ RE đầu tiên trên mọi file lạ. Flag literal,\nURL ẩn, message debug… đều không thoát khỏi strings.',
    run: function (args, stdin, ctx) {
      const target = args.filter(function (a) { return a[0] !== '-'; })[0];
      if (!target && !ctx.stdinIsPipe) {
        return { err: red('strings: missing file operand') + ' — Try: man strings', code: 1 };
      }
      let text;
      if (ctx.stdinIsPipe && !target) {
        text = stdin || '';
      } else {
        const node = ctx.vfs.lookup(target || '.', ctx.cwd);
        if (!node) return { err: red('strings: \'' + target + '\': No such file'), code: 1 };
        if (node.type === 'dir') return { err: red('strings: \'' + target + '\': Is a directory'), code: 1 };
        if (node.type === 'elf') {
          if (!ctx.bin) return { err: red('strings: ' + target + ': không có dữ liệu binary'), code: 1 };
          text = ctx.bin.stringsOut || '';
        } else if (node.type === 'binary') {
          text = node.content || '';
        } else {
          text = node.content || '';
        }
        RQ.Bus.emit('tool-use', { tool: 'strings', level: ctx.levelId });
      }
      // rút đoạn printable ≥4
      const runs = [];
      let cur = '';
      for (const ch of text) {
        const c = ch.codePointAt(0);
        if (c >= 0x20 && c < 0x7f) cur += ch;
        else { if (cur.length >= 4) runs.push(cur); cur = ''; }
      }
      if (cur.length >= 4) runs.push(cur);
      return { out: runs.join('\n'), code: 0 };
    }
  });

  /* ---------------- grep ---------------- */
  def('grep', {
    desc: 'lọc dòng khớp pattern',
    man: 'grep — in các dòng khớp PATTERN (substring hoặc /regex/).\nDùng: grep PATTERN [FILE]   hoặc   ... | grep PATTERN\n  -n  hiện số dòng\n  -i  không phân biệt hoa/thường\nMẹo kinh điển: strings blob.bin | grep REV',
    run: function (args, stdin, ctx) {
      let flags = { n: false, i: false };
      const rest = [];
      args.forEach(function (a) {
        if (a === '-n') flags.n = true;
        else if (a === '-i') flags.i = true;
        else rest.push(a);
      });
      const pattern = rest.shift();
      if (!pattern) return { err: red('grep: missing PATTERN') + ' — vd: grep REV', code: 1 };
      let text = stdin || '';
      let sourceName = null;
      if (rest.length) {
        const node = ctx.vfs.lookup(rest[0], ctx.cwd);
        if (!node) return { err: red('grep: ' + rest[0] + ': No such file or directory'), code: 2 };
        if (node.type === 'elf' || node.type === 'binary') {
          // grep thật với binary: chỉ nói "matches", không in nội dung
          const lines = (node.content || '').split('\n');
          const has = lines.some(function (l) { return re.test(l); });
          return {
            out: has ? 'Binary file ' + rest[0] + ' matches' : '',
            code: has ? 0 : 1,
            err: has ? '\x1b[33m(grep không in nội dung binary — dùng strings trước: strings ' + rest[0] + ' | grep ' + pattern + ')\x1b[0m' : ''
          };
        }
        text = node.type === 'dir' ? '' : (node.content || '');
        sourceName = rest[0];
      }
      let re;
      try {
        re = pattern[0] === '/' && pattern[pattern.length - 1] === '/'
          ? new RegExp(pattern.slice(1, -1), flags.i ? 'i' : '')
          : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.i ? 'i' : '');
      } catch (e) { return { err: red('grep: invalid pattern'), code: 2 }; }

      const lines = text.split('\n');
      const outLines = [];
      lines.forEach(function (l, i) {
        if (re.test(l)) outLines.push((flags.n ? (i + 1) + ':' : '') + l);
      });
      if (sourceName && outLines.length) {
        return { out: outLines.map(function (l) { return sourceName + ':' + l; }).join('\n'), code: 0 };
      }
      return { out: outLines.join('\n'), code: outLines.length ? 0 : 1 };
    }
  });

  /* ---------------- xxd ---------------- */
  def('xxd', {
    desc: 'hex dump file',
    man: 'xxd — hex dump: mỗi dòng 16 byte dạng hex + ASCII.\nDùng: xxd FILE\nNhìn byte thật của file: magic ELF là 7f 45 4c 46.',
    run: function (args, stdin, ctx) {
      const target = args[0];
      let bytes;
      if (ctx.stdinIsPipe && !target) {
        bytes = Array.from(stdin || '').map(function (c) { return c.charCodeAt(0) & 0xff; });
      } else {
        if (!target) return { err: red('xxd: missing file operand'), code: 1 };
        const node = ctx.vfs.lookup(target, ctx.cwd);
        if (!node) return { err: red('xxd: ' + target + ': No such file or directory'), code: 1 };
        if (node.type === 'dir') return { err: red('xxd: ' + target + ': Is a directory'), code: 1 };
        if (node.type === 'elf' && ctx.bin && ctx.bin.xxdOut) {
          return { out: ctx.bin.xxdOut, code: 0 };
        }
        const text = (node.type === 'binary') ? (node.content || '') : (node.content || '');
        bytes = [];
        for (const ch of text) bytes.push(ch.codePointAt(0) & 0xff);
      }
      const lines = [];
      for (let i = 0; i < bytes.length && i < 4096; i += 16) {
        const slice = bytes.slice(i, i + 16);
        const hex = slice.map(function (b) { return b.toString(16).padStart(2, '0'); }).join(' ');
        const asc = slice.map(function (b) { return (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.'; }).join('');
        lines.push(i.toString(16).padStart(8, '0') + ': ' + hex.padEnd(47) + ' ' + asc);
      }
      return { out: lines.join('\n'), code: 0 };
    }
  });

  /* ---------------- man ---------------- */
  def('man', {
    desc: 'đọc tài liệu lệnh',
    man: 'man — manual page. Gõ man <lenh>.\nNgười đọc man page không bao giờ bế tắc lâu.',
    run: function (args, stdin, ctx) {
      const topic = args[0];
      if (!topic) return { err: red('What manual page do you want?') + ' — vd: man strings', code: 1 };
      const cmd = RQ.Shell.commands[topic];
      if (!cmd || !cmd.man) return { err: red('No manual entry for ' + topic), code: 1 };
      RQ.Store.data.global.manPagesRead[topic] = (RQ.Store.data.global.manPagesRead[topic] || 0) + 1;
      RQ.Store.save();
      RQ.Bus.emit('tool-use', { tool: 'man:' + topic, level: ctx.levelId });
      return { out: cmd.man, code: 0, long: true };
    }
  });

  /* ---------------- objdump ---------------- */
  def('objdump', {
    desc: 'disassemble binary (-d)',
    man: 'objdump -d — disassemble các section có code.\nDùng: objdump -d FILE\nOutput AT&T syntax của GNU binutils. Ghidra dễ đọc hơn\nnhưng objdump có ở mọi nơi.',
    run: function (args, stdin, ctx) {
      const target = args.filter(function (a) { return a[0] !== '-'; })[0];
      if (!target) return { err: red('objdump: Usage: objdump -d FILE'), code: 1 };
      const node = ctx.vfs.lookup(target, ctx.cwd);
      if (!node || node.type !== 'elf') return { err: red('objdump: \'' + target + '\': Not an ELF file'), code: 1 };
      if (!ctx.bin) return { err: red('objdump: không có dữ liệu binary'), code: 1 };
      RQ.Bus.emit('tool-use', { tool: 'objdump', level: ctx.levelId });
      return { out: ctx.bin.objdumpOut || '(trống)', code: 0, long: true };
    }
  });

  /* ---------------- readelf ---------------- */
  def('readelf', {
    desc: 'xem ELF header/sections (-h)',
    man: 'readelf -h — in ELF header: entry point, architecture, số section.\nDùng: readelf -h FILE',
    run: function (args, stdin, ctx) {
      const target = args.filter(function (a) { return a[0] !== '-'; })[0];
      if (!target) return { err: red('readelf: Usage: readelf <option(s)> file(s)'), code: 1 };
      const node = ctx.vfs.lookup(target, ctx.cwd);
      if (!node || node.type !== 'elf') return { err: red('readelf: Error: Not an ELF file'), code: 1 };
      if (!ctx.bin) return { err: red('readelf: không có dữ liệu binary'), code: 1 };
      RQ.Bus.emit('tool-use', { tool: 'readelf', level: ctx.levelId });
      return { out: ctx.bin.readelfOut || '(trống)', code: 0, long: true };
    }
  });

  /* ---------------- ltrace ---------------- */
  def('ltrace', {
    desc: 'theo dõi library call khi chạy (-e strcmp...)',
    man: 'ltrace — chạy chương trình và in mỗi library call.\nDùng: echo <input> | ltrace ./challenge\nThấy strcmp/getenv/... ngay cả khi source không có.\nRE đường tắt: input sai vẫn thấy đáp án đúng trong call!',
    run: function (args, stdin, ctx) {
      const target = args.filter(function (a) { return a[0] !== '-'; })[0];
      if (!target) return { err: red('ltrace: missing program — vd: ltrace ./challenge'), code: 1 };
      const node = ctx.vfs.lookup(target, ctx.cwd);
      if (!node || node.type !== 'elf') return { err: red('ltrace: \'' + target + '\': Not an ELF executable'), code: 1 };
      if (!ctx.bin || !ctx.bin.ltrace) return { err: red('ltrace: không có trace data cho binary này'), code: 1 };
      RQ.Bus.emit('tool-use', { tool: 'ltrace', level: ctx.levelId });
      const input = (ctx.stdin || '').trim();
      const trace = input ? (ctx.bin.ltrace.withInput(input) || ctx.bin.ltrace.wrong)
                          : (ctx.bin.ltrace.wrong);
      return { out: trace, code: 0, long: (trace.split('\n').length > 22) };
    }
  });

  /* ---------------- clear (xử lý riêng ở terminal.js) ---------------- */
  def('clear', {
    desc: 'xoá màn hình terminal (hoặc Ctrl+L)',
    hidden: true,
    run: function () { return { out: '', code: 0, clearScreen: true }; }
  });

  /* ---------------- thực thi ./file ---------------- */
  RQ.Shell.execFile = function (target, args, ctx) {
    const node = ctx.vfs.lookup(target, ctx.cwd);
    if (!node) return { err: red('bash: ' + target + ': No such file or directory'), code: 127 };
    if (node.type === 'dir') return { err: red('bash: ' + target + ': Is a directory'), code: 126 };
    const exec = node.type !== 'dir' && isExecMode(node.mode);
    if (!exec) {
      return {
        err: red('bash: ./challenge: Permission denied') + '\n' +
          'File chưa có bit thực thi (mode ' + (node.mode || '0644') + '). Sửa bằng: ' + bold('chmod +x challenge'),
        code: 126
      };
    }
    if (node.type !== 'elf') {
      return { err: red('bash: ' + target + ': cannot execute binary file: Exec format error'), code: 126 };
    }
    const bin = ctx.bin || {};
    let out;
    if (bin.run) {
      // binary có mô phỏng hành vi (keygen/branch/patch-aware)
      out = bin.run(ctx.stdin || '', RQ.Patch.get(ctx.levelId), ctx);
    } else {
      out = bin.execOutput || '(chương trình không in gì)\n';
    }
    RQ.Bus.emit('exec', { level: ctx.levelId, bin: node.binary });
    return { out: out, code: 0 };
  };
})(window.RevQuest);
