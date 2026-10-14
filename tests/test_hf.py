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
