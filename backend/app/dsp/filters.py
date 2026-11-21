"""Biquad filters and time-varying filtering for the LFO."""

from __future__ import annotations

import math

import numpy as np
from scipy.signal import sosfilt, sosfreqz

_EPS = 1e-12


def biquad_sos(
    filter_type: str,
    cutoff: float,
    q: float,
    sample_rate: int,
) -> np.ndarray:
    """RBJ cookbook biquad normalised as a single second-order section."""

    nyquist = sample_rate * 0.5
    cutoff = float(np.clip(cutoff, 20.0, nyquist * 0.94))
    q = max(float(q), 0.05)
    w0 = 2.0 * math.pi * cutoff / sample_rate
    cos_w0 = math.cos(w0)
    sin_w0 = math.sin(w0)
    alpha = sin_w0 / (2.0 * q)

    if filter_type == "highpass":
        b0 = (1.0 + cos_w0) / 2.0
        b1 = -(1.0 + cos_w0)
        b2 = (1.0 + cos_w0) / 2.0
    elif filter_type == "bandpass":
        b0 = alpha
        b1 = 0.0
        b2 = -alpha
    elif filter_type == "notch":
        b0 = 1.0
        b1 = -2.0 * cos_w0
        b2 = 1.0
    else:  # lowpass
        b0 = (1.0 - cos_w0) / 2.0
        b1 = 1.0 - cos_w0
        b2 = (1.0 - cos_w0) / 2.0

    a0 = 1.0 + alpha
    a1 = -2.0 * cos_w0
    a2 = 1.0 - alpha

    return np.array(
        [[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]],
        dtype=np.float64,
    )


def apply_filter(
    signal: np.ndarray,
    filter_type: str,
    cutoff: float,
    q: float,
    sample_rate: int,
) -> np.ndarray:
    if signal.size == 0:
        return signal
    sos = biquad_sos(filter_type, cutoff, q, sample_rate)
    return sosfilt(sos, signal)


def apply_time_varying_filter(
    signal: np.ndarray,
    cutoff: np.ndarray,
    q: float,
    sample_rate: int,
    filter_type: str = "lowpass",
    block_size: int = 256,
) -> np.ndarray:
    """Block-wise biquad with per-block coefficient updates.

    This is the efficient compromise for a cutoff LFO: 64-sample blocks keep
    the movement smooth without a Python loop per sample.
    """

    if signal.size == 0:
        return signal
    if cutoff.size != signal.size:
        cutoff = np.resize(cutoff, signal.size)

    output = np.empty_like(signal, dtype=np.float64)
    zi = np.zeros((1, 2), dtype=np.float64)
    nyquist = sample_rate * 0.5

    for start in range(0, signal.size, block_size):
        end = min(signal.size, start + block_size)
        block = signal[start:end]
        current_cutoff = float(np.clip(np.mean(cutoff[start:end]), 20.0, nyquist * 0.94))
        sos = biquad_sos(filter_type, current_cutoff, q, sample_rate)
        filtered, zi = sosfilt(sos, block, zi=zi)
        output[start:end] = filtered

    return output


def filter_response(
    filter_type: str,
    cutoff: float,
    q: float,
    sample_rate: int,
    frequencies: np.ndarray,
) -> np.ndarray:
    sos = biquad_sos(filter_type, cutoff, q, sample_rate)
    _, response = sosfreqz(sos, worN=frequencies, fs=sample_rate)
    magnitude = np.abs(response)
    peak = float(np.max(magnitude)) if magnitude.size else 1.0
    magnitude = magnitude / max(peak, _EPS)
    return 20.0 * np.log10(np.maximum(magnitude, 1e-5))
