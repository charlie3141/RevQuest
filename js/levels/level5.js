/* ============================================================
 * RevQuest — Level 5: Graph View — đọc CFG
 * ============================================================ */
window.RevQuest = window.RevQuest || {};
RevQuest.registerLevel({
  id: 5,
  slug: 'graph-view',
  title: 'Graph View',
  goal: 'Ba cổng tuần tự, sai một là dừng. Đọc CFG/label để tìm cả 3 mật khẩu cổng, chạy binary qua pipe để lấy flag.',
  flag: 'REV{f0ll0w_th3_p4th}',

  unlockTools: ['graph'],
  paths: [
    { id: 'graph-path', tools: ['graph'], badge: 'pathfinder', stars: 3, desc: 'Đọc CFG: tìm 3 node strcmp, đọc label ghép 3 cổng.' },
    { id: 'ltrace-path', tools: ['ltrace'], badge: 'watcher', stars: 2, desc: 'printf 3 dòng | ltrace — từng strcmp lộ từng cổng.' },
    { id: 'decomp-path', tools: ['decompiler'], badge: 'reverse_engineer', stars: 3, desc: 'Pseudo-C đọc thẳng 3 strcmp.' }
  ],

  files: {
    'challenge': { type: 'elf', binaryKey: 'level5', mode: '0644' },
    'README': { type: 'file', content: 'Three gates — tuần tự, sai một là dừng ngay.\nChạy: printf "p1 p2 p3" | ./challenge  (chmod +x trước)\nTool mới: GRAPH VIEW (phím Space hoặc panel trái).\nGraph không cho đáp án — graph cho thấy HÌNH DẠNG logic.' }
  },

  hints: [
    'Mỗi cổng là một strcmp với hằng số. Trong listing/graph, node so sánh có comment "=> 0x..." trỏ tới chuỗi gate. Thứ tự bắt buộc: Gate 1 → Gate 2 → Gate 3.',
    'Mở GRAPH panel (trái). Node `chk1` có label "strcmp g1,alpha" — alpha là cổng 1. Lần lượt node chk2, chk3 cho cổng 2, 3. Hoặc decompiler: 3 dòng strcmp hiện rõ.',
    'Gần như đáp án: cổng = alpha, bravo2, charlie. Chạy: `printf "alpha bravo2 charlie" | ./challenge` → in flag.'
  ],

  theory: [
    '# Level 5 — Graph View',
    '',
    '> **TL;DR:** Listing cho thấy code **theo dòng**; Graph view cho thấy logic **theo hình dạng**: mỗi block = 1 nhóm lệnh, mũi tên = nhảy. Nhìn CFG là biết ngay "dây chuyền 3 chốt": qua cổng 1 mới tới cổng 2... Nhiệm vụ: đọc tên từng chốt rồi đi đúng đường.',
    '',
    '## 1. Basic block & cạnh',
    '',
    '```c',
    'scanf("%31s", g1);              // §1',
    'if (strcmp(g1, "alpha")) fail(); // §2',
    'scanf("%31s", g2);              // §3',
    'if (strcmp(g2, "bravo2")) fail();// §4',
    'win();                          // §5',
    '```',
    '',
    '```asm',
    'call scanf                       ; §1',
    'call strcmp                      ; §2',
    'test eax, eax                    ; §2',
    'jne  fail                        ; §2  ← 2 cạnh: qua / rớt',
    'call scanf                       ; §3',
    'call strcmp                      ; §4',
    'jne  fail                        ; §4',
    'call win                         ; §5',
    '```',
    '',
    'Mỗi `jne` tách làm 2 đường → CFG là **chuỗi hình thoi**. Node `chk` của cổng 1 có 2 mũi tên: tới `gate2` (đúng) và `fail` (sai). Đó là cách nhìn "hình dạng" của điều kiện.',
    '',
    '## 2. Khi nào graph hơn listing?',
    '',
    '- Branch lồng nhau 3+ cấp: listing phải nhảy qua lại giữa các label, graph nhìn 1 phát thấy đường nào tới win.',
    '- Đuổi flag: tìm node có label chứa flag/win rồi **đi ngược** các mũi tên xem cần qua những chốt gì — đúng tinh thần "truy ngược từ mục tiêu".',
    '- Dead code: node không có mũi tên đi vào = không bao giờ chạy (như check_password Level 1).',
    '',
    '## 3. Phím Space',
    '',
    'Trong Ghidra, Space là toggle listing ↔ graph — người dùng ghidra bấm phím này hàng chục lần mỗi ngày. Ở đây graph panel luôn mở bên trái; Space là mẹo cho bản thật.'
  ].join('\n'),

  solution: [
    '# Solution — Level 5',
    '',
    '## Đọc CFG (★★★)',
    '',
    'GRAPH panel, hàm `main`: chuỗi node `entry → chk1 → gate2 → chk2 → gate3 → chk3 → win`. Ba node chốt:',
    '',
    '| Node | Label | Cổng |',
    '|---|---|---|---|',
    '| chk1 | `strcmp g1,"alpha"` | `alpha` |',
    '| chk2 | `strcmp g2,"bravo2"` | `bravo2` |',
    '| chk3 | `strcmp g3,"charlie"` | `charlie` |',
    '',
    'Node `win` = đích: `puts granted + printf FLAG`. Đi ngược từ win qua chk3 → gate3 → chk2 → ... — đúng thứ tự nhập.',
    '',
    '## Chạy lấy flag',
    '',
    '```',
    '$ echo "alpha bravo2 charlie" | ./challenge',
    'Gate 1: Gate 2: Gate 3: ',
    'Access granted',
    'Flag: REV{f0ll0w_th3_p4th}',
    '```',
    '',
    '## Các đường khác',
    '',
    '- ltrace: `printf "a b c" | ltrace ./challenge` — từng strcmp lộ từng gate, sửa dần theo log.',
    '- decompiler: 3 dòng `strcmp(g1,"alpha")`... đọc thẳng.',
    '- Listing: các LEA trước mỗi strcmp có comment `=> 0x...` trỏ chuỗi gate trong STRINGS panel... à không — chuỗi gate được LẮP runtime nên strings panel không có; comment trong listing vẫn hiện giá trị. Vì thế level này luyện đọc comment listing + graph.'
  ].join('\n'),

  initDemo: function (container, api) {
    const RQC = window.RevQuest;
    container.appendChild(RQC.el('p', null,
      '<b>CFG mini</b> — if/else đơn giản trông như thế nào trong graph. Bấm node để thấy tương tác:'));
    const miniBin = {
      ghidra: {
        cfg: {
          check: {
            nodes: [
              { id: 'entry', addr: '0x00001100', label: 'read(x)', succ: ['cmp'] },
              { id: 'cmp', addr: '0x00001110', label: 'x == 0x2a ?', succ: ['yes', 'no'] },
              { id: 'yes', addr: '0x00001120', label: 'puts("yes")', succ: ['exit'] },
              { id: 'no', addr: '0x00001130', label: 'puts("no")', succ: ['exit'] },
              { id: 'exit', addr: '0x00001140', label: 'return', succ: [] }
            ],
            edges: [['entry', 'cmp'], ['cmp', 'yes'], ['cmp', 'no'], ['yes', 'exit'], ['no', 'exit']]
          }
        }
      }
    };
    RQC.Ghidra.graph(container, miniBin, { levelId: -5, onNodeClick: function (n) { RQC.toast('Node: ' + n.label.replace('\\n', ' / '), 'toast-info'); } });
    container.appendChild(RQC.el('p', null, '<span style="color:var(--muted);font-size:13px">💡 Hình thoi = điều kiện. Trong challenge: tìm node "win" rồi đi NGƯỢC mũi tên để biết phải qua những cổng nào.</span>'));
  },

  initChallenge: function (container, api) {
    const RQC = window.RevQuest;
    const bin = RQC.binaries.level5;
    container.appendChild(RQC.el('p', null,
      'GRAPH panel mới (bên trái). Ba cổng chặn đường tới node <code>win</code>. ' +
      'Nhập cả 3 mật khẩu theo thứ tự qua pipe: <code>printf "a b c" | ./challenge</code>.'));

    RQC.Ghidra.workbench(container, {
      levelId: 5,
      bin: bin,
      api: api,
      pathsMeta: {}
    });

    RQC.Bus.on('tool-use', function (e) {
      if (e.level !== 5) return;
      if (e.tool === 'ltrace') api.creditPath('ltrace-path');
      if (e.tool === 'decompiler') api.creditPath('decomp-path');
    });
    RQC.Bus.on('graph-open', function (e) { if (e.level === 5) api.creditPath('graph-path'); });
    RQC.Bus.on('c-line-click', function (e) { if (e.level === 5) api.creditPath('decomp-path'); });

    RQC.renderFlagSubmit(container, api, 5);
  }
});
