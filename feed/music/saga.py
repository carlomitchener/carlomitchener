import numpy as np
import os
from config import FPS, FREEZE_DURATION, HEATMAP_FPS, INTER_SEGMENT_FREEZE
from enums import Way
from frames import flash_count
from models import MusicParams
from .composer import Composer
from .config import Config
from .enums import ChordType, Movement, Scale, WaveType
from .models import Voice
from .renderer import Renderer

ROOT_NOTE = 43

MUSIC_CONFIG = Config(
    sample_rate=44100,
    fade_duration=1/64,
    scales={Scale.MAJOR: [0, 2, 4, 5, 7, 9, 11]},
    chord_types={ChordType.TRIAD: [0, 2, 4], ChordType.SEVENTH: [0, 2, 4, 6]},
)

# VOICES

def _build_voices(scale: Scale, rng):
    intervals = MUSIC_CONFIG.scales[scale]
    lows = [ROOT_NOTE + i for i in intervals]
    mids = [ROOT_NOTE + i + 12 for i in intervals]
    highs = [ROOT_NOTE + i + 24 for i in intervals]
    bass = Voice(
        note_pool=lows if rng.boolean() else lows + mids,
        movements=[Movement.REPEAT, Movement.UP, Movement.DOWN],
        chord_type=rng.choice([ChordType.TRIAD, ChordType.SEVENTH]),
    )
    rhythm = Voice(
        note_pool=mids if rng.boolean() else mids + highs,
        movements=[Movement.REPEAT, Movement.RANDOM],
        chord_type=rng.choice([ChordType.TRIAD, ChordType.SEVENTH]),
        num_notes=[2, 3],
    )
    voices = [bass, rhythm]
    if rng.boolean():
        lead = Voice(
            note_pool=highs,
            movements=[Movement.REPEAT, Movement.RANDOM, Movement.UP, Movement.DOWN, Movement.PAUSE],
        )
        voices.append(lead)
    return voices

BLUES_PROGRESSION = "CCCCFFCCGFCG"

def _build_progression(way: Way, rng) -> str:
    if way == Way.CONWAY:
        return BLUES_PROGRESSION
    rhythms = [[8], [4, 4], [2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1]]
    rhythm = rng.choice(rhythms)
    options = ["C", "D", "E", "F", "G", "A", "B"]
    chords = [rng.choice(options) for _ in range(len(rhythm))]
    progression = []
    for i, duration in enumerate(rhythm):
        progression.extend([chords[i]] * duration)
    return "".join(progression)

# PARAMS

def compose_music_params(way: Way, rng) -> MusicParams:
    scale = rng.choice(list(Scale))
    progression = _build_progression(way, rng)
    voices = _build_voices(scale, rng)
    wave_type = rng.choice([WaveType.SINE, WaveType.TRIANGLE])
    num_harmonics = rng.choice([1, 3])
    return MusicParams(
        scale=scale,
        progression=progression,
        voices=voices,
        wave_type=wave_type,
        num_harmonics=num_harmonics,
    )

# COMPOSE

def _compose(params: MusicParams, count: int, rng):
    composer = Composer(MUSIC_CONFIG, rng)
    music = composer.compose(
        scale=params.scale,
        progression=params.progression,
        voices=params.voices,
        count=count,
    )
    renderer = Renderer(MUSIC_CONFIG, wave_type=params.wave_type, num_harmonics=params.num_harmonics)
    return music, renderer, MUSIC_CONFIG

# ASSEMBLY

def assemble_segment_track(track, beat_duration, open_freeze, close_freeze, rest):
    edge = track or [rest]
    timed = [(edge[0], open_freeze)] if open_freeze > 0 else []
    timed += [(chord, beat_duration) for chord in track]
    timed += [(edge[-1], close_freeze)] if close_freeze > 0 else []
    return timed

# FLASH

def flash_track(chord, flashes, frame_duration):
    staccato = [(chord, frame_duration / 2), ([], frame_duration / 2)]
    return staccato * (2 * flashes)

# HEATMAP TRACK

def create_heatmap_track(scale, target, target_len, music_config, rng):
    if target_len <= 0:
        return []
    intervals = music_config.scales[scale]
    note_pool = []
    for offset in [0, 12, 24]:
        note_pool.extend([ROOT_NOTE + i + offset for i in intervals])
    step = rng.choice([-1, 1])
    track = [target]
    current = target
    for _ in range(target_len - 1):
        current = [note_pool[(note_pool.index(n) + step) % len(note_pool)] for n in current]
        track.append(current)
    return list(reversed(track))

# SAGA AUDIO

def _halve_segment_lengths(segment_lengths):
    halved = []
    cumulative_frames = 0
    cumulative_halved = 0
    for seg_len in segment_lengths:
        cumulative_frames += seg_len
        expected = cumulative_frames // 2
        halved.append(expected - cumulative_halved)
        cumulative_halved = expected
    return halved

def compose_saga_audio(saga, path: str, rng) -> str:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    heatmap_lengths = _halve_segment_lengths([s.count for s in saga.segments])
    frames_parts = []
    heatmap_parts = []
    n = len(saga.segments)
    composed = [_compose(seg.music, seg.count, rng) for seg in saga.segments]
    first_chord = composed[0][0].track[0]
    for i, (seg, (music, renderer, music_config)) in enumerate(zip(saga.segments, composed)):
        open_freeze = FREEZE_DURATION if i == 0 else 0.0
        close_freeze = FREEZE_DURATION if i == n - 1 else INTER_SEGMENT_FREEZE
        rest = music.track[-1]
        opening = music.track[0]
        flashes = flash_count(seg)
        frames_timed = flash_track(opening, flashes, 1.0 / FPS)
        frames_timed += assemble_segment_track(music.track, 1.0 / FPS, 0.0 if flashes else open_freeze, close_freeze, rest)
        frames_parts.append(renderer.render(frames_timed))
        target = first_chord if i == n - 1 else opening
        heatmap_track = create_heatmap_track(music.scale, target, heatmap_lengths[i], music_config, rng)
        heatmap_timed = assemble_segment_track(heatmap_track, 2.0 / HEATMAP_FPS, open_freeze, close_freeze, rest)
        heatmap_parts.append(renderer.render(heatmap_timed))
    last_renderer = composed[-1][1]
    frames_combined = np.concatenate(frames_parts)
    heatmap_combined = np.concatenate(heatmap_parts)
    full = np.concatenate([frames_combined, heatmap_combined])
    last_renderer.save(path, full)
    print(f"audio {len(full) / 44100:.1f} s -> {path}")
    return path
