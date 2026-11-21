"""Master-chain processors."""

from __future__ import annotations

import math

import numpy as np
from ..schemas import Stage
from .filters import apply_filter


def _apply_delay(signal: np.ndarray, delay_ms: float, feedback: float, mix: float, sample_rate: int) -> np.ndarray:
    delay_samples = max(1, int(round(delay_ms * sample_rate / 1000.0)))
    if delay_samples >= signal.size or mix <= 0.0:
        return signal

    feedback = float(np.clip(feedback, 0.0, 0.9))
    wet = np.zeros_like(signal, dtype=np.float64)

    # y[n] = x[n] + feedback * y[n-D].  Process in blocks of D samples:
    # every sample in a block only depends on an already-rendered block.
    for start in range(0, signal.size, delay_samples):
        end = min(signal.size, start + delay_samples)
        block = signal[start:end]
        if start >= delay_samples:
            block = block + feedback * wet[start - delay_samples : end - delay_samples]
        wet[start:end] = block

    return (1.0 - mix) * signal + mix * wet


def apply_master_chain(signal: np.ndarray, stages: list[Stage], sample_rate: int) -> np.ndarray:
    output = np.array(signal, dtype=np.float64, copy=True)

    for stage in stages:
        if not stage.enabled:
            continue
        if stage.type == "filter":
            output = apply_filter(
                output,
                stage.filter_type,
                stage.cutoff,
                stage.resonance,
                sample_rate,
            )
        elif stage.type == "gain":
            output *= 10.0 ** (stage.gain_db / 20.0)
        elif stage.type == "drive":
            amount = max(0.1, float(stage.drive))
            denominator = math.tanh(amount)
            if denominator > 1e-9:
                output = np.tanh(output * amount) / denominator
        elif stage.type == "delay":
            output = _apply_delay(output, stage.delay_ms, stage.feedback, stage.mix, sample_rate)

    return np.nan_to_num(output, nan=0.0, posinf=0.0, neginf=0.0)
