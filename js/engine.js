/* ============================================================
 * RevQuest — engine.js
 * Core: namespace, state store + event bus (localStorage),
 * markdown renderer mini, C/asm highlighter + pair-sync,
 * confetti, toast, tiện ích chung.
 * ============================================================ */
window.RevQuest = window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  /* ---------------- DOM utils ---------------- */
  RQ.el = function (tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  RQ.esc = esc;

  RQ.hex = function (v, digits) {
    digits = digits || 8;
    let x = (v >>> 0).toString(16).toUpperCase();
    while (x.length < digits) x = '0' + x;
    return '0x' + x;
  };

  /* ---------------- Event bus ---------------- */
  const Bus = RQ.Bus = {
    _subs: {},
    on: function (type, fn) {
      (this._subs[type] = this._subs[type] || []).push(fn);
    },
    emit: function (type, detail) {
      detail = detail || {};
      detail.type = type;
      detail.ts = Date.now();
      (this._subs[type] || []).forEach(function (fn) { try { fn(detail); } catch (e) { console.error(e); } });
      (this._subs['*'] || []).forEach(function (fn) { try { fn(detail); } catch (e) { console.error(e); } });
    }
  };

  /* ---------------- State store ---------------- */
  const STORE_KEY = 'revquest_save_v1';

  function defaults() {
    return {
      startedAt: Date.now(),
      currentLevel: 0,
      maxLevelReached: 0,
      levels: {},          // id -> { passed, fails, hints:[], solvedVia:[], creditedPaths:[], toolsUsed:{} }
      badges: {},          // badgeId -> timestamp
      global: {
        commandLog: [],    // {cmd, level, ts}
        pipesUsed: 0,
        manPagesRead: {},  // topic -> count
        typoCounts: {},    // gõ sai -> count
        consecutiveErrors: 0,
        maxConsecutiveErrors: 0,
        xrefJumps: 0,
        graphOpens: 0,
        renames: {},       // level -> [đã rename]
        breakpoints: 0,
        patches: 0,
        scriptsRun: 0,
        shortcutsSeen: {},
        execRuns: 0,
        patchByLevel: {},  // level -> { addr: hexByte mới }
        panelsOpened: {}
      }
    };
  }

  /* Patch state: byte đã sửa trong hex editor, theo level */
  RQ.Patch = {
    get: function (level) {
      return (RQ.Store.data.global.patchByLevel || {})[String(level)] || {};
    },
    set: function (level, addr, hexByte) {
      const g = RQ.Store.data.global;
      if (!g.patchByLevel) g.patchByLevel = {};
      if (!g.patchByLevel[String(level)]) g.patchByLevel[String(level)] = {};
      g.patchByLevel[String(level)][addr] = hexByte;
      g.patches++;
      RQ.Store.save();
      RQ.Bus.emit('patch', { level: level, addr: addr, byte: hexByte });
    },
    clear: function (level) {
      const g = RQ.Store.data.global;
      if (g.patchByLevel) delete g.patchByLevel[String(level)];
      RQ.Store.save();
    }
  };

  let saveTimer = null;
  const Store = RQ.Store = {
    data: null,
    load: function () {
      try { this.data = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { this.data = null; }
      const d = defaults();
      if (!this.data || typeof this.data !== 'object') this.data = d;
      // merge default keys (forward-compat khi thêm field mới)
      Object.keys(d).forEach(function (k) {
        if (Store.data[k] === undefined) Store.data[k] = d[k];
      });
      Object.keys(d.global).forEach(function (k) {
        if (Store.data.global[k] === undefined) Store.data.global[k] = d.global[k];
      });
      return this.data;
    },
    save: function () {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(Store.data)); } catch (e) { /* private mode */ }
      }, 250);
    },
    saveNow: function () {
      clearTimeout(saveTimer);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch (e) {}
    },
    ensureLevel: function (id) {
      const k = String(id);
      if (!this.data.levels[k]) {
        this.data.levels[k] = { passed: false, fails: 0, hints: [], solvedVia: [], creditedPaths: [], toolsUsed: {} };
      }
      return this.data.levels[k];
    },
    reset: function () {
      localStorage.removeItem(STORE_KEY);
      this.load();
    },
    passedCount: function (total) {
      let n = 0;
      for (let i = 0; i < total; i++) {
        const r = this.data.levels[String(i)];
        if (r && r.passed) n++;
      }
      return n;
    }
  };

  /* Badge context — snapshot ngữ nghĩa cho badge engine */
  RQ.badgeCtx = function () {
    return Store.data; // badge cond trực tiếp đọc data; bọc thêm helper nếu cần
  };

  /* ---------------- Tool unlock (Metroidvania) ---------------- */
  RQ.TOOLS = [
    { id: 'terminal',       name: 'Terminal',        baseLevel: 0 },
    { id: 'strings-panel',  name: 'Strings panel',   baseLevel: 1 },
    { id: 'listing',        name: 'Listing (asm)',   baseLevel: 1 },
    { id: 'decompiler',     name: 'Decompiler (C)',  baseLevel: 3 },
    { id: 'xrefs',          name: 'Xrefs panel',     baseLevel: 4 },
    { id: 'graph',          name: 'Graph view (CFG)', baseLevel: 5 },
    { id: 'rename',         name: 'Rename + comment', baseLevel: 6 },
    { id: 'hex',            name: 'Hex editor + patch', baseLevel: 7 },
    { id: 'script',         name: 'Script console',  baseLevel: 8 }
  ];

  RQ.toolUnlocked = function (id) {
    const t = RQ.TOOLS.find(function (x) { return x.id === id; });
    if (!t) return false;
    return Store.data.maxLevelReached >= t.baseLevel;
  };

  /* Tên symbol hiện hành (rename propagation sẽ cắm vào đây ở M4) */
  RQ.renames = {}; // addr -> tên mới (session + persisted qua Store.global.renames)
  RQ.resolveName = function (addr, fallback) {
    return RQ.renames[addr] || fallback;
  };

  /* ---------------- Markdown renderer (mini) ---------------- */
  function inlineMd(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  }

  function splitRow(line) {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); });
  }

  RQ.md = function (text) {
    const root = RQ.el('div', 'md');
    const lines = String(text).replace(/\r\n/g, '\n').split('\n');
    let i = 0, para = [];
    function flush() { if (para.length) { root.appendChild(RQ.el('p', null, inlineMd(para.join(' ')))); para = []; } }

    while (i < lines.length) {
      const line = lines[i];
      const fence = line.match(/^\s*```\s*(\w*)\s*$/);
      if (fence) {
        flush();
        const lang = fence[1] || '';
        const buf = []; i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        root.appendChild(RQ.codeblock(lang, buf.join('\n')));
        continue;
      }
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flush(); root.appendChild(RQ.el('h' + h[1].length, null, inlineMd(h[2]))); i++; continue; }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flush(); root.appendChild(RQ.el('hr')); i++; continue; }
      if (/^>\s?/.test(line)) {
        flush();
        const bq = RQ.el('blockquote');
        while (i < lines.length && /^>\s?/.test(lines[i])) { bq.appendChild(RQ.el('p', null, inlineMd(lines[i].replace(/^>\s?/, '')))); i++; }
        root.appendChild(bq); continue;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        flush();
        const ul = RQ.el('ul');
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { ul.appendChild(RQ.el('li', null, inlineMd(lines[i].replace(/^\s*[-*]\s+/, '')))); i++; }
        root.appendChild(ul); continue;
      }
      if (/^\s*\d+[.)]\s+/.test(line)) {
        flush();
        const ol = RQ.el('ol');
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { ol.appendChild(RQ.el('li', null, inlineMd(lines[i].replace(/^\s*\d+[.)]\s+/, '')))); i++; }
        root.appendChild(ol); continue;
      }
      if (line.indexOf('|') !== -1 && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
        flush();
        const header = splitRow(line); i += 2;
        const rows = [];
        while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== '') { rows.push(splitRow(lines[i])); i++; }
        const t = RQ.el('table');
        const trh = RQ.el('tr');
        header.forEach(function (c) { trh.appendChild(RQ.el('th', null, inlineMd(c))); });
        t.appendChild(trh);
        rows.forEach(function (r) {
          const tr = RQ.el('tr');
          r.forEach(function (c) { tr.appendChild(RQ.el('td', null, inlineMd(c))); });
          t.appendChild(tr);
        });
        root.appendChild(t); continue;
      }
      if (line.trim() === '') { flush(); i++; continue; }
      para.push(line.trim()); i++;
    }
    flush();
    pairSync(root);
    return root;
  };

  /* ---------------- Highlighter C/asm ---------------- */
  function rulesFor(lang) {
    if (lang === 'c') {
      return [
        { cls: 'com', re: /\/\/[^\n]*/y },
        { cls: 'com', re: /\/\*[\s\S]*?\*\//y },
        { cls: 'str', re: /"(?:[^"\\\n]|\\.)*"/y },
        { cls: 'str', re: /'(?:[^'\\\n]|\\.)'/y },
        { cls: 'kw',  re: /\b(?:int|char|void|unsigned|signed|long|short|const|struct|return|if|else|for|while|do|sizeof|break|continue|static|include|define)\b/y },
        { cls: 'num', re: /\b0x[0-9a-fA-F]+\b|\b\d+\b/y },
        { cls: 'fn',  re: /\b[A-Za-z_]\w*(?=\s*\()/y },
        { cls: 'id',  re: /\b[A-Za-z_]\w*\b/y }
      ];
    }
    if (lang === 'asm') {
      return [
        { cls: 'com', re: /(?:;|#)[^\n]*/y },
        { cls: 'lbl', re: /^[A-Za-z_.$][\w.$]*:/y },
        { cls: 'dir', re: /\.[\w.]+/y },
        { cls: 'mnem', re: /\b(?:push|pop|mov|movzx|movsx|lea|call|ret|leave|nop|endbr64|add|sub|imul|idiv|inc|dec|cmp|test|jmp|je|jne|jg|jl|jge|jle|ja|jb|and|or|xor|shl|shr)\b/y },
        { cls: 'reg', re: /\b(?:eax|ebx|ecx|edx|esi|edi|esp|ebp|rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|eip|rip|al|bl|cl|dl|r[0-9]+d?)\b/y },
        { cls: 'num', re: /\b0x[0-9a-fA-F]+\b|\b\d+\b/y },
        { cls: 'id',  re: /\b[A-Za-z_][\w-]*\b/y }
      ];
    }
    return null;
  }

  function highlightLine(line, rules) {
    if (!rules) return esc(line);
    let out = '', pos = 0;
    while (pos < line.length) {
      let matched = null;
      for (const r of rules) {
        r.re.lastIndex = pos;
        const m = r.re.exec(line);
        if (m && m.index === pos && m[0].length > 0) { matched = { cls: r.cls, text: m[0] }; break; }
      }
      if (matched) {
        out += matched.cls === 'id' ? esc(matched.text)
          : '<span class="tok-' + matched.cls + '">' + esc(matched.text) + '</span>';
        pos += matched.text.length;
      } else { out += esc(line[pos]); pos++; }
    }
    return out;
  }

  const MK_RE = /(?:\/\/|;|#)\s*§(\w+)\s*$/;

  RQ.codeblock = function (lang, code) {
    const pre = RQ.el('div', 'codeblock');
    const codeEl = RQ.el('code', null);
    const rules = rulesFor(lang);
    code.split('\n').forEach(function (line) {
      const lineEl = RQ.el('span', 'hl-line', highlightLine(line, rules));
      const mk = line.match(MK_RE);
      if (mk) lineEl.dataset.mk = mk[1];
      codeEl.appendChild(lineEl);
    });
    pre.appendChild(codeEl);
    pre.dataset.lang = lang;
    return pre;
  };

  function clearHi(block) {
    block.querySelectorAll('.hl-line.mk-hi').forEach(function (x) { x.classList.remove('mk-hi'); });
  }
  function pairSyncHover(from, to) {
    from.addEventListener('mouseover', function (e) {
      const lineEl = e.target.closest('.hl-line');
      if (!lineEl || !lineEl.dataset.mk) return;
      clearHi(from); clearHi(to);
      to.querySelectorAll('.hl-line[data-mk="' + lineEl.dataset.mk + '"]').forEach(function (x) { x.classList.add('mk-hi'); });
      lineEl.classList.add('mk-hi');
    });
    from.addEventListener('mouseout', function () { clearHi(from); clearHi(to); });
  }
  function pairSync(root) {
    const kids = Array.prototype.slice.call(root.children);
    for (let i = 0; i < kids.length - 1; i++) {
      const a = kids[i], b = kids[i + 1];
      if (a.classList && a.classList.contains('codeblock') && b.classList &&
          a.dataset.lang === 'c' && b.dataset.lang === 'asm') {
        const pair = RQ.el('div', 'pair');
        a.parentNode.insertBefore(pair, a);
        pair.appendChild(a); pair.appendChild(b);
        pairSyncHover(a, b); pairSyncHover(b, a);
        i++;
      }
    }
  }

  /* ---------------- Confetti + toast ---------------- */
  RQ.confetti = function () {
    const canvas = RQ.el('canvas', 'confetti-canvas');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#4ec9b0', '#569cd6', '#b5cea8', '#ce9178', '#dcdcaa'];
    const parts = [];
    for (let i = 0; i < 90; i++) {
      parts.push({
        x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.4,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        vy: 2.2 + Math.random() * 3, vx: -1.2 + Math.random() * 2.4,
        rot: Math.random() * Math.PI, vr: -0.12 + Math.random() * 0.24,
        color: colors[(Math.random() * colors.length) | 0]
      });
    }
    let frames = 0;
    (function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frames++;
      if (frames < 160) requestAnimationFrame(tick); else canvas.remove();
    })();
  };

  RQ.toast = function (html, cls) {
    const t = RQ.el('div', 'toast ' + (cls || ''), html);
    document.getElementById('toasts').appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 20);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 400);
    }, 4200);
  };
})(window.RevQuest);
