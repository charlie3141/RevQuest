/* ============================================================
 * RevQuest — ghidra/panels.js
 * Workbench: layout 3 cột + terminal dock, mount mọi panel theo tool
 * đã unlock, wire cross-highlight + xref jump + rename (N) + graph (Space)
 * + back (Esc). Levels 3+ gọi hàm này thay vì tự dựng.
 *
 * RQ.Ghidra.workbench(container, {
 *   levelId, bin, flagPlaceholder,
 *   pathsMeta: {strings?: pathId},   // string panel có credit path nào
 *   onSubmit: tự có qua renderFlagSubmit — panel chỉ dựng GUI
 * })
 * Trả về { api } — api.creditPath/fail... do level giữ.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Ghidra.workbench = function (container, opts) {
    const bin = opts.bin;
    const levelId = opts.levelId;

    const grid = RQ.el('div', 'ghidra-grid');
    const leftCol = RQ.el('div', 'ghidra-left');
    const centerCol = RQ.el('div', 'ghidra-center');
    grid.appendChild(leftCol); grid.appendChild(centerCol);
    container.appendChild(grid);

    const termWrap = RQ.el('div', 'demo-terminal dock');
    container.appendChild(termWrap);

    // ---- LISTING (luôn có)
    const listing = RQ.Ghidra.listing(centerCol, bin, {
      levelId: levelId,
      onSelect: function (instr) {
        if (decomp) decomp.highlightForAsm(instr.addr);
        if (xrefs) xrefs.updateForInstr(instr.addr);
        if (instr.comment && /((?:REV|PWN)\{)/.test(instr.comment) && opts.pathsMeta && opts.pathsMeta.listing) {
          opts.api.creditPath(opts.pathsMeta.listing);
          RQ.Bus.emit('flag-revealed', { path: opts.pathsMeta.listing, level: levelId, value: instr.comment });
        }
      }
    });

    // ---- phải: decompiler (+ xrefs) chỉ khi đã unlock
    let decomp = null, xrefs = null, graph = null;
    if (RQ.toolUnlocked('decompiler')) {
      const rightCol = RQ.el('div', 'ghidra-right');
      grid.appendChild(rightCol);
      grid.classList.add('has-right');
      decomp = RQ.Ghidra.decompiler(rightCol, bin, {
        levelId: levelId,
        onJumpAsm: function (addr) { listing.jumpTo(addr); }
      });
      if (RQ.toolUnlocked('xrefs')) {
        xrefs = RQ.Ghidra.xrefs(rightCol, bin, {
          levelId: levelId,
          onJump: function (addr) { listing.jumpTo(addr); }
        });
      }
      RQ.Bus.on('listing-select', function (e) {
        if (e.level === levelId && decomp) decomp.highlightForAsm(e.addr);
      });
    }

    RQC_symbols();

    function RQC_symbols() {
      const leftStack = RQ.el('div', 'left-stack');
      leftCol.appendChild(leftStack);
      RQ.Ghidra.symbols(leftStack, bin, {
        levelId: levelId,
        onSelectFunction: function (fn) {
          listing.selectFunction(fn);
          if (decomp) decomp.show(fn);
        }
      });
      RQ.Ghidra.stringsPanel(leftStack, bin, {
        levelId: levelId,
        pathId: opts.pathsMeta ? opts.pathsMeta.strings : undefined,
        onJump: function (addr) { listing.jumpTo(addr); }
      });
      // graph panel ở dưới trái
      if (RQ.toolUnlocked('graph')) {
        const holder = RQ.el('div', 'graph-slot');
        leftStack.appendChild(holder);
        graph = RQ.Ghidra.graph(holder, bin, {
          levelId: levelId,
          onNodeClick: function (n) { listing.jumpTo(n.addr); }
        });
      }
      // hex editor (level 7+)
      if (RQ.toolUnlocked('hex') && bin.hexDump) {
        const hexHolder = RQ.el('div', 'hex-slot');
        leftStack.appendChild(hexHolder);
        RQ.Ghidra.hex(hexHolder, bin, { levelId: levelId });
      }
      // locked chips
      const locked = RQ.el('div', 'gpanel locked-panel');
      locked.appendChild(RQ.el('div', 'panel-title', 'TOOLS SẮP MỞ'));
      RQ.TOOLS.forEach(function (t) {
        if (['terminal', 'strings-panel', 'listing'].indexOf(t.id) !== -1) return;
        if (unMounted(t.id)) return;
        const un = RQ.toolUnlocked(t.id);
        locked.appendChild(RQ.el('div', 'panel-row tool-row' + (un ? '' : ' tool-locked'),
          '<span class="panel-addr">L' + t.baseLevel + '</span> ' + (un ? '🔓' : '🔒') + ' ' + RQ.esc(t.name)));
      });
      leftStack.appendChild(locked);
    }

    function unMounted(id) {
      if (id === 'decompiler') return true;      // đã ở cột phải
      if (id === 'xrefs') return true;
      if (id === 'graph' && graph) return true;  // đã mount
      if (id === 'hex' && bin.hexDump && RQ.toolUnlocked('hex')) return true;
      if (id === 'script') return true;          // script console riêng ở level 8
      return false;
    }

    // ---- terminal dock
    const term = RQ.Terminal(termWrap, {
      levelId: levelId,
      cwdParts: ['home', 'player', 'challenges', 'level' + levelId],
      bin: bin
    });

    // ---- keyboard: N rename, Space graph, Esc back
    let selAddr = null;
    RQ.Bus.on('listing-select', function (e) { if (e.level === levelId) selAddr = e.addr; });

    document.addEventListener('keydown', function (e) {
      if (!container.offsetParent) return;
      const inInput = ['INPUT', 'TEXTAREA'].indexOf(document.activeElement.tagName) !== -1;
      if (inInput) return;

      if (e.key === 'n' || e.key === 'N') {
        if (selAddr == null) { RQ.toast('Chọn 1 dòng asm trước (click vào listing) rồi bấm N.', 'toast-info'); return; }
        const fn = (bin.ghidra.functions || []).find(function (f) {
          return f.addr === selAddr;
        });
        const cur = fn ? RQ.resolveName(selAddr, fn.name) : null;
        if (!fn) {
          // rename string label? chỉ hỗ trợ hàm ở đây
          RQ.toast('Đang chọn instruction, không phải hàm. Click tab hàm trong listing để rename hàm.', 'toast-info');
          return;
        }
        const name = prompt('Rename ' + cur + ' → :', cur);
        if (name && name !== cur) {
          RQ.Renamer.rename(levelId, selAddr, name);
          RQ.toast('✍️ Đã rename → <b>' + RQ.esc(name) + '</b> — lan truyền mọi panel.', 'toast-info');
          RQ.App.rerender();
        }
        if (!RQ.Store.data.global.shortcutsSeen['N']) {
          RQ.Store.data.global.shortcutsSeen['N'] = 1; RQ.Store.save();
          RQ.toast('💡 <b>N</b> = rename — dân RE đặt tên hàm hàng trăm lần/ngày.', 'toast-badge');
        }
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        // back: về level trước? Không — Esc chỉ thoát modal/pager; ghi tooltip
      }
    });

    return { listing: listing, term: term };
  };

  /* ---- rename store + propagation ---- */
  RQ.Renamer = {
    map: function (level) {
      const r = RQ.Store.data.global.renames;
      if (!r[String(level)]) r[String(level)] = {};
      return r[String(level)];
    },
    rename: function (level, addr, name) {
      this.map(level)[addr] = name;
      RQ.Store.data.global.renames = RQ.Store.data.global.renames || {};
      RQ.Store.save();
      RQ.Bus.emit('rename', { level: level, addr: addr, name: name });
    },
    /** áp renames vào data clone trước khi mount panel */
    applyTo: function (bin, level) {
      const map = this.map(level);
      const functions = (bin.ghidra && bin.ghidra.functions) || [];
      functions.forEach(function (f) {
        if (map[f.addr]) f.displayName = map[f.addr];
      });
      return bin;
    }
  };

  // resolveName đọc renames mọi level
  RQ.resolveName = function (addr, fallback) {
    const g = RQ.Store.data ? RQ.Store.data.global : null;
    if (g && g.renames) {
      for (const k of Object.keys(g.renames)) {
        if (g.renames[k][addr]) return g.renames[k][addr];
      }
    }
    return fallback;
  };
})(window.RevQuest);
