"""Karplus-Strong plucked-string physical model.

The feedback loop is implemented as a sparse IIR filter so it runs in
C-optimised SciPy code instead of a per-sample Python loop.

Loop:  excitation -> delay (pitch) -> one-pole damping -> feedback

A first-order allpass supplies the fractional part of the delay, which keeps
the tuning accurate without an expensive per-sample interpolation loop.
"""

from __future__ import annotations

import numpy as np
from scipy.signal import lfilter

from ..schemas import SourceConfig
from .oscillators import note_to_frequency


def _excitation(
    length: int,
    velocity: float,
    amplitude: float,
    pluck_position: float,
    excitation_type: str,
    rng: np.random.Generator,
) -> np.ndarray:
    if excitation_type == "impulse":
        values = np.zeros(length, dtype=np.float64)
        if length:
            values[0] = 1.0
    else:
        values = rng.standard_normal(length).astype(np.float64)

    # Pluck position: a feed-forward comb creates the classic missing
    # harmonics depending on where the string is excited.
    position = int(round(float(np.clip(pluck_position, 0.0, 0.9)) * length))
    if 0 < position < length:
        values[position:] -= 0.82 * values[:-position].copy()

    # Soften the end of the burst so the model does not click.
    fade_length = max(1, length // 4)
    if fade_length < length:
        values[-fade_length:] *= np.linspace(1.0, 0.0, fade_length)

    return values * float(amplitude) * float(velocity)


def render_pluck(
    n: int,
    sample_rate: int,
    frequency: float,
    source: SourceConfig,
    velocity: float,
    rng: np.random.Generator,
) -> np.ndarray:
    """Render one plucked-string voice of ``n`` samples."""

    if n <= 0:
        return np.empty(0, dtype=np.float64)

    frequency = float(np.clip(frequency, 20.0, sample_rate * 0.45))
    total_delay = sample_rate / frequency

    # The loop lowpass adds phase delay.  Compensate so the perceived pitch
    # stays close to the requested note.
    brightness = float(np.clip(source.brightness, 0.0, 0.85))
    lowpass_delay = brightness / max(1e-6, 1.0 - brightness)
    if total_delay - lowpass_delay < 2.5:
        brightness = 0.0
        lowpass_delay = 0.0

    effective_delay = max(2.0, total_delay - lowpass_delay)
    integer_delay = int(np.floor(effective_delay))
    fraction = effective_delay - integer_delay

    # T60 target -> gain per loop.  Keep a little margin below unity.
    decay = max(0.1, float(source.decay))
    feedback = 10.0 ** (-3.0 * total_delay / (decay * sample_rate))
    feedback = float(np.clip(feedback, 0.0, 0.9995))

    excitation_length = min(n, max(8, int(round(total_delay))))
    excitation = _excitation(
        excitation_length,
        velocity=velocity,
        amplitude=source.amplitude,
        pluck_position=source.pluck_position,
        excitation_type=source.excitation,
        rng=rng,
    )

    x = np.zeros(n, dtype=np.float64)
    x[:excitation_length] = excitation

    b = brightness
    g = feedback
    integer_delay = max(1, integer_delay)
    fraction = float(np.clip(fraction, 0.0, 1.0))

    # Block feedback delay.  A block can be at most the integer delay length
    # because every sample only depends on already-rendered output.  This is
    # O(n) per voice instead of O(n * delay) with a sparse lfilter.
    output = np.zeros(n, dtype=np.float64)
    lowpass_state = np.zeros(1, dtype=np.float64)
    lowpass_b = np.array([1.0 - b], dtype=np.float64)
    lowpass_a = np.array([1.0, -b], dtype=np.float64)

    for start in range(0, n, integer_delay):
        end = min(n, start + integer_delay)
        indices = np.arange(start, end, dtype=np.int64)
        delayed_a = np.where(indices - integer_delay >= 0, output[np.maximum(0, indices - integer_delay)], 0.0)
        delayed_b = np.where(indices - integer_delay - 1 >= 0, output[np.maximum(0, indices - integer_delay - 1)], 0.0)
        delayed = (1.0 - fraction) * delayed_a + fraction * delayed_b

        if b > 1e-9:
            lowpassed, lowpass_state = lfilter(lowpass_b, lowpass_a, delayed, zi=lowpass_state)
        else:
            lowpassed = delayed

        output[start:end] = x[start:end] + g * lowpassed

    # Remove any DC drift without eating the low notes.
    output = lfilter([1.0, -1.0], [1.0, -0.9995], output)
    output = np.nan_to_num(output, nan=0.0, posinf=0.0, neginf=0.0)

    peak = float(np.max(np.abs(output))) if output.size else 0.0
    if peak > 2.0:
        output *= 1.8 / peak
    return output


def render_pluck_note(
    n: int,
    sample_rate: int,
    pitch: int,
    source: SourceConfig,
    velocity: float,
    rng: np.random.Generator,
) -> np.ndarray:
    return render_pluck(
        n=n,
        sample_rate=sample_rate,
        frequency=note_to_frequency(pitch),
        source=source,
        velocity=velocity,
        rng=rng,
    )
