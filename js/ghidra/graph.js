/* ============================================================
 * RevQuest — ghidra/graph.js
 * CFG view: SVG node-arc như Ghidra Function Graph.
 * Click node → nhảy listing tới addr. Space bật/tắt.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  RQ.Ghidra.graph = function (container, binData, opts) {
    opts = opts || {};
    const wrap = RQ.el('div', 'gpanel graph-panel');
    const title = RQ.el('div', 'panel-title', 'FUNCTION GRAPH — CFG');
    wrap.appendChild(title);
    const fnTabs = RQ.el('div', 'listing-functabs');
    wrap.appendChild(fnTabs);
    const svgHolder = RQ.el('div', 'graph-holder');
    wrap.appendChild(svgHolder);
    container.appendChild(wrap);

    const cfg = (binData.ghidra && binData.ghidra.cfg) || {};
    let current = null;

    function show(fnName) {
      current = fnName;
      title.textContent = 'FUNCTION GRAPH — CFG: ' + fnName;
      fnTabs.innerHTML = '';
      Object.keys(cfg).forEach(function (name) {
        const t = RQ.el('button', 'listing-functab' + (name === fnName ? ' active' : ''), name);
        t.addEventListener('click', function () { show(name); });
        fnTabs.appendChild(t);
      });
      render(cfg[fnName]);
      RQ.Store.data.global.graphOpens++;
      RQ.Store.save();
      RQ.Bus.emit('graph-open', { level: opts.levelId, fn: fnName });
    }

    function render(g) {
      svgHolder.innerHTML = '';
      if (!g) { svgHolder.textContent = '(không có CFG)'; return; }
      const NODE_W = 168, NODE_H = 52, GAP_X = 40, GAP_Y = 70;
      const depth = {}; // BFS để xếp tầng
      const nodes = g.nodes || [];
      const byId = {};
      nodes.forEach(function (n) { byId[n.id] = n; });
      const roots = nodes.filter(function (n) {
        return !nodes.some(function (m) { return (m.succ || []).indexOf(n.id) !== -1; });
      });
      const q = roots.length ? roots.slice() : nodes.slice(0, 1);
      q.forEach(function (n) { depth[n.id] = 0; });
      while (q.length) {
        const n = q.shift();
        (n.succ || []).forEach(function (s) {
          if (depth[s] === undefined) { depth[s] = depth[n.id] + 1; q.push(byId[s]); }
        });
      }
      // vị trí: cùng tầng xếp hàng ngang
      const byDepth = {};
      nodes.forEach(function (n) {
        const d = depth[n.id] || 0;
        (byDepth[d] = byDepth[d] || []).push(n);
      });
      const pos = {};
      Object.keys(byDepth).forEach(function (d) {
        byDepth[d].forEach(function (n, i) {
          pos[n.id] = { x: 20 + i * (NODE_W + GAP_X), y: 16 + (+d) * (NODE_Y(d)) };
        });
      });
      function NODE_Y() { return NODE_H + GAP_Y; }

      const maxD = Math.max.apply(null, Object.keys(byDepth).map(Number));
      const maxRow = Math.max.apply(null, Object.keys(byDepth).map(function (d) { return byDepth[d].length; }));
      const W = Math.max(300, maxRow * (NODE_W + GAP_X) + 40);
      const H = (maxD + 1) * (NODE_H + GAP_Y) + 20;

      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

      // edges
      (g.edges || []).forEach(function (e) {
        const a = pos[e[0]], b = pos[e[1]];
        if (!a || !b) return;
        const path = document.createElementNS(NS, 'path');
        const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H;
        const x2 = b.x + NODE_W / 2, y2 = b.y;
        const midY = (y1 + y2) / 2;
        path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + midY + ' ' + x2 + ' ' + midY + ' ' + x2 + ' ' + (y2 - 6));
        path.setAttribute('class', 'graph-edge');
        svg.appendChild(path);
        // mũi tên
        const arrow = document.createElementNS(NS, 'polygon');
        arrow.setAttribute('points', x2 - 5 + ',' + (y2 - 8) + ' ' + x2 + ',' + (y2 - 1) + ' ' + x2 + 5 + ',' + (y2 - 8));
        arrow.setAttribute('points', (x2 - 5) + ',' + (y2 - 8) + ' ' + x2 + ',' + (y2 - 1) + ' ' + (x2 + 5) + ',' + (y2 - 8));
        arrow.setAttribute('class', 'graph-arrow');
        svg.appendChild(arrow);
      });

      // nodes
      nodes.forEach(function (n) {
        const p = pos[n.id];
        const grp = document.createElementNS(NS, 'g');
        grp.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
        grp.setAttribute('class', 'graph-node');
        grp.style.cursor = 'pointer';
        const rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('width', NODE_W); rect.setAttribute('height', NODE_H);
        rect.setAttribute('rx', 6);
        grp.appendChild(rect);
        const addr = document.createElementNS(NS, 'text');
        addr.setAttribute('x', 8); addr.setAttribute('y', 16);
        addr.setAttribute('class', 'graph-addr');
        addr.textContent = (n.addr || '').replace('0x', '');
        grp.appendChild(addr);
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', 8); label.setAttribute('y', 32);
        label.setAttribute('class', 'graph-label');
        String(n.label || '').split('\\n').slice(0, 2).forEach(function (l, i) {
          const t = document.createElementNS(NS, 'tspan');
          t.setAttribute('x', 8); t.setAttribute('y', 32 + i * 14);
          t.textContent = l;
          label.appendChild(t);
        });
        grp.appendChild(label);
        grp.addEventListener('click', function () {
          if (opts.onNodeClick) opts.onNodeClick(n);
        });
        svg.appendChild(grp);
      });

      svgHolder.appendChild(svg);
    }

    const first = Object.keys(cfg)[0];
    if (first) show(first);
    return { show: show };
  };
})(window.RevQuest);
