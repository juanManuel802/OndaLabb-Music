from __future__ import annotations

import numpy as np
import pytest

from app.dsp.envelopes import adsr_envelope
from app.dsp.oscillators import note_to_frequency
from app.dsp.physical import render_pluck
from app.presets import PLUCK_PRESET
from app.schemas import RenderOptions, SourceConfig


def _autocorrelation_pitch(signal: np.ndarray, sample_rate: int, low: float = 80.0, high: float = 2000.0) -> float:
    centered = signal - float(np.mean(signal))
    correlation = np.correlate(centered, centered, mode="full")[len(centered) - 1 :]
    minimum = max(1, int(sample_rate / high))
    maximum = min(len(correlation) - 1, int(sample_rate / low))
    lag = int(np.argmax(correlation[minimum:maximum]) + minimum)
    return sample_rate / lag


def test_pluck_tuning_and_stability() -> None:
    sample_rate = 48_000
    source = SourceConfig(
        type="pluck",
        amplitude=0.9,
        decay=3.0,
        brightness=0.35,
        pluck_position=0.18,
    )
    for pitch in (48, 60, 69, 76):
        frequency = note_to_frequency(pitch)
        signal = render_pluck(
            int(2.0 * sample_rate),
            sample_rate,
            frequency,
            source,
            0.8,
            np.random.default_rng(3),
        )
        assert np.all(np.isfinite(signal))
        assert float(np.max(np.abs(signal))) < 2.5
        measured = _autocorrelation_pitch(signal[int(0.2 * sample_rate) : int(1.2 * sample_rate)], sample_rate)
        cents = 1200.0 * np.log2(measured / frequency)
        assert abs(cents) < 25.0


def test_adsr_reaches_sustain_and_release() -> None:
    sample_rate = 1000
    envelope = adsr_envelope(
        1000,
        sample_rate,
        note_duration=0.6,
        attack=0.05,
        decay=0.1,
        sustain=0.5,
        release=0.2,
    )
    assert envelope[0] == pytest.approx(0.0)
    assert envelope[200] == pytest.approx(0.5, abs=0.06)
    assert envelope[800] == pytest.approx(0.0, abs=0.02)
    assert float(np.max(envelope)) <= 1.0


def test_render_options_and_preset_are_valid() -> None:
    assert PLUCK_PRESET.patch.layers
    assert PLUCK_PRESET.sequence.events
    options = RenderOptions()
    assert options.window_seconds > 0
