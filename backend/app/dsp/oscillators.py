"""Band-limited oscillators and additive partials."""

from __future__ import annotations

import numpy as np


def note_to_frequency(pitch: float) -> float:
    """MIDI note number to equal-tempered frequency (A4 = 440 Hz)."""

    return 440.0 * 2.0 ** ((float(pitch) - 69.0) / 12.0)


def phase_from_frequency(
    frequency: np.ndarray | float,
    sample_rate: int,
    phase_deg: float = 0.0,
) -> np.ndarray:
    """Integrate an instantaneous frequency into a phase array."""

    freq = np.asarray(frequency, dtype=np.float64)
    if freq.ndim == 0:
        n = 1
    else:
        n = int(freq.shape[0])
    if n == 0:
        return np.empty(0, dtype=np.float64)
    # A scalar frequency still needs the caller's sample count.  Callers pass
    # an array for normal operation; this branch is only a safety net.
    if freq.ndim == 0:
        freq = np.full(1, float(freq))
    phase = np.cumsum(freq, dtype=np.float64) * (2.0 * np.pi / sample_rate)
    return phase + np.deg2rad(float(phase_deg))


def _normalise_peak(values: np.ndarray) -> np.ndarray:
    peak = float(np.max(np.abs(values))) if values.size else 0.0
    if peak > 1e-12:
        return values / peak
    return values


def oscillator_wave(
    phase: np.ndarray,
    wave_type: str,
    max_harmonic: int = 32,
) -> np.ndarray:
    """Generate a waveform from a phase array using a Fourier series.

    The series is band-limited by ``max_harmonic``.  The result is peak
    normalised so the amplitude control has a consistent meaning.
    """

    if phase.size == 0:
        return phase.copy()

    if wave_type == "sine":
        return np.sin(phase)

    max_harmonic = max(1, int(max_harmonic))

    if wave_type == "square":
        values = np.zeros_like(phase)
        for harmonic in range(1, max_harmonic + 1, 2):
            values += np.sin(harmonic * phase) / harmonic
        values *= 4.0 / np.pi
    elif wave_type == "triangle":
        values = np.zeros_like(phase)
        sign = 1.0
        for harmonic in range(1, max_harmonic + 1, 2):
            values += sign * np.sin(harmonic * phase) / (harmonic**2)
            sign *= -1.0
        values *= 8.0 / (np.pi**2)
    elif wave_type == "sawtooth":
        values = np.zeros_like(phase)
        for harmonic in range(1, max_harmonic + 1):
            values += ((-1.0) ** (harmonic + 1)) * np.sin(harmonic * phase) / harmonic
        values *= 2.0 / np.pi
    else:
        values = np.sin(phase)

    return _normalise_peak(values)


def partials_wave(
    phase: np.ndarray,
    partials: list[float],
    base_frequency: float,
    sample_rate: int,
    phase_deg: float = 0.0,
) -> np.ndarray:
    """Additive synthesis with one amplitude per harmonic."""

    if phase.size == 0 or not partials:
        return np.zeros_like(phase)

    nyquist = sample_rate * 0.5
    values = np.zeros_like(phase)
    initial = np.deg2rad(float(phase_deg))
    active = 0
    for index, amplitude in enumerate(partials[:16], start=1):
        if amplitude <= 0.0:
            continue
        if base_frequency * index >= nyquist * 0.94:
            continue
        values += float(amplitude) * np.sin(index * phase + index * initial)
        active += 1

    if active == 0:
        return values
    return _normalise_peak(values)


def max_harmonics_for(frequency: float, sample_rate: int, cap: int = 48) -> int:
    if frequency <= 0:
        return 1
    return max(1, min(cap, int((sample_rate * 0.45) / frequency)))
