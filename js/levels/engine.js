/* ============================================================
 * RevQuest — levels/engine.js
 * Level registry, hash router, 4 tabs (THEORY/DEMO/CHALLENGE/SOLUTION),
 * hint 3 cấp, flag submit, solution-lock (pass hoặc fail≥3),
 * tool dock (Metroidvania), badges modal.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  const App = RQ.App = {
    levels: [],
    current: null,

    init: function () {
      RQ.VFS.build(this.levels);
      RQ.Badges.init();
      RQ.Store.load();

      const self = this;
      document.getElementById('reset-btn').addEventListener('click', function () {
        if (confirm('Xoá toàn bộ tiến độ, badge và history terminal?')) {
          RQ.Store.reset();
          location.hash = '';
          self.show(0, true);
        }
      });
      document.getElementById('badges-btn').addEventListener('click', function () {
        self.renderBadgesModal();
        document.getElementById('badges-modal').classList.add('open');
      });
      document.querySelector('#badges-modal .modal-close').addEventListener('click', function () {
        document.getElementById('badges-modal').classList.remove('open');
      });
      document.getElementById('badges-modal').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('open');
      });

      window.addEventListener('hashchange', function () {
        const m = location.hash.match(/^#\/?(\d+)/);
        if (m) self.show(parseInt(m[1], 10));
      });

      // track tool usage toàn cục (cho badge engine)
      RQ.Bus.on('tool-use', function (e) {
        if (e.level == null || e.level < 0) return;
        const rec = RQ.Store.ensureLevel(e.level);
        rec.toolsUsed[e.tool] = (rec.toolsUsed[e.tool] || 0) + 1;
        RQ.Store.save();
      });
      RQ.Bus.on('exec', function (e) {
        if (e.level == null) return;
        const rec = RQ.Store.ensureLevel(e.level);
        rec.toolsUsed.exec = (rec.toolsUsed.exec || 0) + 1;
        RQ.Store.data.global.execRuns++;
        RQ.Store.save();
      });

      const m = location.hash.match(/^#\/?(\d+)/);
      this.show(m ? parseInt(m, 10) : (RQ.Store.data.currentLevel || 0), true);
    },

    levelById: function (id) {
      return this.levels.find(function (l) { return l.id === id; }) || null;
    },

    show: function (id, force) {
      let lv = this.levelById(id);
      if (!lv) { id = this.levels[0] ? this.levels[0].id : 0; lv = this.levelById(id); if (!lv) return; }
      if (!force && this.current === id) return;

      this.current = id;
      const store = RQ.Store;
      store.data.currentLevel = id;
      store.data.maxLevelReached = Math.max(store.data.maxLevelReached, id);
      store.save();
      if (location.hash !== '#/' + id) location.hash = '#/' + id;
      window.scrollTo({ top: 0 });
      document.title = 'Level ' + id + ': ' + lv.title + ' — RevQuest';

      this.renderNav();
      this.renderLevel(lv);
    },

    renderNav: function () {
      const nav = document.getElementById('level-nav');
      nav.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const dot = RQ.el('button', 'lvl-dot', String(i));
        dot.title = 'Level ' + i;
        const rec = RQ.Store.data.levels[String(i)];
        if (rec && rec.passed) dot.classList.add('passed');
        if (i === this.current) dot.classList.add('current');
        if (!this.levelById(i)) { dot.classList.add('locked'); dot.disabled = true; dot.title = 'Sắp ra mắt'; }
        else dot.addEventListener('click', this.show.bind(this, i));
        nav.appendChild(dot);
      }
      document.getElementById('progress').innerHTML =
        'Level: <b>' + RQ.Store.passedCount(9) + '</b>/9 · Badge: <b>' + Object.keys(RQ.Store.data.badges).length + '</b>';
    },

    makeApi: function (lv) {
      const self = this;
      return {
        level: lv,
        store: RQ.Store,
        Bus: RQ.Bus,
        creditPath: function (pathId) {
          const rec = RQ.Store.ensureLevel(lv.id);
          if (rec.creditedPaths.indexOf(pathId) === -1) {
            rec.creditedPaths.push(pathId);
            RQ.Store.save();
          }
        },
        trackTool: function (tool) {
          const rec = RQ.Store.ensureLevel(lv.id);
          rec.toolsUsed[tool] = (rec.toolsUsed[tool] || 0) + 1;
          RQ.Store.save();
        },
        pass: function () { self.onPass(lv); },
        fail: function (detail) { self.onFail(lv, detail); },
        status: function (html, cls) {
          const area = document.getElementById('challenge-status');
          area.innerHTML = '';
          area.appendChild(RQ.el('div', 'status-box ' + (cls || 'status-info'), html));
        },
        _statusArea: null
      };
    },

    renderLevel: function (lv) {
      const rec = RQ.Store.ensureLevel(lv.id);
      const header = document.getElementById('level-header');
      header.dataset.lid = lv.id;
      header.innerHTML = '';
      header.appendChild(RQ.el('h1', null, 'Level ' + lv.id + ' — ' + RQ.esc(lv.title)));
      header.appendChild(RQ.el('p', 'level-goal', '<span class="goal-label">🎯 Mục tiêu:</span> ' + RQ.esc(lv.goal)));
      if (lv.unlockTools && RQ.Store.data.maxLevelReached >= lv.id) {
        lv.unlockTools.forEach(function (tid) {
          const t = RQ.TOOLS.find(function (x) { return x.id === tid; });
          if (t) header.appendChild(RQ.el('div', 'unlock-banner', '🔓 Tool mới mở khoá: <b>' + RQ.esc(t.name) + '</b> — "aha moment" đang chờ.'));
        });
      }

      // tabs
      const tabsData = [
        { key: 'theory', label: '📖 THEORY' },
        { key: 'demo', label: '🔬 DEMO' },
        { key: 'challenge', label: '⚔️ CHALLENGE' },
        { key: 'solution', label: (rec.passed || rec.fails >= 3) ? '🔓 SOLUTION' : '🔒 SOLUTION' }
      ];
      const tabsEl = document.getElementById('tabs');
      tabsEl.innerHTML = '';
      const panels = {
        theory: document.getElementById('panel-theory'),
        demo: document.getElementById('panel-demo'),
        challenge: document.getElementById('panel-challenge'),
        solution: document.getElementById('panel-solution')
      };
      let activeTab = RQ.Store.data['tab_' + lv.id] || 'theory';
      const self = this;

      tabsData.forEach(function (t) {
        const locked = t.key === 'solution' && !(rec.passed || rec.fails >= 3);
        const btn = RQ.el('button', 'tab-btn' + (locked ? ' locked' : '') + (t.key === activeTab ? ' active' : ''), t.label);
        btn.addEventListener('click', function () {
          if (t.key === 'solution' && !(RQ.Store.ensureLevel(lv.id).passed || RQ.Store.ensureLevel(lv.id).fails >= 3)) {
            self.renderSolutionLocked(lv);
          }
          tabsEl.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          RQ.Store.data['tab_' + lv.id] = t.key;
          RQ.Store.save();
          Object.keys(panels).forEach(function (k) { panels[k].classList.toggle('active', k === t.key); });
        });
        tabsEl.appendChild(btn);
      });

      Object.keys(panels).forEach(function (k) {
        panels[k].innerHTML = '';
        panels[k].classList.toggle('active', k === activeTab);
      });

      panels.theory.appendChild(RQ.md(lv.theory));

      const api = this._apis = this._apis || {};
      api[lv.id] = this.makeApi(lv);
      lv.initDemo(panels.demo, api[lv.id]);
      this.renderHints(panels.challenge, lv);
      const challengeBody = RQ.el('div', 'challenge-body');
      panels.challenge.appendChild(challengeBody);
      lv.initChallenge(challengeBody, api[lv.id]);
      const statusArea = RQ.el('div', 'challenge-status');
      statusArea.id = 'challenge-status';
      panels.challenge.appendChild(statusArea);
      api[lv.id]._statusArea = statusArea;
      if (rec.passed) this.showPassBox(api[lv.id], false);

      if (rec.passed || rec.fails >= 3) panels.solution.appendChild(RQ.md(lv.solution));
      else this.renderSolutionLocked(lv);
    },

    renderSolutionLocked: function (lv) {
      const panel = document.getElementById('panel-solution');
      panel.innerHTML = '';
      panel.appendChild(RQ.el('div', 'solution-locked',
        '<div class="lock-icon">🔒</div><p><b>Solution chưa mở khoá.</b></p>' +
        '<p>Solve challenge để mở — hoặc fail 3 lần (không xấu hổ gì, RE là môn thử-sai).</p>' +
        '<p style="font-size:13px">Fail hiện tại: ' + RQ.Store.ensureLevel(lv.id).fails + '/3</p>'));
    },

    renderHints: function (panel, lv) {
      const drawer = RQ.el('div', 'hint-drawer');
      drawer.appendChild(RQ.el('div', 'hint-title', '💡 GỢI Ý (3 cấp — mở lần lượt, mỗi cây dữ hơn)'));
      const btns = RQ.el('div', 'hint-btns');
      const shown = RQ.el('div');
      const rec = RQ.Store.ensureLevel(lv.id);

      for (let h = 0; h < 3; h++) {
        const btn = RQ.el('button', 'btn btn-sm', 'Hint ' + (h + 1));
        btn.disabled = h > rec.hints.length;
        btn.addEventListener('click', function () {
          const r = RQ.Store.ensureLevel(lv.id);
          if (r.hints.indexOf(h) === -1) r.hints.push(h);
          RQ.Store.save();
          showHint(h);
          btns.querySelectorAll('button').forEach(function (b, bi) { b.disabled = bi > r.hints.length; });
        });
        btns.appendChild(btn);
      }
      drawer.appendChild(btns);
      drawer.appendChild(shown);
      function showHint(h) {
        if (shown.children[h]) return;
        const item = RQ.el('div', 'hint-item', '<span class="hint-tag">HINT ' + (h + 1) + ':</span> ' + RQ.esc(lv.hints[h]));
        shown.appendChild(item);
        Array.prototype.slice.call(shown.children)
          .sort(function (a, b) {
            return (+a.querySelector('.hint-tag').textContent.slice(-1)) - (+b.querySelector('.hint-tag').textContent.slice(-1));
          })
          .forEach(function (it) { shown.appendChild(it); });
      }
      rec.hints.forEach(showHint);
      panel.appendChild(drawer);
    },

    /* ---- flag submit + pass/fail ---- */
    onPass: function (lv) {
      const rec = RQ.Store.ensureLevel(lv.id);
      const first = !rec.passed;
      rec.passed = true;
      rec.passedAt = rec.passedAt || Date.now();
      RQ.Store.save();
      this.showPassBox(this.apiOf(lv), first);
      if (first) {
        RQ.confetti();
        const tabsEl = document.getElementById('tabs');
        const solBtn = tabsEl.querySelectorAll('.tab-btn')[3];
        if (solBtn) { solBtn.classList.remove('locked'); solBtn.textContent = '🔓 SOLUTION'; }
        const panel = document.getElementById('panel-solution');
        panel.innerHTML = '';
        panel.appendChild(RQ.md(lv.solution));
        RQ.Bus.emit('level-pass', { level: lv.id, via: rec.solvedVia });
        this.renderNav();
      }
    },

    showPassBox: function (api, first) {
      const lv = api.level;
      if (!api._statusArea) return;
      api._statusArea.innerHTML = '';
      const rec = RQ.Store.ensureLevel(lv.id);
      const box = RQ.el('div', 'flagbox');
      const viaTxt = (rec.solvedVia.length ? 'Đường đã dùng: <b>' + rec.solvedVia.join(', ') + '</b> — còn đường khác để thử lại cho badge!' : '');
      box.innerHTML = '<div class="flag-title">' + (first ? '🎉 Chính xác! Level ' + lv.id + ' hoàn thành!' : '✅ Bạn đã pass level này.') + '</div>' +
        '<div style="margin:8px 0">Flag: <span class="flag-value">' + RQ.esc(lv.flag) + '</span></div>' +
        (viaTxt ? '<div style="font-size:13px;color:var(--muted)">' + viaTxt + '</div>' : '');
      const next = this.levelById(lv.id + 1);
      if (next) {
        const btn = RQ.el('button', 'btn btn-primary', 'Level ' + next.id + ' →');
        btn.addEventListener('click', function () { RQ.App.show(next.id); });
        box.appendChild(btn);
      } else {
        box.appendChild(RQ.el('div', null, '<span style="color:var(--muted)">Bạn đã đi hết các level hiện có! 🏆</span>'));
      }
      api._statusArea.appendChild(box);
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    onFail: function (lv, detailHtml) {
      const rec = RQ.Store.ensureLevel(lv.id);
      rec.fails++;
      RQ.Store.save();
      const api = this.apiOf(lv);
      if (api._statusArea) {
        api._statusArea.innerHTML = '';
        const box = RQ.el('div', 'status-box status-err');
        box.innerHTML = '<div class="err-title">✗ FLAG CHƯA ĐÚNG</div>' + (detailHtml || '');
        box.appendChild(RQ.el('div', 'fail-count', 'Fail: ' + rec.fails + '/3'));
        if (rec.fails >= 3) {
          box.insertAdjacentHTML('beforeend', '<div style="margin-top:8px">🔓 <b>Solution đã mở</b> (tab SOLUTION) — nhưng thử tiếp vẫn được!</div>');
          const solBtn = document.getElementById('tabs').querySelectorAll('.tab-btn')[3];
          if (solBtn) { solBtn.classList.remove('locked'); solBtn.textContent = '🔓 SOLUTION'; }
          const panel = document.getElementById('panel-solution');
          panel.innerHTML = '';
          panel.appendChild(RQ.md(lv.solution));
        }
        api._statusArea.appendChild(box);
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },

    apiOf: function (lv) {
      return (this._apis || {})[lv.id];
    },

    /** re-render level hiện tại (sau rename) */
    rerender: function () {
      if (this.current != null) this.renderLevel(this.levelById(this.current));
    },

    /* ---- badges modal ---- */
    renderBadgesModal: function () {
      const modal = document.getElementById('badges-modal');
      const list = modal.querySelector('.badges-list');
      list.innerHTML = '';
      const defs = RQ.Badges.definitions || [];
      defs.forEach(function (d) {
        const earned = !!RQ.Store.data.badges[d.id];
        const stars = '★'.repeat(d.stars) + '☆'.repeat(Math.max(0, 5 - d.stars));
        list.appendChild(RQ.el('div', 'badge-card' + (earned ? ' earned' : ''),
          '<div class="badge-icon">' + (earned ? d.icon : '🔒') + '</div>' +
          '<div class="badge-info"><div class="badge-name">' + RQ.esc(d.name) + ' <span class="badge-stars">' + stars + '</span></div>' +
          '<div class="badge-desc">' + RQ.esc(d.desc) + '</div></div>'));
      });
      const p = modal.querySelector('.badges-progress');
      p.innerHTML = 'Đã đạt <b>' + Object.keys(RQ.Store.data.badges).length + '</b>/' + defs.length + ' badge';
    }
  };

  /* level registry */
  RQ.registerLevel = function (lv) {
    RQ.App.levels.push(lv);
    RQ.App.levels.sort(function (a, b) { return a.id - b.id; });
  };
})(window.RevQuest);
