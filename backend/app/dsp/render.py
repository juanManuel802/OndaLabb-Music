"""Offline voice allocation and mixdown."""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field

import numpy as np

from ..schemas import Layer, Patch, Sequence
from .effects import apply_master_chain
from .oscillators import note_to_frequency
from .sources import render_layer_voice

MAX_RENDER_SECONDS = 16.0


@dataclass
class RenderResult:
    sample_rate: int
    duration: float
    input: np.ndarray
    output: np.ndarray
    layers: list[dict] = field(default_factory=list)
    voices: int = 0
    render_ms: float = 0.0
    input_peak: float = 0.0
    output_peak: float = 0.0
    active_layers: int = 0
    active_stages: int = 0


def _layer_tail(layer: Layer) -> float:
    if layer.source.type == "pluck":
        return max(0.35, min(6.0, layer.source.decay * 1.45))
    if layer.envelope.enabled:
        return max(0.08, layer.envelope.release + 0.08)
    return 0.1


def _active_layers(patch: Patch) -> list[Layer]:
    any_solo = any(layer.solo for layer in patch.layers)
    active: list[Layer] = []
    for layer in patch.layers:
        if not layer.enabled:
            continue
        if any_solo and not layer.solo:
            continue
        active.append(layer)
    return active


def _fade_edges(signal: np.ndarray, sample_rate: int, fade_in: float = 0.002, fade_out: float = 0.006) -> np.ndarray:
    if signal.size == 0:
        return signal
    in_n = min(signal.size // 2, max(1, int(fade_in * sample_rate)))
    out_n = min(signal.size // 2, max(1, int(fade_out * sample_rate)))
    if in_n > 0:
        signal[:in_n] *= np.linspace(0.0, 1.0, in_n, endpoint=False)
    if out_n > 0:
        signal[-out_n:] *= np.linspace(1.0, 0.0, out_n)
    return signal


def synthesize(patch: Patch, sequence: Sequence, seed: int = 1) -> RenderResult:
    started = time.perf_counter()
    sample_rate = int(patch.sample_rate)
    layers = _active_layers(patch)

    tail = max((_layer_tail(layer) for layer in layers), default=0.1)
    note_layers = [layer for layer in layers if layer.trigger == "note"]
    always_layers = [layer for layer in layers if layer.trigger == "always"]

    latest_end = float(sequence.duration)
    for layer in note_layers:
        layer_tail = _layer_tail(layer)
        for event in sequence.events:
            latest_end = max(latest_end, event.start + event.duration + layer_tail)

    render_seconds = min(MAX_RENDER_SECONDS, max(0.5, latest_end + 0.04, sequence.duration))
    if not layers:
        render_seconds = max(0.5, sequence.duration)
    if note_layers and not sequence.events and not always_layers:
        render_seconds = max(0.5, sequence.duration)

    total_samples = max(64, int(math.ceil(render_seconds * sample_rate)))
    input_signal = np.zeros(total_samples, dtype=np.float64)
    rendered_layers: list[dict] = []
    voices = 0
    rng = np.random.default_rng(seed)

    for layer in layers:
        layer_signal = np.zeros(total_samples, dtype=np.float64)
        if layer.trigger == "always":
            layer_signal += render_layer_voice(
                layer,
                total_samples,
                sample_rate,
                rng,
                base_frequency=layer.source.frequency,
                note_duration=render_seconds,
                velocity=0.85,
            )
            voices += 1
        else:
            for event in sequence.events:
                start_sample = min(total_samples, max(0, int(round(event.start * sample_rate))))
                count = total_samples - start_sample
                if count <= 0:
                    continue
                voice = render_layer_voice(
                    layer,
                    count,
                    sample_rate,
                    rng,
                    base_frequency=note_to_frequency(event.pitch),
                    note_duration=event.duration,
                    velocity=event.velocity,
                )
                layer_signal[start_sample:] += voice
                voices += 1

        layer_signal = np.nan_to_num(layer_signal, nan=0.0, posinf=0.0, neginf=0.0)
        input_signal += layer_signal
        rendered_layers.append(
            {
                "id": layer.id,
                "name": layer.name,
                "color": layer.color,
                "samples": layer_signal.astype(np.float32),
            }
        )

    _fade_edges(input_signal, sample_rate)

    master_gain = 10.0 ** (float(patch.master_gain_db) / 20.0)
    output_signal = apply_master_chain(input_signal, patch.master_chain, sample_rate) * master_gain
    output_signal = np.nan_to_num(output_signal, nan=0.0, posinf=0.0, neginf=0.0)
    _fade_edges(output_signal, sample_rate)

    input_peak = float(np.max(np.abs(input_signal))) if input_signal.size else 0.0
    output_peak = float(np.max(np.abs(output_signal))) if output_signal.size else 0.0
    elapsed = (time.perf_counter() - started) * 1000.0

    return RenderResult(
        sample_rate=sample_rate,
        duration=render_seconds,
        input=input_signal.astype(np.float32),
        output=output_signal.astype(np.float32),
        layers=rendered_layers,
        voices=voices,
        render_ms=elapsed,
        input_peak=input_peak,
        output_peak=output_peak,
        active_layers=len(layers),
        active_stages=sum(1 for stage in patch.master_chain if stage.enabled),
    )
