"""Layer/voice rendering: source -> filter -> envelope -> modulation."""

from __future__ import annotations

import numpy as np

from ..schemas import Layer
from .envelopes import (
    adsr_envelope,
    amplitude_gain,
    cutoff_ratio,
    gate_envelope,
    lfo_signal,
    pitch_ratio,
)
from .filters import apply_filter, apply_time_varying_filter
from .oscillators import (
    max_harmonics_for,
    note_to_frequency,
    oscillator_wave,
    partials_wave,
    phase_from_frequency,
)
from .physical import render_pluck


def render_layer_voice(
    layer: Layer,
    n: int,
    sample_rate: int,
    rng: np.random.Generator,
    *,
    base_frequency: float,
    note_duration: float,
    velocity: float,
) -> np.ndarray:
    """Render one layer for one note (or for the whole sequence if a drone)."""

    if n <= 0:
        return np.empty(0, dtype=np.float64)

    source = layer.source
    lfo = None
    if layer.lfo.enabled and layer.lfo.depth > 0:
        lfo = lfo_signal(n, sample_rate, layer.lfo.rate, layer.lfo.waveform)

    ratio = np.ones(n, dtype=np.float64)
    if lfo is not None and layer.lfo.target == "pitch" and source.type != "pluck":
        ratio = pitch_ratio(lfo, layer.lfo.depth)

    if source.type in {"sine", "square", "triangle", "sawtooth"}:
        frequency = base_frequency * ratio
        phase = phase_from_frequency(frequency, sample_rate, source.phase)
        max_harmonic = max_harmonics_for(base_frequency * float(np.max(ratio)), sample_rate)
        signal = oscillator_wave(phase, source.type, max_harmonic)
        signal *= source.amplitude * velocity
    elif source.type == "noise":
        signal = rng.standard_normal(n).astype(np.float64)
        signal *= source.amplitude * velocity
    elif source.type == "partials":
        frequency = base_frequency * ratio
        phase = phase_from_frequency(frequency, sample_rate, source.phase)
        signal = partials_wave(
            phase,
            source.partials,
            base_frequency * float(np.max(ratio)),
            sample_rate,
            source.phase,
        )
        signal *= source.amplitude * velocity
    elif source.type == "pluck":
        # A time-varying delay length would need a different physical model;
        # the LFO can still modulate amplitude or the layer filter.
        signal = render_pluck(
            n,
            sample_rate,
            base_frequency,
            source,
            velocity,
            rng,
        )
    else:
        signal = np.zeros(n, dtype=np.float64)

    if layer.filter.enabled:
        if lfo is not None and layer.lfo.target == "cutoff":
            cutoff = layer.filter.cutoff * cutoff_ratio(lfo, layer.lfo.depth)
            signal = apply_time_varying_filter(
                signal,
                cutoff,
                layer.filter.resonance,
                sample_rate,
                layer.filter.type,
            )
        else:
            signal = apply_filter(
                signal,
                layer.filter.type,
                layer.filter.cutoff,
                layer.filter.resonance,
                sample_rate,
            )

    if layer.envelope.enabled:
        envelope = adsr_envelope(
            n,
            sample_rate,
            note_duration,
            layer.envelope.attack,
            layer.envelope.decay,
            layer.envelope.sustain,
            layer.envelope.release,
        )
    elif source.type != "pluck":
        envelope = gate_envelope(n, sample_rate, note_duration)
    else:
        envelope = np.ones(n, dtype=np.float64)

    signal *= envelope

    if source.type == "pluck" and source.damp_on_release:
        release_start = min(n, int(round(note_duration * sample_rate)))
        release_end = min(n, release_start + int(0.12 * sample_rate))
        if release_end > release_start:
            damper = np.ones(n, dtype=np.float64)
            damper[release_start:release_end] = np.linspace(1.0, 0.0, release_end - release_start)
            damper[release_end:] = 0.0
            signal *= damper

    if lfo is not None and layer.lfo.target == "amplitude":
        signal *= amplitude_gain(lfo, layer.lfo.depth)

    signal *= layer.gain
    return np.nan_to_num(signal, nan=0.0, posinf=0.0, neginf=0.0)


def layer_base_frequency(layer: Layer, pitch: int | None) -> float:
    if layer.trigger == "note" and pitch is not None:
        return note_to_frequency(pitch)
    return layer.source.frequency
