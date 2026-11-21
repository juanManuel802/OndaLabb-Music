from __future__ import annotations

import io
import wave

from fastapi.testclient import TestClient

from app.main import app
from app.presets import PLUCK_PRESET

client = TestClient(app)


def _payload() -> dict:
    return {
        "patch": PLUCK_PRESET.patch.model_dump(mode="json"),
        "sequence": PLUCK_PRESET.sequence.model_dump(mode="json"),
        "options": {
            "window_start": 0.0,
            "window_seconds": 0.1,
            "max_points": 600,
            "spectrogram": True,
            "spectrogram_time_bins": 64,
            "spectrogram_freq_bins": 32,
            "spectrum_points": 64,
        },
    }


def test_health_and_capabilities() -> None:
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    capabilities = client.get("/api/capabilities")
    assert capabilities.status_code == 200
    body = capabilities.json()
    assert {source["type"] for source in body["sources"]} >= {"pluck", "partials", "sine"}
    assert len(body["presets"]) >= 4


def test_render_and_audio() -> None:
    response = client.post("/api/render", json=_payload())
    assert response.status_code == 200
    body = response.json()
    analysis = body["analysis"]
    assert len(analysis["time_ms"]) == 600
    assert len(analysis["input"]) == 600
    assert analysis["spectrogram"] is not None
    assert len(analysis["spectrogram"]["input_db"]) == 64
    assert analysis["metrics"]["output"]["peak"] >= 0
    assert analysis["meta"]["voices"] > 0

    render_id = body["render_id"]
    audio = client.get(f"/api/render/{render_id}/audio")
    assert audio.status_code == 200
    assert audio.content[:4] == b"RIFF"

    with wave.open(io.BytesIO(audio.content), "rb") as wav_file:
        assert wav_file.getframerate() == 48_000
        assert wav_file.getnchannels() == 1
        assert wav_file.getsampwidth() == 2


def test_missing_render_returns_404() -> None:
    response = client.get("/api/render/does-not-exist/audio")
    assert response.status_code == 404
