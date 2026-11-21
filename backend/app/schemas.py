"""Pydantic models for the OndaLab offline sound laboratory.

The API deliberately separates a *patch* (the sound) from a *sequence*
(the notes).  A patch can be saved, reused and played by many sequences.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SourceType = Literal[
    "sine",
    "square",
    "triangle",
    "sawtooth",
    "noise",
    "partials",
    "pluck",
]
TriggerType = Literal["always", "note"]
FilterType = Literal["lowpass", "highpass", "bandpass", "notch"]
StageType = Literal["filter", "gain", "drive", "delay"]
LfoWaveform = Literal["sine", "triangle"]
LfoTarget = Literal["pitch", "amplitude", "cutoff"]
ExcitationType = Literal["noise", "impulse"]


class SourceConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: SourceType = "sine"
    frequency: float = Field(default=220.0, ge=20.0, le=12_000.0)
    amplitude: float = Field(default=0.5, ge=0.0, le=1.0)
    phase: float = Field(default=0.0, ge=-720.0, le=720.0)

    # Additive source: amplitudes for harmonics 1..N.
    partials: list[float] = Field(
        default_factory=lambda: [0.8, 0.4, 0.25, 0.15, 0.1, 0.06, 0.04, 0.02],
        max_length=16,
    )

    # Karplus-Strong plucked string.
    decay: float = Field(default=2.8, ge=0.1, le=10.0)
    brightness: float = Field(default=0.35, ge=0.0, le=0.85)
    pluck_position: float = Field(default=0.18, ge=0.0, le=0.9)
    excitation: ExcitationType = "noise"
    damp_on_release: bool = False

    @field_validator("partials")
    @classmethod
    def _validate_partials(cls, values: list[float]) -> list[float]:
        if not values:
            return [0.8, 0.4, 0.25, 0.15, 0.1, 0.06, 0.04, 0.02]
        return [float(min(1.0, max(0.0, value))) for value in values[:16]]


class AmpEnvelope(BaseModel):
    model_config = ConfigDict(extra="ignore")

    enabled: bool = True
    attack: float = Field(default=0.01, ge=0.0, le=3.0)
    decay: float = Field(default=0.2, ge=0.0, le=4.0)
    sustain: float = Field(default=0.7, ge=0.0, le=1.0)
    release: float = Field(default=0.35, ge=0.0, le=5.0)


class LayerFilter(BaseModel):
    model_config = ConfigDict(extra="ignore")

    enabled: bool = False
    type: FilterType = "lowpass"
    cutoff: float = Field(default=1800.0, ge=40.0, le=16_000.0)
    resonance: float = Field(default=0.9, ge=0.1, le=12.0)


class LfoConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    enabled: bool = False
    waveform: LfoWaveform = "sine"
    rate: float = Field(default=5.0, ge=0.05, le=20.0)
    depth: float = Field(default=0.0, ge=0.0, le=1.0)
    target: LfoTarget = "pitch"


class Layer(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=64)
    name: str = Field(default="Capa", min_length=1, max_length=80)
    color: str = Field(default="#22d3ee", pattern=r"^#[0-9a-fA-F]{6}$")
    enabled: bool = True
    solo: bool = False
    trigger: TriggerType = "always"
    gain: float = Field(default=0.8, ge=0.0, le=2.0)
    source: SourceConfig = Field(default_factory=SourceConfig)
    envelope: AmpEnvelope = Field(default_factory=AmpEnvelope)
    filter: LayerFilter = Field(default_factory=LayerFilter)
    lfo: LfoConfig = Field(default_factory=LfoConfig)


class Stage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=64)
    type: StageType = "filter"
    enabled: bool = True

    filter_type: FilterType = "lowpass"
    cutoff: float = Field(default=2400.0, ge=40.0, le=16_000.0)
    resonance: float = Field(default=0.9, ge=0.1, le=12.0)

    gain_db: float = Field(default=0.0, ge=-36.0, le=24.0)

    drive: float = Field(default=2.0, ge=0.1, le=20.0)

    delay_ms: float = Field(default=180.0, ge=1.0, le=1000.0)
    feedback: float = Field(default=0.25, ge=0.0, le=0.9)
    mix: float = Field(default=0.22, ge=0.0, le=1.0)


class NoteEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=64)
    start: float = Field(default=0.0, ge=0.0, le=20.0)
    duration: float = Field(default=0.8, ge=0.05, le=12.0)
    pitch: int = Field(default=60, ge=24, le=96)
    velocity: float = Field(default=0.8, ge=0.02, le=1.0)


class Patch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    version: int = 1
    sample_rate: int = Field(default=48_000, ge=22_050, le=96_000)
    layers: list[Layer] = Field(default_factory=list, max_length=8)
    master_chain: list[Stage] = Field(default_factory=list, max_length=8)
    master_gain_db: float = Field(default=0.0, ge=-36.0, le=12.0)


class Sequence(BaseModel):
    model_config = ConfigDict(extra="ignore")

    duration: float = Field(default=4.0, ge=0.5, le=12.0)
    events: list[NoteEvent] = Field(default_factory=list, max_length=64)

    @model_validator(mode="after")
    def _clamp_events(self) -> "Sequence":
        # Notes may intentionally extend into the tail.  We only prevent
        # absurd starts beyond the editable timeline.
        for event in self.events:
            event.start = min(event.start, self.duration)
        return self


class RenderOptions(BaseModel):
    model_config = ConfigDict(extra="ignore")

    window_start: float = Field(default=0.0, ge=0.0, le=20.0)
    window_seconds: float = Field(default=0.12, ge=0.02, le=1.0)
    max_points: int = Field(default=3000, ge=200, le=6000)
    spectrogram: bool = True
    spectrogram_time_bins: int = Field(default=192, ge=64, le=320)
    spectrogram_freq_bins: int = Field(default=96, ge=32, le=192)
    spectrum_points: int = Field(default=256, ge=64, le=512)


class RenderRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    patch: Patch
    sequence: Sequence
    options: RenderOptions = Field(default_factory=RenderOptions)


class Preset(BaseModel):
    id: str
    name: str
    description: str
    patch: Patch
    sequence: Sequence
