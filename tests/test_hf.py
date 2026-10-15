import json
import os
import shutil
import sys
import pytest
from autovideo import hf


def test_run_merges_env_over_os_environ(monkeypatch):
    monkeypatch.setenv("AV_KEEP", "base")
    p = hf.run([sys.executable, "-c", "import os;print(os.environ['AV_KEEP'], os.environ['AV_NEW'])"],
               env={"AV_NEW": "x"})
    assert p.stdout.split() == ["base", "x"]


def test_run_timeout_becomes_tool_error():
    with pytest.raises(hf.ToolError, match=r"excedeu 1s"):
        hf.run([sys.executable, "-c", "import time;time.sleep(30)"], timeout=1)


def test_run_ok_codes_allows_nonzero_exit():
    code = "import sys;print('x');sys.exit(1)"
    assert hf.run([sys.executable, "-c", code], ok_codes=(0, 1)).stdout.strip() == "x"
    with pytest.raises(hf.ToolError):
        hf.run([sys.executable, "-c", code])


def _fake_npx(tmp_path, monkeypatch):
    """npx.cmd falso que, se rodasse via cmd.exe, executaria o `echo INJECTED`; o script node só ecoa os args."""
    d = tmp_path / "bin dir ç"
    (d / "node_modules/npm/bin").mkdir(parents=True)
    (d / "npx.cmd").write_text("@echo off\r\necho CMD-RAN %*\r\n", encoding="ascii")
    (d / "node_modules/npm/bin/npx-cli.js").write_text(
        "process.stdout.write(JSON.stringify(process.argv.slice(2)))", encoding="utf-8")
    monkeypatch.setenv("PATH", f"{d}{os.pathsep}{os.environ['PATH']}")
    return d


@pytest.mark.skipif(sys.platform != "win32" or not shutil.which("node"), reason="shims .cmd são do Windows")
def test_cmd_shim_runs_via_node_and_passes_args_literally(tmp_path, monkeypatch):
    _fake_npx(tmp_path, monkeypatch)
    args = ["a&echo INJECTED", "Q&A.mp4", 'x"y', "100%PATH%"]
    out = hf.run(["npx", *args]).stdout
    assert json.loads(out) == args and "INJECTED\n" not in out and "CMD-RAN" not in out


def test_cmd_shim_without_node_script_raises(tmp_path):
    bat = tmp_path / "tool.BAT"
    bat.write_text("@echo off\r\necho hi\r\n", encoding="ascii")
    with pytest.raises(hf.ToolError, match="cmd.exe"):
        hf.argv_for(str(bat), ["x"])


def test_cmd_shim_pointing_to_exe_runs_exe_directly(tmp_path):
    (tmp_path / "pkg").mkdir()
    exe = tmp_path / "pkg" / "tool.exe"
    exe.write_bytes(b"")
    shim = tmp_path / "tool.CMD"
    shim.write_text('@ECHO off\nSETLOCAL\n"%dp0%\\pkg\\tool.exe"   %*\n', encoding="ascii")  # como o claude.CMD
    assert hf.argv_for(str(shim), ["a&b"]) == [str(exe), "a&b"]


def test_plain_exe_unchanged():
    assert hf.argv_for(sys.executable, ["-c", "1"]) == [sys.executable, "-c", "1"]
    assert hf.HF == ["npx", "--yes", "hyperframes@0.8.158"]
