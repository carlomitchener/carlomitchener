import numpy as np
import os
import wave
from typing import Callable, List, Tuple
from .config import Config
from .enums import WaveType

# RENDERER

class Renderer:

    def __init__(self, config: Config, wave_type: WaveType = WaveType.SINE,
                 num_harmonics: int = 1, harmonic_wave: WaveType = WaveType.TRIANGLE):
        self.config = config
        self.wave_type = wave_type
        self.num_harmonics = num_harmonics
        self.harmonic_wave = harmonic_wave

    # RENDER

    def render(self, track: List[Tuple[List[int], float]],
               voice_fn: Callable = None) -> np.ndarray:
        amplitude = np.iinfo(np.int16).max
        audio_segments = []
        for chord, duration in track:
            frame_duration_samples = int(duration * self.config.sample_rate)
            frame_audio = np.zeros(frame_duration_samples, dtype=np.float32)
            for midi_note in chord:
                if midi_note is not None:
                    if voice_fn is not None:
                        wt, nh, hw = voice_fn()
                    else:
                        wt = self.wave_type
                        nh = self.num_harmonics
                        hw = self.harmonic_wave
                    note_freq = _midi_to_freq(midi_note)
                    note_wave = _generate_wave(
                        config=self.config,
                        wave_type=wt,
                        frequency=note_freq,
                        duration=duration,
                        num_harmonics=nh,
                        harmonic_wave=hw,
                    )
                    frame_audio += note_wave
            frame_audio = _fade(frame_audio, self.config.fade_duration, self.config.sample_rate)
            audio_segments.append(frame_audio)
        audio_data = np.concatenate(audio_segments)
        peak_amplitude = np.max(np.abs(audio_data))
        if peak_amplitude > 0:
            audio_data /= peak_amplitude
        return (audio_data * amplitude).astype(np.int16)

    # SAVE

    def save(self, filepath: str, audio: np.ndarray):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with wave.open(filepath, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.config.sample_rate)
            wf.writeframes(audio.tobytes())

# MIDI

def _midi_to_freq(midi_note: int) -> float:
    return 440 * 2**((midi_note - 69) / 12)

# WAVES

def _wave(t_array: np.ndarray, freq: float, wave_type: WaveType) -> np.ndarray:
    t = t_array * freq
    wave_factory = {
        WaveType.SINE: np.sin(2. * np.pi * t),
        WaveType.TRIANGLE: 2 * np.abs(2 * (t - np.floor(t + 0.5))) - 1,
        WaveType.SQUARE: np.sign(np.sin(2. * np.pi * t)),
        WaveType.SAWTOOTH: 2 * (t - np.floor(0.5 + t)),
    }
    return wave_factory[wave_type]

def _generate_wave(config: Config, wave_type: WaveType, frequency: float, duration: float, num_harmonics: int = None, harmonic_wave: WaveType = None) -> np.ndarray:
    time_array = np.linspace(0.0, duration, int(config.sample_rate * duration), endpoint=False)
    output_wave = np.zeros_like(time_array)
    harmonic_factory = {
        WaveType.SQUARE: {i: 1.0 / i for i in range(1, num_harmonics + 1, 2)},
        WaveType.TRIANGLE: {i: 1.0 / (i * i) for i in range(1, num_harmonics + 1, 2)},
        WaveType.SAWTOOTH: {i: 1.0 / i for i in range(1, num_harmonics + 1)},
    }
    for harmonic, amplitude_factor in harmonic_factory[harmonic_wave].items():
        output_wave += amplitude_factor * _wave(time_array, frequency * harmonic, wave_type)
    if np.max(np.abs(output_wave)) > 0:
        output_wave /= np.max(np.abs(output_wave))
    return output_wave

def _fade(audio_segment: np.ndarray, fade_duration: float, sample_rate: int) -> np.ndarray:
    fade_length = int(sample_rate * fade_duration)
    actual_fade_length = min(fade_length, len(audio_segment) // 2)
    if actual_fade_length > 0:
        fade_in = np.linspace(0.0, 1.0, actual_fade_length)
        fade_out = np.linspace(1.0, 0.0, actual_fade_length)
        audio_segment[:actual_fade_length] *= fade_in
        audio_segment[-actual_fade_length:] *= fade_out
    return audio_segment
