import json
import subprocess
import pytest
from autovideo import transcribe as T
from autovideo.transcribe import parse_transcript, filler_candidates, require_speech, numbered_text, NoSpeechError

RAW = [{"text": "Olá", "start": 0.1, "end": 0.4}, {"text": "é", "start": 0.5, "end": 0.6},
       {"text": "pessoal,", "start": 0.7, "end": 1.0}, {"text": "Hoje", "start": 2.0, "end": 2.3}]

@pytest.mark.parametrize("data", [RAW, {"words": RAW},
                                  {"segments": [{"words": RAW[:2]}, {"words": RAW[2:]}]},
                                  [{"word": r["text"], "start": r["start"], "end": r["end"]} for r in RAW],
                                  # formato real do hyperframes 0.8.158 (transcript.json): lista plana com "id"
                                  [{"id": f"w{i}", **r} for i, r in enumerate(RAW)]])
def test_parse_transcript_shapes(data):
    ws = parse_transcript(data, "a.mp4")
    assert [w.text for w in ws] == ["Olá", "é", "pessoal,", "Hoje"]
    assert ws[0].src == "a.mp4"

def test_filler_candidates_ignores_case_and_punctuation():
    ws = parse_transcript(RAW + [{"text": "É,", "start": 3, "end": 3.1}], "a.mp4")
    assert filler_candidates(ws, ["é", "hum"]) == {1, 4}

def test_require_speech():
    with pytest.raises(NoSpeechError, match="montage-beat"):
        require_speech([])
    require_speech(parse_transcript(RAW, "a.mp4"))

def test_numbered_text_breaks_on_pause():
    txt = numbered_text(parse_transcript(RAW, "a.mp4"))
    assert txt.splitlines() == ["[0] Olá é pessoal,", "[3] Hoje"]

def test_transcribe_reads_transcript_file_named_in_stdout(tmp_path, monkeypatch):
    # stdout = resumo JSON (não a transcrição); a transcrição fica em transcriptPath
    wd = tmp_path / "work dir ã"
    def fake_run(args, cwd=None, timeout=0):
        wd.mkdir(parents=True, exist_ok=True)
        (wd / "transcript.json").write_text(json.dumps([{"id": "w0", **RAW[0]}]), encoding="utf-8")
        out = json.dumps({"ok": True, "engine": "parakeet", "transcriptPath": str(wd / "transcript.json")})
        return subprocess.CompletedProcess(args, 0, stdout="progresso solto\n" + out + "\n", stderr="")
    monkeypatch.setattr(T, "run", fake_run)
    ws = T.transcribe(tmp_path / "a.mp4", "a.mp4", wd)
    assert [w.text for w in ws] == ["Olá"] and ws[0].src == "a.mp4"


def _fake(monkeypatch, wd, summary, write=True):
    def fake_run(args, cwd=None, timeout=0):
        wd.mkdir(parents=True, exist_ok=True)
        if write:
            (wd / "transcript.json").write_text(json.dumps([{"id": "w0", **RAW[0]}]), encoding="utf-8")
        return subprocess.CompletedProcess(args, 0, stdout=json.dumps(summary) + "\n", stderr="")
    monkeypatch.setattr(T, "run", fake_run)


def test_transcribe_summary_ok_false_is_tool_error_not_no_speech(tmp_path, monkeypatch):
    from autovideo.hf import ToolError
    _fake(monkeypatch, tmp_path / "w", {"ok": False, "error": "whisper_unavailable"}, write=False)
    with pytest.raises(ToolError, match="whisper_unavailable"):
        T.transcribe(tmp_path / "a.mp4", "a.mp4", tmp_path / "w")


def test_transcribe_relative_transcript_path_resolves_against_workdir(tmp_path, monkeypatch):
    wd = tmp_path / "w ç"
    _fake(monkeypatch, wd, {"ok": True, "transcriptPath": "transcript.json"})
    monkeypatch.chdir(tmp_path)  # cwd do processo != workdir
    assert [w.text for w in T.transcribe(tmp_path / "a.mp4", "a.mp4", wd)] == ["Olá"]
