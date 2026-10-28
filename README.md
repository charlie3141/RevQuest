# 🔍 RevQuest

**Game web tương tác dạy reverse engineering (CTF RE) từ con số 0** — dạy bằng **quy trình tìm kiếm**, không phải học tool. 9 level, mỗi level ≥3 con đường giải, track hành động của bạn để trao **badge theo kỹ năng**.

100% HTML + CSS + vanilla JS. Không build step, không npm. Mở `index.html` là chơi (hoặc GitHub Pages).

---

## 🎮 Triết lý thiết kế

1. **Multi-path** — không có lối đi duy nhất. strings nhanh → badge ★☆☆☆☆; gdb/decompiler → badge ★★★☆☆. Đường dễ không phải "đường sai".
2. **Sai lệnh là giáo trình** — `strigns` → *"Did you mean: strings?"*; `cat challenge` → *"binary file — thử strings hoặc xxd"*; `./challenge` → *"Permission denied — chmod +x"*. Mỗi lỗi gợi ý bước tiếp theo.
3. **Interaction loop RE thật** — notice → jump (xref) → understand → follow → repeat. Panel Ghidra-like sync 2 chiều dạy đúng loop này.
4. **Output thật** — mọi output terminal pre-computed từ tool thật (`tools/build_binaries.py` chạy gcc + Ghidra headless).
5. **Terminal ↔ GUI sync** — hai view của cùng một state.

## 🗺️ 9 level & tool unlock (Metroidvania)

| # | Level | Tool mở mới | Con đường giải |
|---|---|---|---|
| 0 | Làm quen Linux | terminal | ls + cat |
| 1 | Binary ≠ Text | Strings panel, Listing | strings panel · đọc asm |
| 2 | Pipeline | — | `strings \| grep` · strings+mắt |
| 3 | The Hidden Compare | **Decompiler** | ltrace · decompiler · gdb break strcmp · objdump |
| 4 | Keygen Me | **Xrefs** | ltrace · gdb · decomp + tự viết keygen |
| 5 | Graph View | **Graph (CFG)** | đọc CFG · ltrace · decompiler |
| 6 | Anti-Debug | **Rename (N)** | rename+decode · gdb break ptrace · ltrace |
| 7 | Patcher | **Hex editor** | patch JNE→JE · strings tìm password · decomp |
| 8 | Automation | **Script console** | brute-force 256 XOR key · decode tay |

**Keyboard shortcuts** (dạy muscle memory Ghidra): `N` rename · `/` tìm trong listing · `q` thoát pager · `Ctrl+L` clear · `↑↓` history · `Tab` completion.

## 🏅 Badge (24)

Trao theo **sự kiện ngữ nghĩa**, không match chuỗi: `first_blood`, `lazy_hacker` (giải bằng strings), `watcher` (ltrace), `debugger` (breakpoint), `reverse_engineer` (decompiler), `pipeline_master` (pipe), `rtfm` (≥3 man page), `persistent` (5 lỗi liên tiếp không bỏ cuộc), `typo_survivor` (typo ≥3 lần), `full_spectrum` (giải 1 level ≥3 đường), `tool_polyglot`, `curator` (tĩnh + động cùng level), `renamer`, `xref_master`, `graph_explorer`, `patcher`, `automator`, `keysmith`, `pathfinder`, `surgeon`, `shell_novice`, `asm_peeker`, `explorer`, `completionist`.

Xem tiến độ: nút 🏅 trên thanh trên. Lưu trong `localStorage` (key `revquest_save_v1`) — đóng tab mở lại vẫn còn.

## 🚀 Chạy local

```bash
# cách 1: double-click index.html (không fetch, không ES module)
# cách 2:
python3 -m http.server 8643     # hoặc serve.ps1 trên Windows
```

## 📦 Deploy GitHub Pages

Game tĩnh 100% — chỉ cần push lên GitHub và bật Pages.

### Bước 1 — Tạo repo riêng cho RevQuest

RevQuest và PwnQuest là 2 game độc lập → **2 repo riêng biệt**:

```bash
# trong thư mục revquest/
git init
git add -A
git commit -m "RevQuest: 9 levels, multi-path RE game"
git branch -M main
git remote add origin https://github.com/<username>/revquest.git
git push -u origin main
```

> ⚠️ Đừng push RevQuest vào repo của PwnQuest (hoặc ngược lại) — mỗi game một repo để có URL riêng: `github.com/<username>/revquest` và `github.com/<username>/pwnquest`.

### Bước 2 — Bật Pages

1. Trên GitHub: **Settings → Pages** (mục "Build and deployment").
2. **Source**: chọn `Deploy from a branch`.
3. **Branch**: `main`, thư mục `/ (root)` → **Save**.
4. Chờ 1–2 phút build. Trang live tại:

```
https://<username>.github.io/revquest/
```

### Bước 3 — Kiểm tra sau deploy

- Mở URL → phải thấy Level 0, terminal gõ được `ls`.
- F12 → tab Network → **không được có request 404** (tất cả `<script src>` đều relative).
- F12 → Console → sạch lỗi đỏ khi load + khi chơi level 0→8.

### Khắc phục sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Trang trắng, Console báo `Failed to load script` | Tên file sai hoa/thường — **GitHub Pages chạy trên Linux, phân biệt hoa/thường** | Soi lại chính xác `js/levels/level5.js` vs `Level5.js` |
| `404` cho `css/style.css` | Đường dẫn tuyệt đối (`/css/...`) | Repo này đã dùng relative path — đừng đổi khi sửa |
| Trang cũ sau khi push | Cache CDN Pages (10 phút) | Đợi hoặc hard-refresh `Ctrl+Shift+R` |
| Progress mất khi đổi URL | localStorage theo **origin** — `github.com/user/revquest` và custom domain là 2 kho riêng | Bình thường; chọn 1 URL chính |

### Custom domain (tùy chọn)

Thêm file `CNAME` chứa domain của bạn vào root repo → Settings → Pages → Custom domain → tick **Enforce HTTPS**. localStorage sẽ tách khỏi URL github.io.

### Chạy local trước khi push

```bash
# Linux/macOS
python3 -m http.server 8643
# Windows
powershell -ExecutionPolicy Bypass -File serve.ps1   # cổng 8643
```

Cách 0 (không cần gì): **double-click `index.html`** — game không dùng `fetch()` hay ES module nên chạy được trực tiếp qua `file://`; localStorage hoạt động bình thường trên Chrome/Edge/Firefox.

## 🏗️ Kiến trúc

```
index.html
css/style.css            # dark theme Ghidra (#1e1e1e...)
css/terminal.css         # ANSI colors, prompt, cursor
js/engine.js             # Store (localStorage) + Bus + md/highlight + Patch
js/vfs.js                # virtual filesystem (loại file, mode)
js/binaries/levelN.js    # output pre-computed: file/strings/readelf/objdump/
                         #   ltrace/gdb-sim/ghidra{functions,cMap,strings,xrefs,cfg}
js/shell/
  terminal.js            # ANSI render, history, Tab, Ctrl+C/L/A/E, gdb mode
  parser.js              # tokenize + pipe + levenshtein ("Did you mean")
  commands.js            # 20+ lệnh: ls cd cat file chmod echo printf strings
                         #   grep xxd man objdump readelf ltrace help history clear
  pager.js               # less-like: q thoát, ↑↓/PgUp/G
  gdb.js                 # mini-debugger: break/run/info registers/x/s/x/20x
js/ghidra/
  listing.js strings.js decompiler.js symbols.js xrefs.js
  graph.js               # CFG SVG
  hex.js                 # hex editor + patch → run() đọc patch state
  script.js              # Python-subset console (for/if/print/builtins)
  panels.js              # workbench 3 cột + wire cross-highlight/rename
js/badges/               # definitions (predicate thuần) + evaluator
js/levels/               # engine (router/tabs) + level0..8
tools/build_binaries.py  # gcc + capture tool outputs + Ghidra headless → bundle
challenges/*.c           # source thật của từng binary
```

## 🔬 Build pipeline (để regenerate output thật)

Máy dev Windows không có gcc/Ghidra nên các bundle `js/binaries/levelN.js` hiện được **hand-author khớp format thật**. Trên Linux/WSL, chạy để thay bằng output 100% thật:

```bash
./tools/build_binaries.py                                  # gcc + file/strings/readelf/objdump/ltrace
GHIDRA_HEADLESS=/opt/ghidra/support/analyzeHeadless \
  ./tools/build_binaries.py                                # + decompiled C, xrefs, CFG
```

Script ship kèm `binaries/levelN.elf` (nhúng base64 vào bundle → nút download trong game dùng được cả file://).

## ⚠️ Disclaimer

Chỉ dùng cho học tập, CTF hợp pháp và hệ thống của bạn.

---
*RevQuest — học RE bằng quy trình, không phải học tool. 🏴*
"# RevQuest" 
