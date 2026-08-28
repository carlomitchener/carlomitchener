import numpy as np
import os
import mrlypy.music
from mrlypy.core.state import choice, bool
from mrlypy.music.enums import ChordType, Movement, Scale
from mrlypy.music.models import Voice
from config import FPS, FREEZE_DURATION, HEATMAP_FPS, INTER_SEGMENT_FREEZE, OUTPUT_DIR
from enums import Way
from models import MusicParams

ROOT_NOTE = 43

MUSIC_CONFIG = mrlypy.music.Config(
    sample_rate=44100,
    fade_duration=1/64,
    scales={Scale.MAJOR: [0, 2, 4, 5, 7, 9, 11]},
    chord_types={ChordType.TRIAD: [0, 2, 4], ChordType.SEVENTH: [0, 2, 4, 6]},
)

# VOICES

def _build_voices(scale: Scale):
    intervals = MUSIC_CONFIG.scales[scale]
    lows = [ROOT_NOTE + i for i in intervals]
    mids = [ROOT_NOTE + i + 12 for i in intervals]
    highs = [ROOT_NOTE + i + 24 for i in intervals]
    bass = Voice(
        note_pool=lows if bool() else lows + mids,
        movements=[Movement.REPEAT, Movement.UP, Movement.DOWN],
        chord_type=choice([ChordType.TRIAD, ChordType.SEVENTH]),
    )
    rhythm = Voice(
        note_pool=mids if bool() else mids + highs,
        movements=[Movement.REPEAT, Movement.RANDOM],
        chord_type=choice([ChordType.TRIAD, ChordType.SEVENTH]),
        num_notes=[2, 3],
    )
    voices = [bass, rhythm]
    if bool():
        lead = Voice(
            note_pool=highs,
            movements=[Movement.REPEAT, Movement.RANDOM, Movement.UP, Movement.DOWN, Movement.PAUSE],
        )
        voices.append(lead)
    return voices

BLUES_PROGRESSION = "CCCCFFCCGFCG"

def _build_progression(way: Way) -> str:
    if way == Way.CONWAY:
        return BLUES_PROGRESSION
    rhythms = [[8], [4, 4], [2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1]]
    rhythm = choice(rhythms)
    options = ["C", "D", "E", "F", "G", "A", "B"]
    chords = [choice(options) for _ in range(len(rhythm))]
    progression = []
    for i, duration in enumerate(rhythm):
        progression.extend([chords[i]] * duration)
    return "".join(progression)

# PARAMS

def compose_music_params(way: Way) -> MusicParams:
    scale = choice(list(Scale))
    progression = _build_progression(way)
    voices = _build_voices(scale)
    wave_type = choice([mrlypy.music.WaveType.SINE, mrlypy.music.WaveType.TRIANGLE])
    num_harmonics = choice([1, 3])
    return MusicParams(
        scale=scale,
        progression=progression,
        voices=voices,
        wave_type=wave_type,
        num_harmonics=num_harmonics,
    )

# COMPOSE

def _compose(params: MusicParams, count: int):
    composer = mrlypy.music.Composer(MUSIC_CONFIG)
    music = composer.compose(
        scale=params.scale,
        progression=params.progression,
        voices=params.voices,
        count=count,
    )
    renderer = mrlypy.music.Renderer(MUSIC_CONFIG, wave_type=params.wave_type, num_harmonics=params.num_harmonics)
    return music, renderer, MUSIC_CONFIG

# ASSEMBLY

def assemble_segment_track(track, beat_duration, open_freeze, close_freeze):
    timed = []
    if open_freeze > 0:
        timed.append((track[0], open_freeze))
    for chord in track:
        timed.append((chord, beat_duration))
    if close_freeze > 0:
        timed.append((track[-1], close_freeze))
    return timed

# HEATMAP TRACK

def create_heatmap_track(music, target_len, music_config):
    if target_len <= 0:
        return []
    intervals = music_config.scales[music.scale]
    note_pool = []
    for offset in [0, 12, 24]:
        note_pool.extend([ROOT_NOTE + i + offset for i in intervals])
    step = -1 if choice(["up", "down"]) == "up" else 1
    start = [note_pool[(note_pool.index(n) + step) % len(note_pool)] for n in music.track[0]]
    track = [start]
    current = start
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

def compose_saga_audio(saga):
    output_dir = f"{OUTPUT_DIR}/{saga.key}"
    os.makedirs(output_dir, exist_ok=True)
    heatmap_lengths = _halve_segment_lengths([s.count for s in saga.segments])
    frames_parts = []
    heatmap_parts = []
    last_renderer = None
    n = len(saga.segments)
    for i, seg in enumerate(saga.segments):
        music, renderer, music_config = _compose(seg.music, seg.count)
        open_freeze = FREEZE_DURATION if i == 0 else 0.0
        close_freeze = FREEZE_DURATION if i == n - 1 else INTER_SEGMENT_FREEZE
        frames_timed = assemble_segment_track(music.track, 1.0 / FPS, open_freeze, close_freeze)
        frames_parts.append(renderer.render(frames_timed))
        heatmap_track = create_heatmap_track(music, heatmap_lengths[i], music_config)
        heatmap_timed = assemble_segment_track(heatmap_track, 2.0 / HEATMAP_FPS, open_freeze, close_freeze)
        heatmap_parts.append(renderer.render(heatmap_timed))
        last_renderer = renderer
    frames_combined = np.concatenate(frames_parts)
    heatmap_combined = np.concatenate(heatmap_parts)
    full = np.concatenate([frames_combined, heatmap_combined])
    last_renderer.save(f"{output_dir}/{saga.key}.wav", full)
    print(f"Composed saga audio for {saga.key}")
