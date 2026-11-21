"""FastAPI entrypoint for the OndaLab offline sound laboratory."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import __version__
from .capabilities import capabilities
from .dsp.analysis import analyze
from .dsp.cache import render_cache
from .dsp.render import synthesize
from .dsp.wav import to_wav
from .presets import preset_payloads
from .schemas import RenderRequest

app = FastAPI(
    title="OndaLab API",
    version=__version__,
    description="Laboratorio offline de síntesis, modelado físico y análisis de señales.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "engine": "python-fastapi",
        "version": __version__,
        "sources": ["sine", "square", "triangle", "sawtooth", "noise", "partials", "pluck"],
        "processors": ["filter", "gain", "drive", "delay"],
    }


@app.get("/api/capabilities")
def get_capabilities() -> dict:
    return capabilities(preset_payloads())


@app.post("/api/render")
def render(request: RenderRequest) -> dict:
    started = time.perf_counter()
    key = render_cache.key_for(request.patch, request.sequence)
    result = render_cache.get(key)
    if result is None:
        result = synthesize(request.patch, request.sequence)
        render_cache.put(key, result)

    analysis = analyze(result, request.patch, request.options)
    analysis["meta"]["compute_ms"] = round((time.perf_counter() - started) * 1000.0, 2)
    return {"render_id": key, "analysis": analysis}


@app.get("/api/render/{render_id}/audio")
def render_audio(
    render_id: str,
    channel: Literal["input", "output"] = Query(default="output"),
    download: bool = Query(default=False),
) -> Response:
    result = render_cache.get(render_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Render no encontrado. Vuelve a renderizar.")

    signal = result.input if channel == "input" else result.output
    wav_bytes = to_wav(signal, result.sample_rate)
    disposition = "attachment" if download else "inline"
    filename = f"ondalab-{channel}.wav"
    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'{disposition}; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:

    @app.get("/")
    def api_index() -> dict:
        return {
            "name": "OndaLab API",
            "version": __version__,
            "docs": "/docs",
            "health": "/api/health",
            "capabilities": "/api/capabilities",
        }
