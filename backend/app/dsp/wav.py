"""WAV encoding for browser playback and offline export."""

from __future__ import annotations

import io
import wave

import numpy as np


def to_wav(signal: np.ndarray, sample_rate: int) -> bytes:
    values = np.asarray(signal, dtype=np.float64)
    if values.size == 0:
        values = np.zeros(64, dtype=np.float64)

    peak = float(np.max(np.abs(values)))
    if peak > 1.0:
        # The analysis keeps the real level; the audio file has to stay in
        # range.  A short limiter-style soft clip avoids harsh digital wrap.
        values = np.tanh(values * 1.15) / np.tanh(1.15)
        peak = float(np.max(np.abs(values)))
        if peak > 0.999:
            values *= 0.999 / peak

    fade_in = min(values.size // 2, max(1, int(0.002 * sample_rate)))
    fade_out = min(values.size // 2, max(1, int(0.008 * sample_rate)))
    if fade_in:
        values[:fade_in] *= np.linspace(0.0, 1.0, fade_in, endpoint=False)
    if fade_out:
        values[-fade_out:] *= np.linspace(1.0, 0.0, fade_out)

    pcm = (np.clip(values, -1.0, 1.0) * 32767.0).astype("<i2")
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(int(sample_rate))
        wav_file.writeframes(pcm.tobytes())
    return buffer.getvalue()
