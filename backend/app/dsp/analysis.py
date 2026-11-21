"""Waveform windows, spectra, spectrograms and metrics."""

from __future__ import annotations

import math
import time

import numpy as np
from scipy.signal import stft

from ..schemas import Patch, RenderOptions
from .filters import filter_response
from .render import RenderResult

MIN_FREQ = 20.0
MAX_FREQ = 20_000.0


def _extract_window(
    signal: np.ndarray,
    sample_rate: int,
    start_seconds: float,
    window_seconds: float,
    max_points: int,
) -> tuple[np.ndarray, np.ndarray]:
    total = int(signal.size)
    if total < 2:
        return np.array([0.0]), np.array([0.0])

    start = int(round(float(np.clip(start_seconds, 0.0, max(0.0, total / sample_rate - 0.001))) * sample_rate))
    count = int(round(max(0.002, window_seconds) * sample_rate))
    count = max(2, min(count, total - start))
    chunk = np.asarray(signal[start : start + count], dtype=np.float64)

    if count <= max_points:
        values = chunk
    else:
        source_index = np.arange(count, dtype=np.float64)
        target_index = np.linspace(0.0, count - 1.0, max_points)
        values = np.interp(target_index, source_index, chunk)

    times = np.linspace(start / sample_rate, (start + count - 1) / sample_rate, values.size)
    return times * 1000.0, values


def _metrics(signal: np.ndarray, dominant_hz: float, brightness_hz: float) -> dict:
    values = np.asarray(signal, dtype=np.float64)
    peak = float(np.max(np.abs(values))) if values.size else 0.0
    rms = float(np.sqrt(np.mean(np.square(values)))) if values.size else 0.0
    crest = peak / rms if rms > 1e-9 else 0.0
    clipped = float(np.mean(np.abs(values) > 1.0) * 100.0) if values.size else 0.0
    return {
        "peak": round(peak, 4),
        "rms": round(rms, 4),
        "peak_db": round(float(20.0 * math.log10(max(peak, 1e-6))), 2),
        "rms_db": round(float(20.0 * math.log10(max(rms, 1e-6))), 2),
        "crest_db": round(float(20.0 * math.log10(max(crest, 1e-6))), 2),
        "clip_percent": round(clipped, 2),
        "dominant_hz": round(float(dominant_hz), 1),
        "brightness_hz": round(float(brightness_hz), 1),
    }


def _spectrum(input_signal: np.ndarray, output_signal: np.ndarray, sample_rate: int, points: int) -> dict:
    count = min(len(input_signal), len(output_signal))
    if count < 16:
        freqs = np.geomspace(MIN_FREQ, min(MAX_FREQ, sample_rate * 0.45), points)
        return {
            "frequencies": [round(float(value), 1) for value in freqs],
            "input_db": [-90.0] * points,
            "output_db": [-90.0] * points,
            "dominant_input": 0.0,
            "dominant_output": 0.0,
            "centroid_input": 0.0,
            "centroid_output": 0.0,
        }

    window = np.hanning(count)
    input_fft = np.fft.rfft(np.asarray(input_signal[:count], dtype=np.float64) * window)
    output_fft = np.fft.rfft(np.asarray(output_signal[:count], dtype=np.float64) * window)
    frequencies = np.fft.rfftfreq(count, d=1.0 / sample_rate)
    input_mag = np.abs(input_fft)
    output_mag = np.abs(output_fft)

    upper = min(MAX_FREQ, sample_rate * 0.45)
    valid = (frequencies >= MIN_FREQ) & (frequencies <= upper)
    if not np.any(valid):
        valid = frequencies >= 1.0

    reference = max(
        float(np.max(input_mag[valid])) if np.any(valid) else 0.0,
        float(np.max(output_mag[valid])) if np.any(valid) else 0.0,
        1e-12,
    )

    def to_db(magnitude: np.ndarray) -> np.ndarray:
        return 20.0 * np.log10(np.maximum(magnitude / reference, 1e-5))

    input_db = to_db(input_mag)
    output_db = to_db(output_mag)

    edges = np.geomspace(MIN_FREQ, upper, points + 1)
    display_freqs: list[float] = []
    display_input: list[float] = []
    display_output: list[float] = []
    for index in range(points):
        low, high = edges[index], edges[index + 1]
        mask = valid & (frequencies >= low) & (frequencies < high)
        if not np.any(mask):
            nearest = int(np.argmin(np.abs(frequencies - math.sqrt(low * high))))
            freq_value = float(frequencies[nearest])
            in_value = float(input_db[nearest])
            out_value = float(output_db[nearest])
        else:
            indices = np.flatnonzero(mask)
            in_index = int(indices[np.argmax(input_mag[indices])])
            out_index = int(indices[np.argmax(output_mag[indices])])
            freq_value = float(math.sqrt(low * high))
            in_value = float(input_db[in_index])
            out_value = float(output_db[out_index])
        display_freqs.append(round(freq_value, 1))
        display_input.append(round(float(np.clip(in_value, -90.0, 6.0)), 1))
        display_output.append(round(float(np.clip(out_value, -90.0, 6.0)), 1))

    def dominant(magnitude: np.ndarray) -> float:
        local = magnitude[valid]
        local_freqs = frequencies[valid]
        if not local.size:
            return 0.0
        return float(local_freqs[int(np.argmax(local))])

    def centroid(magnitude: np.ndarray) -> float:
        local = magnitude[valid]
        local_freqs = frequencies[valid]
        if not local.size:
            return 0.0
        threshold = local.max() * 10.0 ** (-60.0 / 20.0)
        weights = np.where(local >= threshold, local, 0.0)
        total = float(np.sum(weights))
        return float(np.sum(local_freqs * weights) / total) if total > 0 else 0.0

    return {
        "frequencies": display_freqs,
        "input_db": display_input,
        "output_db": display_output,
        "dominant_input": dominant(input_mag),
        "dominant_output": dominant(output_mag),
        "centroid_input": centroid(input_mag),
        "centroid_output": centroid(output_mag),
    }


def _spectrogram(
    signal: np.ndarray,
    sample_rate: int,
    time_bins: int,
    freq_bins: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    values = np.asarray(signal, dtype=np.float64)
    nperseg = min(2048, max(64, values.size))
    if values.size < nperseg:
        values = np.pad(values, (0, nperseg - values.size))
    noverlap = int(nperseg * 0.75)
    frequencies, times, spectrum = stft(
        values,
        fs=sample_rate,
        window="hann",
        nperseg=nperseg,
        noverlap=noverlap,
        boundary=None,
        padded=False,
    )
    power = np.abs(spectrum) ** 2

    upper = min(18_000.0, sample_rate * 0.45)
    freq_edges = np.geomspace(40.0, upper, freq_bins + 1)
    freq_matrix = np.empty((freq_bins, power.shape[1]), dtype=np.float64)
    for index in range(freq_bins):
        low, high = freq_edges[index], freq_edges[index + 1]
        mask = (frequencies >= low) & (frequencies < high)
        if not np.any(mask):
            nearest = int(np.argmin(np.abs(frequencies - math.sqrt(low * high))))
            freq_matrix[index] = power[nearest]
        else:
            freq_matrix[index] = np.max(power[mask], axis=0)

    if power.shape[1] <= time_bins:
        frame_edges = np.linspace(0, power.shape[1], time_bins + 1).astype(int)
        time_matrix = np.empty((freq_bins, time_bins), dtype=np.float64)
        for index in range(time_bins):
            low = min(power.shape[1] - 1, frame_edges[index])
            high = max(low + 1, min(power.shape[1], frame_edges[index + 1]))
            time_matrix[:, index] = np.max(freq_matrix[:, low:high], axis=1)
    else:
        frame_edges = np.linspace(0, power.shape[1], time_bins + 1).astype(int)
        time_matrix = np.empty((freq_bins, time_bins), dtype=np.float64)
        for index in range(time_bins):
            low = frame_edges[index]
            high = max(low + 1, frame_edges[index + 1])
            time_matrix[:, index] = np.max(freq_matrix[:, low:high], axis=1)

    display_times = np.linspace(0.0, values.size / sample_rate, time_bins)
    display_freqs = np.sqrt(freq_edges[:-1] * freq_edges[1:])
    return display_times, display_freqs, time_matrix


def _responses(patch: Patch, sample_rate: int) -> list[dict]:
    upper = min(18_000.0, sample_rate * 0.45)
    freqs = np.geomspace(40.0, upper, 128)
    responses: list[dict] = []

    for layer in patch.layers:
        if layer.filter.enabled:
            db = filter_response(
                layer.filter.type,
                layer.filter.cutoff,
                layer.filter.resonance,
                sample_rate,
                freqs,
            )
            responses.append(
                {
                    "id": f"layer:{layer.id}",
                    "label": f"{layer.name} · filtro",
                    "frequencies": [round(float(value), 1) for value in freqs],
                    "db": [round(float(value), 1) for value in db],
                }
            )

    for stage in patch.master_chain:
        if stage.type == "filter" and stage.enabled:
            db = filter_response(
                stage.filter_type,
                stage.cutoff,
                stage.resonance,
                sample_rate,
                freqs,
            )
            responses.append(
                {
                    "id": f"stage:{stage.id}",
                    "label": "Cadena maestra · filtro",
                    "frequencies": [round(float(value), 1) for value in freqs],
                    "db": [round(float(value), 1) for value in db],
                }
            )

    return responses


def analyze(result: RenderResult, patch: Patch, options: RenderOptions) -> dict:
    started = time.perf_counter()
    sample_rate = result.sample_rate
    duration = result.duration

    window_start = float(np.clip(options.window_start, 0.0, max(0.0, duration - 0.01)))
    window_seconds = float(np.clip(options.window_seconds, 0.02, max(0.02, duration - window_start)))
    time_ms, input_values = _extract_window(
        result.input, sample_rate, window_start, window_seconds, options.max_points
    )
    _, output_values = _extract_window(
        result.output, sample_rate, window_start, window_seconds, options.max_points
    )

    layer_payload: list[dict] = []
    for layer in result.layers:
        _, samples = _extract_window(
            layer["samples"], sample_rate, window_start, window_seconds, options.max_points
        )
        layer_payload.append(
            {
                "id": layer["id"],
                "name": layer["name"],
                "color": layer["color"],
                "samples": [round(float(value), 5) for value in samples],
            }
        )

    spectrum = _spectrum(result.input, result.output, sample_rate, options.spectrum_points)

    spectrogram_payload = None
    if options.spectrogram:
        times, freqs, input_matrix = _spectrogram(
            result.input,
            sample_rate,
            options.spectrogram_time_bins,
            options.spectrogram_freq_bins,
        )
        _, _, output_matrix = _spectrogram(
            result.output,
            sample_rate,
            options.spectrogram_time_bins,
            options.spectrogram_freq_bins,
        )
        global_peak = max(float(np.max(input_matrix)), float(np.max(output_matrix)), 1e-12)
        input_db = 10.0 * np.log10(np.maximum(input_matrix / global_peak, 1e-8))
        output_db = 10.0 * np.log10(np.maximum(output_matrix / global_peak, 1e-8))
        input_db = np.clip(input_db, -80.0, 0.0)
        output_db = np.clip(output_db, -80.0, 0.0)
        spectrogram_payload = {
            "times": [round(float(value), 3) for value in times],
            "frequencies": [round(float(value), 1) for value in freqs],
            "input_db": [[round(float(value), 1) for value in row] for row in input_db.T],
            "output_db": [[round(float(value), 1) for value in row] for row in output_db.T],
        }

    analysis_ms = (time.perf_counter() - started) * 1000.0

    return {
        "time_ms": [round(float(value), 3) for value in time_ms],
        "window": {"start": round(window_start, 3), "duration": round(window_seconds, 3)},
        "input": [round(float(value), 5) for value in input_values],
        "output": [round(float(value), 5) for value in output_values],
        "layers": layer_payload,
        "spectrum": {
            "frequencies": spectrum["frequencies"],
            "input_db": spectrum["input_db"],
            "output_db": spectrum["output_db"],
        },
        "spectrogram": spectrogram_payload,
        "metrics": {
            "input": _metrics(
                result.input,
                spectrum["dominant_input"],
                spectrum["centroid_input"],
            ),
            "output": _metrics(
                result.output,
                spectrum["dominant_output"],
                spectrum["centroid_output"],
            ),
        },
        "responses": _responses(patch, sample_rate),
        "meta": {
            "sample_rate": sample_rate,
            "render_seconds": round(duration, 3),
            "render_ms": round(result.render_ms, 2),
            "analysis_ms": round(analysis_ms, 2),
            "voices": result.voices,
            "active_layers": result.active_layers,
            "active_stages": result.active_stages,
            "input_peak": round(result.input_peak, 4),
            "output_peak": round(result.output_peak, 4),
            "window_ms": round(window_seconds * 1000.0, 1),
            "points": options.max_points,
        },
    }
