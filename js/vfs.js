/* ============================================================
 * RevQuest — vfs.js
 * Virtual filesystem: cây thư mục thật sự với loại file, mode.
 * Mỗi level khai báo files của mình; VFS gộp tất cả thành 1 cây
 * /home/player/challenges/levelN/... để cd tự do giữa các level.
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
(function (RQ) {
  'use strict';

  const VFS = RQ.VFS = {
    root: null,

    /** Gộp files của mọi level vào 1 cây. Gọi 1 lần sau khi levels đăng ký xong. */
    build: function (levels) {
      const root = {
        type: 'dir', mode: '0755', name: '/', children: {
          home: {
            type: 'dir', mode: '0755', name: 'home', children: {
              player: {
                type: 'dir', mode: '0755', name: 'player', children: {
                  'README.txt': {
                    type: 'file', mode: '0644',
                    content: 'Chào mừng đến RevQuest Lab.\nMọi challenge nằm trong ~/challenges/levelN/.\nGõ `help` để xem lệnh có sẵn, `man <lenh>` để đọc tài liệu.\n'
                  },
                  challenges: { type: 'dir', mode: '0755', name: 'challenges', children: {} }
                }
              }
            }
          },
          etc: { type: 'dir', mode: '0755', name: 'etc', children: {
            hostname: { type: 'file', mode: '0644', content: 'revquest\n' }
          } }
        }
      };
      const ch = root.children.home.children.player.children.challenges.children;
      (levels || []).forEach(function (lv) {
        const dir = { type: 'dir', mode: '0755', name: 'level' + lv.id, children: {} };
        Object.keys(lv.files || {}).forEach(function (fname) {
          const spec = lv.files[fname];
          // hỗ trợ đường dẫn lồng nhau "notes/flag.txt"
          let parent = dir;
          const segs = fname.split('/');
          segs.forEach(function (seg, idx) {
            if (idx === segs.length - 1) {
              const isDir = spec.type === 'dir';
              parent.children[seg] = {
                type: isDir ? 'dir' : (spec.type || 'file'),
                name: seg,
                mode: spec.mode || (spec.type === 'elf' ? '0644' : '0755'),
                content: isDir ? undefined : (spec.content || ''),
                children: isDir ? {} : undefined,
                binary: spec.type === 'elf' ? (spec.binaryKey || 'level' + lv.id) : undefined
              };
              if (isDir) parent = parent.children[seg];
            } else {
              if (!parent.children[seg]) parent.children[seg] = { type: 'dir', name: seg, mode: '0755', children: {} };
              parent = parent.children[seg];
            }
          });
        });
        ch['level' + lv.id] = dir;
      });
      this.root = root;
      return root;
    },

    /** Chuẩn hoá path tương đối/absolute → mảng phần */
    _parts: function (path, cwd) {
      const abs = path.charAt(0) === '/';
      const base = abs ? [] : cwd.slice();
      path.split('/').forEach(function (p) {
        if (p === '' || p === '.') return;
        if (p === '..') { base.pop(); return; }
        if (p === '~') { base.length = 0; base.push('home', 'player'); return; }
        base.push(p);
      });
      return base;
    },

    lookup: function (path, cwd) {
      const parts = this._parts(path, cwd);
      let node = this.root;
      for (let i = 0; i < parts.length; i++) {
        if (!node || node.type !== 'dir') return null;
        node = node.children[parts[i]];
      }
      return node || null;
    },

    /** path → mảng phần (public, cho prompt/cwd tracking) */
    partsOf: function (path, cwd) { return this._parts(path, cwd); },

    partsToPath: function (parts) { return '/' + parts.join('/'); },

    prettyPath: function (parts) {
      const home = ['home', 'player'];
      if (parts.length >= 2 && parts[0] === 'home' && parts[1] === 'player') {
        return '~' + (parts.length > 2 ? '/' + parts.slice(2).join('/') : '');
      }
      return this.partsToPath(parts);
    },

    listDir: function (node) {
      if (!node || node.type !== 'dir') return [];
      return Object.keys(node.children).sort(function (a, b) {
        const da = node.children[a].type === 'dir' ? 0 : 1;
        const db = node.children[b].type === 'dir' ? 0 : 1;
        return da - db || a.localeCompare(b);
      }).map(function (n) { return node.children[n]; });
    }
  };
})(window.RevQuest);
