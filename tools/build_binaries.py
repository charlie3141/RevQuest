#!/usr/bin/env python3
# ============================================================
# RevQuest — tools/build_binaries.py
# Build pipeline: compile challenge C -> capture REAL tool outputs
# -> (optional) Ghidra headless export -> bundle into js/binaries/levelN.js
#
# Chạy MỘT LẦN khi dev trên Linux (KHÔNG phải runtime):
#   ./tools/build_binaries.py            # chỉ compile + capture tool outputs
#   GHIDRA_HEADLESS=/opt/ghidra/support/analyzeHeadless ./tools/build_binaries.py
#
# Yêu cầu: gcc, file, strings, readelf, objdump, ltrace (apt install ltrace)
# Script ghi đè phần "tool output" của js/binaries/levelN.js, giữ nguyên
# phần authored khác (hints, cMap...) nếu file JS đã tồn tại.
# ============================================================
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHALLENGE_DIR = ROOT / "challenges"
BIN_DIR = ROOT / "bin"
OUT_DIR = ROOT / "out"
BUNDLE_DIR = ROOT / "js" / "binaries"

GHIDRA_HEADLESS = os.environ.get("GHIDRA_HEADLESS", "")

CHALLENGES = {
    1: "level1.c",
    # 3: "level3.c", ... thêm khi mở rộng
}


def sh(cmd: list, cwd: Path = None, stdin: str = None) -> str:
    r = subprocess.run(cmd, cwd=cwd, input=stdin, capture_output=True, text=True)
    return r.stdout + (("\n[stderr] " + r.stderr) if r.stderr.strip() else "")


def compile_all() -> dict:
    BIN_DIR.mkdir(exist_ok=True)
    built = {}
    for level, src in CHALLENGES.items():
        src_path = CHALLENGE_DIR / src
        out_path = BIN_DIR / src.replace(".c", "")
        subprocess.run(
            ["gcc", "-O0", "-g", "-o", str(out_path), str(src_path)],
            check=True,
        )
        built[level] = out_path
        print(f"[gcc] {src} -> {out_path}")
    return built


def capture_outputs(bin_path: Path) -> dict:
    OUT_DIR.mkdir(exist_ok=True)
    stem = bin_path.stem
    data = {}

    data["fileOutput"] = sh(["file", "-b", str(bin_path)]).strip()
    (OUT_DIR / f"{stem}.file.txt").write_text(data["fileOutput"] + "\n")

    data["stringsOut"] = sh(["strings", str(bin_path)]).rstrip("\n")
    (OUT_DIR / f"{stem}.strings.txt").write_text(data["stringsOut"] + "\n")

    data["readelfOut"] = sh(["readelf", "-h", str(bin_path)]).rstrip("\n")
    (OUT_DIR / f"{stem}.readelf.txt").write_text(data["readelfOut"] + "\n")

    data["objdumpOut"] = sh(["objdump", "-d", str(bin_path)]).rstrip("\n")
    (OUT_DIR / f"{stem}.objdump.txt").write_text(data["objdumpOut"] + "\n")

    # ltrace: sai rồi đúng (nếu challenge đọc stdin)
    data.setdefault("ltrace", {})
    data["ltrace"]["wrong"] = sh([str(bin_path)], stdin="wrong\n").rstrip("\n")
    (OUT_DIR / f"{stem}.ltrace_wrong.txt").write_text(data["ltrace"]["wrong"] + "\n")

    print(f"[capture] {stem}: file/strings/readelf/objdump OK")
    return data


def parse_objdump_to_ghidra(objdump_text: str) -> list:
    """Chuyển objdump -d thành instruction list kiểu Ghidra listing."""
    functions = []
    current = None
    for line in objdump_text.splitlines():
        m = re.match(r"^([0-9a-f]+) <(.+)>:", line)
        if m:
            current = {"name": m.group(2), "addr": "0x" + m.group(1).zfill(16), "instructions": []}
            functions.append(current)
            continue
        m = re.match(r"^\s+([0-9a-f]+):\t([0-9a-f ]+?)\t(.*)$", line)
        if m and current is not None:
            addr = "0x" + m.group(1).zfill(16)
            raw = m.group(2).strip()
            rest = m.group(3)
            # AT&T -> hiển thị dạng Ghidra (uppercase mnemonic, Intel-ish operands)
            parts = rest.split("\t", 1)
            mnem = parts[0].strip().upper()
            operands = parts[1].strip() if len(parts) > 1 else ""
            # comment # ... ở cuối giữ lại làm comment
            comment = None
            cm = re.search(r"#\s*(.*)$", operands)
            if cm:
                comment = "# " + cm.group(1).strip()
                operands = operands[: cm.start()].strip()
            current["instructions"].append({
                "addr": addr,
                "bytes": raw,
                "mnemonic": mnem,
                "operands": operands,
                "comment": comment,
            })
    return functions


def ghidra_export(bin_path: Path) -> dict | None:
    """Chạy Ghidra headless nếu GHIDRA_HEADLESS được set. Trả về dict JSON."""
    if not GHIDRA_HEADLESS:
        print("[ghidra] GHIDRA_HEADLESS không set — bỏ qua export, giữ data authored")
        return None
    project_dir = Path("/tmp/revquest_ghidra")
    project_dir.mkdir(exist_ok=True)
    script = project_dir / "ExportJson.py"
    script.write_text(EXPORT_JSON_PY)
    proj = project_dir / "proj"
    print("[ghidra] analyzeHeadless… (có thể mất 1-2 phút cho mỗi binary)")
    sh([GHIDRA_HEADLESS, str(project_dir), "proj", "-import", str(bin_path),
        "-overwrite", "-postScript", script.name, str(project_dir / f"{bin_path.stem}.ghidra.json")])
    out = project_dir / f"{stem_json(bin_path)}.ghidra.json"
    if out.exists():
        print(f"[ghidra] JSON: {out}")
        return json.loads(out.read_text())
    print("[ghidra] export thất bại — kiểm tra log")
    return None


def stem_json(bin_path: Path) -> str:
    return bin_path.stem


EXPORT_JSON_PY = r'''
# Ghidra headless script: export disassembly + decompiler + strings + xrefs ra JSON
# @category: RevQuest
import json
from ghidra.app.decompiler import DecompInterface
from ghidra.util.task import ConsoleTaskMonitor
import java.io

args = getScriptArgs()
out_path = args[0] if args else "/tmp/ghidra_export.json"

fm = currentProgram.getFunctionManager()
listing = currentProgram.getListing()
monitor = ConsoleTaskMonitor()

di = DecompInterface()
di.openProgram(currentProgram)

functions = []
for f in fm.getFunctions(True):
    body = f.getBody()
    instrs = []
    for i in listing.getInstructions(body, True):
        bytes_str = " ".join("%02x" % (b & 0xff) for b in i.getBytes())
        refs = [r.getToAddress().toString() for r in i.getReferencesFrom()]
        instrs.append({
            "addr": "0x" + i.getAddress().toString(),
            "bytes": bytes_str,
            "mnemonic": i.getMnemonicString().upper(),
            "operands": i.toString().split(" ", 1)[1] if " " in i.toString() else "",
            "refs": refs,
        })
    dec = di.decompileFunction(f, 60, monitor)
    c_text = dec.getDecompiledFunction().getC() if dec.decompileCompleted() else ""
    functions.append({
        "name": f.getName(),
        "addr": "0x" + f.getEntryPoint().toString(),
        "decomp": c_text,
        "instructions": instrs,
    })

strings = []
for d in definedData:
    dt = d.getDataType().getName().lower()
    if "string" in dt or "char" in dt:
        v = d.getValue()
        if v is not None and len(str(v)) >= 4:
            refs = [r.getFromAddress().toString() for r in d.getReferenceIteratorTo()]
            strings.append({
                "addr": "0x" + d.getAddress().toString(),
                "value": str(v).rstrip("\x00"),
                "xrefs": ["0x" + x for x in refs],
            })

result = {"functions": functions, "strings": strings}
with java.io.PrintWriter(out_path) as w:
    w.write(json.dumps(result, indent=1))
print("Exported to " + out_path)
'''


def bundle(level: int, bin_path: Path, data: dict, ghidra: dict | None):
    BUNDLE_DIR.mkdir(parents=True, exist_ok=True)
    target = BUNDLE_DIR / f"level{level}.js"
    if target.exists():
        # giữ lại phần authored (ghidra/cSource/elfBase64) nếu có
        old = target.read_text()
        keep = {}
        for key in ("ghidra", "cSource", "elfBase64", "execOutput"):
            m = re.search(rf"{key}\s*:\s*", old)
            if m:
                keep[key] = True
        for key in keep:
            if key == "ghidra" and ghidra is None:
                m = re.search(r"ghidra:\s*(\{.*?\n  \},)\n", old, re.S)
                if m:
                    data["ghidra"] = "__KEEP__" + m.group(1)
                    continue
            if key in ("cSource", "elfBase64", "execOutput") and key not in data:
                m = re.search(rf"{key}\s*:\s*(\".*?\"|'.*?'|null)", old, re.S)
                if m:
                    data[key] = "__KEEP__" + m.group(1)

    elf_b64 = None
    elf_file = bin_path
    if elf_file.exists():
        import base64
        elf_b64 = base64.b64encode(elf_file.read_bytes()).decode()
        (ROOT / "binaries").mkdir(exist_ok=True)
        (ROOT / "binaries" / f"level{level}.elf").write_bytes(bin_path.read_bytes())
        print(f"[ship] binaries/level{level}.elf ({len(bin_path.read_bytes())} bytes)")

    def dump(obj, indent=2):
        if isinstance(obj, str):
            if obj.startswith("__KEEP__"):
                return obj[len("__KEEP__"):]
            return json.dumps(obj)
        if isinstance(obj, dict):
            items = []
            for k, v in obj.items():
                items.append(" " * indent + json.dumps(k) + ": " + dump(v, indent + 2))
            return "{\n" + ",\n".join(items) + "\n" + " " * (indent - 2) + "}"
        if isinstance(obj, list):
            return json.dumps(obj)
        return json.dumps(obj)

    payload = dict(data)
    if ghidra is not None:
        payload["ghidra"] = ghidra
    if elf_b64 and "elfBase64" not in payload:
        payload["elfBase64"] = elf_b64

    js = (
        "/* Auto-generated by tools/build_binaries.py — output THẬT từ tool THẬT.\n"
        "   Viết tay lại sẽ mất tính chân thực; hãy chạy script để regenerate. */\n"
        "window.RevQuest = window.RevQuest || {};\n"
        "window.RevQuest.binaries = window.RevQuest.binaries || {};\n"
        f"window.RevQuest.binaries.level{level} = " + dump(payload) + ";\n"
    )
    target.write_text(js)
    print(f"[bundle] {target}")


def main():
    if sys.platform == "win32":
        print("⚠ Script này cần Linux (gcc/strings/readelf/objdump/ltrace/Ghidra).")
        print("  Chạy trong WSL/Ubuntu: ./tools/build_binaries.py")
        sys.exit(1)
    built = compile_all()
    for level, bin_path in built.items():
        data = capture_outputs(bin_path)
        ghidra = ghidra_export(bin_path)
        bundle(level, bin_path, data, ghidra)
    print("\nDone. Review diff của js/binaries/ rồi commit.")


if __name__ == "__main__":
    main()
