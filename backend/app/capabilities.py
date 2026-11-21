"""Machine-readable catalogue consumed by the React inspector.

Adding a new source or processor is mostly a backend task: expose its
parameter schema here and the frontend can render the generic controls.
"""

from __future__ import annotations

from typing import Any

from .schemas import SourceConfig


def _source_defaults(**overrides: Any) -> dict[str, Any]:
    base = SourceConfig().model_dump(mode="json")
    base.update(overrides)
    return base


SOURCES: list[dict[str, Any]] = [
    {
        "type": "sine",
        "label": "Seno",
        "short": "SEN",
        "description": "La onda pura: un solo armónico. Es la unidad básica de la síntesis aditiva.",
        "formula": "y(t) = A · sin(2πft + φ)",
        "default_trigger": "always",
        "defaults": _source_defaults(type="sine", frequency=220.0, amplitude=0.55),
        "params": ["frequency", "amplitude", "phase"],
    },
    {
        "type": "square",
        "label": "Cuadrada",
        "short": "CUA",
        "description": "Solo armónicos impares. Tiene un timbre hueco, parecido a un clarinete o un chip de 8 bits.",
        "formula": "y(t) = 4/π · Σ sin((2k+1)ωt)/(2k+1)",
        "default_trigger": "always",
        "defaults": _source_defaults(type="square", frequency=220.0, amplitude=0.35),
        "params": ["frequency", "amplitude", "phase"],
    },
    {
        "type": "triangle",
        "label": "Triangular",
        "short": "TRI",
        "description": "Armónicos impares que caen muy rápido. Suena suave, redonda, cercana a una flauta.",
        "formula": "y(t) = 8/π² · Σ (-1)^k sin((2k+1)ωt)/(2k+1)²",
        "default_trigger": "always",
        "defaults": _source_defaults(type="triangle", frequency=220.0, amplitude=0.45),
        "params": ["frequency", "amplitude", "phase"],
    },
    {
        "type": "sawtooth",
        "label": "Sierra",
        "short": "SIE",
        "description": "Contiene todos los armónicos. Es la base clásica de cuerdas, metales y pads con filtro.",
        "formula": "y(t) = 2/π · Σ (-1)^(k+1) sin(kωt)/k",
        "default_trigger": "always",
        "defaults": _source_defaults(type="sawtooth", frequency=220.0, amplitude=0.32),
        "params": ["frequency", "amplitude", "phase"],
    },
    {
        "type": "noise",
        "label": "Ruido",
        "short": "RUI",
        "description": "Energía repartida en todas las frecuencias. Sirve para aire, percusión y excitaciones físicas.",
        "formula": "y(t) = ruido blanco gaussiano",
        "default_trigger": "always",
        "defaults": _source_defaults(type="noise", amplitude=0.22),
        "params": ["amplitude"],
    },
    {
        "type": "partials",
        "label": "Parciales",
        "short": "PAR",
        "description": "Síntesis aditiva controlable: cada slider añade un armónico. Permite construir timbres tipo órgano, campana o cuerda.",
        "formula": "y(t) = Σ aₖ · sin(kωt)",
        "default_trigger": "note",
        "defaults": _source_defaults(
            type="partials",
            amplitude=0.55,
            partials=[0.9, 0.5, 0.32, 0.2, 0.13, 0.08, 0.05, 0.03],
        ),
        "params": ["amplitude", "phase", "partials"],
    },
    {
        "type": "pluck",
        "label": "Cuerda pulsada",
        "short": "CRD",
        "description": "Modelo físico Karplus-Strong: una excitación recorre una línea de retardo con un filtro que amortigua los agudos en cada vuelta.",
        "formula": "retardo D = fs/f₀ · filtro de amortiguación · realimentación",
        "default_trigger": "note",
        "defaults": _source_defaults(
            type="pluck",
            amplitude=0.9,
            decay=2.8,
            brightness=0.35,
            pluck_position=0.18,
            excitation="noise",
            damp_on_release=False,
        ),
        "params": [
            "amplitude",
            "decay",
            "brightness",
            "pluck_position",
            "excitation",
            "damp_on_release",
        ],
    },
]


PARAM_SPECS: dict[str, dict[str, Any]] = {
    "frequency": {
        "key": "frequency",
        "label": "Frecuencia",
        "type": "range",
        "min": 20,
        "max": 8000,
        "step": 1,
        "unit": "Hz",
        "scale": "log",
    },
    "amplitude": {
        "key": "amplitude",
        "label": "Amplitud",
        "type": "range",
        "min": 0,
        "max": 1,
        "step": 0.01,
        "unit": "",
    },
    "phase": {
        "key": "phase",
        "label": "Fase",
        "type": "range",
        "min": -180,
        "max": 180,
        "step": 1,
        "unit": "°",
    },
    "partials": {
        "key": "partials",
        "label": "Parciales",
        "type": "partials",
    },
    "decay": {
        "key": "decay",
        "label": "Decaimiento",
        "type": "range",
        "min": 0.1,
        "max": 8,
        "step": 0.1,
        "unit": "s",
        "scale": "log",
    },
    "brightness": {
        "key": "brightness",
        "label": "Brillo",
        "type": "range",
        "min": 0,
        "max": 0.85,
        "step": 0.01,
        "unit": "",
    },
    "pluck_position": {
        "key": "pluck_position",
        "label": "Punto del pellizco",
        "type": "range",
        "min": 0,
        "max": 0.9,
        "step": 0.01,
        "unit": "",
    },
    "excitation": {
        "key": "excitation",
        "label": "Excitación",
        "type": "select",
        "options": [
            {"value": "noise", "label": "Ruido"},
            {"value": "impulse", "label": "Impulso"},
        ],
    },
    "damp_on_release": {
        "key": "damp_on_release",
        "label": "Amortiguar al soltar",
        "type": "boolean",
    },
}


PROCESSORS: list[dict[str, Any]] = [
    {
        "type": "filter",
        "label": "Filtro",
        "short": "FLT",
        "color": "#38bdf8",
        "description": "Filtro biquad RBJ. Moldea el contenido espectral de toda la mezcla.",
        "params": [
            {
                "key": "filter_type",
                "label": "Tipo",
                "type": "select",
                "options": [
                    {"value": "lowpass", "label": "Paso bajo"},
                    {"value": "highpass", "label": "Paso alto"},
                    {"value": "bandpass", "label": "Paso banda"},
                    {"value": "notch", "label": "Notch"},
                ],
            },
            {
                "key": "cutoff",
                "label": "Corte",
                "type": "range",
                "min": 40,
                "max": 16000,
                "step": 1,
                "unit": "Hz",
                "scale": "log",
            },
            {
                "key": "resonance",
                "label": "Resonancia",
                "type": "range",
                "min": 0.1,
                "max": 12,
                "step": 0.05,
                "unit": "Q",
            },
        ],
    },
    {
        "type": "gain",
        "label": "Ganancia",
        "short": "GAN",
        "color": "#34d399",
        "description": "Nivel de la señal antes de la salida. Úsalo para evitar clipping.",
        "params": [
            {
                "key": "gain_db",
                "label": "Ganancia",
                "type": "range",
                "min": -36,
                "max": 24,
                "step": 0.5,
                "unit": "dB",
            }
        ],
    },
    {
        "type": "drive",
        "label": "Saturación",
        "short": "SAT",
        "color": "#fb7185",
        "description": "Curva tanh: añade armónicos y comprime los picos. Un recurso expresivo para cuerdas y pads.",
        "params": [
            {
                "key": "drive",
                "label": "Drive",
                "type": "range",
                "min": 0.1,
                "max": 20,
                "step": 0.1,
                "unit": "×",
                "scale": "log",
            }
        ],
    },
    {
        "type": "delay",
        "label": "Eco",
        "short": "ECO",
        "color": "#a78bfa",
        "description": "Delay con realimentación. Añade espacio y repeticiones sin necesitar una reverb completa.",
        "params": [
            {
                "key": "delay_ms",
                "label": "Tiempo",
                "type": "range",
                "min": 1,
                "max": 1000,
                "step": 1,
                "unit": "ms",
                "scale": "log",
            },
            {
                "key": "feedback",
                "label": "Realimentación",
                "type": "range",
                "min": 0,
                "max": 0.9,
                "step": 0.01,
                "unit": "",
            },
            {
                "key": "mix",
                "label": "Mezcla",
                "type": "range",
                "min": 0,
                "max": 1,
                "step": 0.01,
                "unit": "",
            },
        ],
    },
]


LFO_TARGETS = [
    {"value": "pitch", "label": "Pitch", "description": "Vibrato. No se aplica al modelo de cuerda."},
    {"value": "amplitude", "label": "Amplitud", "description": "Tremolo."},
    {"value": "cutoff", "label": "Corte del filtro", "description": "Barrido del filtro de capa."},
]


def capabilities(presets: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "version": 2,
        "sources": SOURCES,
        "params": PARAM_SPECS,
        "processors": PROCESSORS,
        "lfo_targets": LFO_TARGETS,
        "note_range": {"min": 24, "max": 96},
        "sample_rates": [44_100, 48_000],
        "presets": presets,
    }
