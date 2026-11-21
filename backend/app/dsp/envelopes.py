"""Envelopes, gates and low-frequency modulation."""

from __future__ import annotations

import numpy as np


def adsr_envelope(
    n: int,
    sample_rate: int,
    note_duration: float,
    attack: float,
    decay: float,
    sustain: float,
    release: float,
) -> np.ndarray:
    """Piecewise-linear ADSR that can release before attack/decay finish."""

    if n <= 0:
        return np.empty(0, dtype=np.float64)

    attack = max(0.0, float(attack))
    decay = max(0.0, float(decay))
    release = max(0.0, float(release))
    sustain = float(np.clip(sustain, 0.0, 1.0))
    note_duration = max(0.0, float(note_duration))

    def level_at(time_s: float) -> float:
        if attack > 1e-9 and time_s < attack:
            return time_s / attack
        if decay > 1e-9 and time_s < attack + decay:
            return 1.0 + (sustain - 1.0) * ((time_s - attack) / decay)
        return sustain

    time = np.arange(n, dtype=np.float64) / sample_rate
    envelope = np.zeros(n, dtype=np.float64)

    attack_end = min(n, int(round(attack * sample_rate)))
    if attack_end > 0:
        envelope[:attack_end] = np.linspace(0.0, 1.0, attack_end, endpoint=False)

    decay_start = attack_end
    decay_end = min(n, decay_start + int(round(decay * sample_rate)))
    if decay_end > decay_start:
        envelope[decay_start:decay_end] = np.linspace(1.0, sustain, decay_end - decay_start, endpoint=False)

    sustain_start = decay_end
    release_start = min(n, int(round(note_duration * sample_rate)))
    if release_start > sustain_start:
        envelope[sustain_start:release_start] = sustain

    if release_start < n:
        start_level = level_at(note_duration)
        release_end = min(n, release_start + int(round(release * sample_rate)))
        if release_end > release_start:
            envelope[release_start:release_end] = np.linspace(
                start_level, 0.0, release_end - release_start, endpoint=False
            )
        envelope[release_end:] = 0.0

    return np.clip(envelope, 0.0, 1.0)


def gate_envelope(
    n: int,
    sample_rate: int,
    note_duration: float,
    attack: float = 0.004,
    release: float = 0.03,
) -> np.ndarray:
    """Simple gate used when a note-triggered layer has no ADSR."""

    if n <= 0:
        return np.empty(0, dtype=np.float64)
    attack_n = max(1, int(round(attack * sample_rate)))
    release_n = max(1, int(round(release * sample_rate)))
    note_n = int(round(max(0.0, note_duration) * sample_rate))

    envelope = np.ones(n, dtype=np.float64)
    fade_in = min(attack_n, n)
    envelope[:fade_in] = np.linspace(0.0, 1.0, fade_in, endpoint=False)

    release_start = min(max(note_n, fade_in), n)
    release_end = min(n, release_start + release_n)
    if release_end > release_start:
        envelope[release_start:release_end] = np.linspace(1.0, 0.0, release_end - release_start, endpoint=False)
    envelope[release_end:] = 0.0
    return envelope


def lfo_signal(n: int, sample_rate: int, rate: float, waveform: str = "sine") -> np.ndarray:
    if n <= 0:
        return np.empty(0, dtype=np.float64)
    time = np.arange(n, dtype=np.float64) / sample_rate
    phase = 2.0 * np.pi * max(0.0, float(rate)) * time
    if waveform == "triangle":
        return (2.0 / np.pi) * np.arcsin(np.sin(phase))
    return np.sin(phase)


def pitch_ratio(lfo: np.ndarray, depth: float) -> np.ndarray:
    """Depth 1.0 gives +/- 2 semitones of vibrato."""

    semitones = float(np.clip(depth, 0.0, 1.0)) * 2.0
    return np.exp2((semitones * lfo) / 12.0)


def amplitude_gain(lfo: np.ndarray, depth: float) -> np.ndarray:
    """Tremolo that stays in the [1-depth, 1] range."""

    depth = float(np.clip(depth, 0.0, 1.0))
    return 1.0 - depth + depth * (0.5 + 0.5 * lfo)


def cutoff_ratio(lfo: np.ndarray, depth: float) -> np.ndarray:
    """Depth 1.0 gives +/- 2 octaves of filter movement."""

    octaves = float(np.clip(depth, 0.0, 1.0)) * 2.0
    return np.exp2(octaves * lfo)
