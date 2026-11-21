"""Built-in didactic presets.

Each preset is a complete project: a patch plus a short sequence.  The
frontend loads them through ``/api/capabilities`` so the Python engine remains
the single source of truth for sound design.
"""

from __future__ import annotations

from .schemas import (
    AmpEnvelope,
    Layer,
    LayerFilter,
    LfoConfig,
    NoteEvent,
    Patch,
    Preset,
    Sequence,
    SourceConfig,
    Stage,
)


def _pluck_layer(
    *,
    layer_id: str = "string",
    name: str = "Cuerda",
    color: str = "#22d3ee",
    decay: float = 2.8,
    brightness: float = 0.35,
    pluck_position: float = 0.18,
    gain: float = 0.9,
    cutoff: float = 5200.0,
    damp_on_release: bool = False,
) -> Layer:
    return Layer(
        id=layer_id,
        name=name,
        color=color,
        trigger="note",
        gain=gain,
        source=SourceConfig(
            type="pluck",
            amplitude=0.95,
            decay=decay,
            brightness=brightness,
            pluck_position=pluck_position,
            excitation="noise",
            damp_on_release=damp_on_release,
        ),
        envelope=AmpEnvelope(enabled=False),
        filter=LayerFilter(enabled=True, type="lowpass", cutoff=cutoff, resonance=0.7),
        lfo=LfoConfig(enabled=False),
    )


def _note(note_id: str, start: float, pitch: int, duration: float = 1.4, velocity: float = 0.8) -> NoteEvent:
    return NoteEvent(
        id=note_id,
        start=start,
        duration=duration,
        pitch=pitch,
        velocity=velocity,
    )


def _stage(stage_id: str, stage_type: str, **values: float | str | bool) -> Stage:
    return Stage(id=stage_id, type=stage_type, **values)  # type: ignore[arg-type]


PLUCK_PRESET = Preset(
    id="plucked-string",
    name="Cuerda pulsada",
    description="Karplus-Strong con un arpegio. Escucha cómo el filtro de la cuerda apaga los agudos con cada vuelta.",
    patch=Patch(
        layers=[_pluck_layer()],
        master_chain=[
            _stage("tone", "filter", filter_type="lowpass", cutoff=7600.0, resonance=0.6),
            _stage("space", "delay", delay_ms=165.0, feedback=0.22, mix=0.18),
        ],
        master_gain_db=-1.5,
    ),
    sequence=Sequence(
        duration=4.8,
        events=[
            _note("n1", 0.00, 48, 1.8, 0.85),
            _note("n2", 0.35, 55, 1.5, 0.72),
            _note("n3", 0.70, 60, 1.4, 0.78),
            _note("n4", 1.05, 64, 1.4, 0.66),
            _note("n5", 1.40, 67, 1.6, 0.62),
            _note("n6", 2.30, 60, 1.6, 0.76),
            _note("n7", 2.65, 64, 1.4, 0.7),
            _note("n8", 3.00, 67, 1.8, 0.64),
        ],
    ),
)

HARP_PRESET = Preset(
    id="harp",
    name="Arpa",
    description="Una cuerda más brillante y corta, con pellizco cerca del puente y un eco suave.",
    patch=Patch(
        layers=[
            _pluck_layer(
                layer_id="harp",
                name="Arpa",
                color="#fbbf24",
                decay=1.7,
                brightness=0.22,
                pluck_position=0.34,
                gain=0.82,
                cutoff=8500.0,
            )
        ],
        master_chain=[
            _stage("air", "filter", filter_type="highpass", cutoff=120.0, resonance=0.6),
            _stage("echo", "delay", delay_ms=230.0, feedback=0.28, mix=0.16),
        ],
        master_gain_db=-2.0,
    ),
    sequence=Sequence(
        duration=4.0,
        events=[
            _note("h1", 0.00, 60, 1.0, 0.8),
            _note("h2", 0.20, 64, 1.0, 0.72),
            _note("h3", 0.40, 67, 1.0, 0.7),
            _note("h4", 0.60, 72, 1.1, 0.75),
            _note("h5", 0.80, 67, 1.0, 0.62),
            _note("h6", 1.00, 64, 1.0, 0.66),
            _note("h7", 1.20, 60, 1.2, 0.7),
            _note("h8", 2.00, 55, 1.2, 0.7),
            _note("h9", 2.20, 60, 1.2, 0.72),
            _note("h10", 2.40, 64, 1.2, 0.72),
            _note("h11", 2.60, 67, 1.2, 0.7),
        ],
    ),
)

PAD_PRESET = Preset(
    id="analog-pad",
    name="Pad analógico",
    description="Dos sierras desafinadas, ADSR lento y un LFO que abre y cierra el filtro. La entrada es un drone continuo.",
    patch=Patch(
        layers=[
            Layer(
                id="pad-a",
                name="Sierra A",
                color="#a78bfa",
                trigger="always",
                gain=0.34,
                source=SourceConfig(type="sawtooth", frequency=110.0, amplitude=0.55),
                envelope=AmpEnvelope(enabled=True, attack=0.7, decay=1.2, sustain=0.72, release=1.8),
                filter=LayerFilter(enabled=True, type="lowpass", cutoff=1500.0, resonance=1.4),
                lfo=LfoConfig(enabled=True, waveform="sine", rate=0.13, depth=0.55, target="cutoff"),
            ),
            Layer(
                id="pad-b",
                name="Sierra B",
                color="#c084fc",
                trigger="always",
                gain=0.3,
                source=SourceConfig(type="sawtooth", frequency=110.7, amplitude=0.55),
                envelope=AmpEnvelope(enabled=True, attack=0.9, decay=1.0, sustain=0.68, release=2.0),
                filter=LayerFilter(enabled=True, type="lowpass", cutoff=2100.0, resonance=0.9),
                lfo=LfoConfig(enabled=True, waveform="sine", rate=0.09, depth=0.4, target="cutoff"),
            ),
        ],
        master_chain=[
            _stage("warmth", "filter", filter_type="lowpass", cutoff=4200.0, resonance=0.5),
            _stage("space", "delay", delay_ms=420.0, feedback=0.3, mix=0.18),
        ],
        master_gain_db=-5.0,
    ),
    sequence=Sequence(duration=6.0, events=[]),
)

BELL_PRESET = Preset(
    id="partial-bell",
    name="Campana de parciales",
    description="Síntesis aditiva con caída larga. Los parciales agudos se apagan antes: eso crea la sensación metálica.",
    patch=Patch(
        layers=[
            Layer(
                id="bell",
                name="Campana",
                color="#f472b6",
                trigger="note",
                gain=0.8,
                source=SourceConfig(
                    type="partials",
                    amplitude=0.7,
                    partials=[1.0, 0.0, 0.55, 0.32, 0.0, 0.24, 0.18, 0.12, 0.09, 0.06, 0.04, 0.03],
                ),
                envelope=AmpEnvelope(enabled=True, attack=0.004, decay=2.8, sustain=0.0, release=1.6),
                filter=LayerFilter(enabled=True, type="highpass", cutoff=180.0, resonance=0.6),
                lfo=LfoConfig(enabled=False),
            )
        ],
        master_chain=[
            _stage("air", "filter", filter_type="lowpass", cutoff=12000.0, resonance=0.4),
            _stage("space", "delay", delay_ms=310.0, feedback=0.38, mix=0.22),
        ],
        master_gain_db=-4.0,
    ),
    sequence=Sequence(
        duration=5.0,
        events=[
            _note("b1", 0.0, 72, 0.8, 0.8),
            _note("b2", 1.4, 76, 0.8, 0.7),
            _note("b3", 2.8, 79, 1.2, 0.65),
        ],
    ),
)

BEAT_PRESET = Preset(
    id="beating-sines",
    name="Batido",
    description="Dos senos casi iguales (440 y 444 Hz) producen un pulso de 4 Hz. Es un experimento clásico de interferencia.",
    patch=Patch(
        layers=[
            Layer(
                id="sine-a",
                name="Seno 440",
                color="#22d3ee",
                trigger="always",
                gain=0.36,
                source=SourceConfig(type="sine", frequency=440.0, amplitude=0.7),
                envelope=AmpEnvelope(enabled=True, attack=0.08, decay=0.2, sustain=1.0, release=0.4),
                filter=LayerFilter(enabled=False),
            ),
            Layer(
                id="sine-b",
                name="Seno 444",
                color="#38bdf8",
                trigger="always",
                gain=0.36,
                source=SourceConfig(type="sine", frequency=444.0, amplitude=0.7),
                envelope=AmpEnvelope(enabled=True, attack=0.08, decay=0.2, sustain=1.0, release=0.4),
                filter=LayerFilter(enabled=False),
            ),
        ],
        master_chain=[_stage("gain", "gain", gain_db=-2.0)],
        master_gain_db=-3.0,
    ),
    sequence=Sequence(duration=5.0, events=[]),
)

NOISE_PRESET = Preset(
    id="filtered-noise",
    name="Ruido filtrado",
    description="Ruido blanco atravesando un filtro paso bajo animado por un LFO. El espectrograma muestra el barrido.",
    patch=Patch(
        layers=[
            Layer(
                id="air",
                name="Aire",
                color="#34d399",
                trigger="always",
                gain=0.55,
                source=SourceConfig(type="noise", amplitude=0.4),
                envelope=AmpEnvelope(enabled=True, attack=0.6, decay=0.8, sustain=0.8, release=1.4),
                filter=LayerFilter(enabled=True, type="lowpass", cutoff=700.0, resonance=2.2),
                lfo=LfoConfig(enabled=True, waveform="triangle", rate=0.16, depth=0.75, target="cutoff"),
            )
        ],
        master_chain=[
            _stage("tone", "filter", filter_type="highpass", cutoff=90.0, resonance=0.5),
            _stage("space", "delay", delay_ms=380.0, feedback=0.32, mix=0.2),
        ],
        master_gain_db=-4.0,
    ),
    sequence=Sequence(duration=6.0, events=[]),
)


PRESETS: list[Preset] = [
    PLUCK_PRESET,
    HARP_PRESET,
    PAD_PRESET,
    BELL_PRESET,
    BEAT_PRESET,
    NOISE_PRESET,
]


def preset_payloads() -> list[dict]:
    return [preset.model_dump(mode="json") for preset in PRESETS]
