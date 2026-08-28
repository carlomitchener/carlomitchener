from mrlypy.core.state import choice, sample
from typing import List
from .config import Config
from .enums import ChordType, Movement, Scale
from .models import Music, Voice

# COMPOSER

class Composer:

    def __init__(self, config: Config):
        self.config = config

    # COMPOSE

    def compose(
        self,
        scale: Scale,
        progression: str,
        voices: list[Voice],
        bar_length: int = 4,
        count: int = 64,
        repeat: bool = False
    ) -> Music:
        track = self._track(count, progression, voices, bar_length, repeat)
        return Music(
            scale=scale,
            progression=progression,
            voices=voices,
            track=track,
        )

    # CHORDS

    def _create_chord(self, note_pool: list[int], chord: str, chord_type: ChordType) -> list[int]:
        chord_map = {"C": 0, "D": 1, "E": 2, "F": 3, "G": 4, "A": 5, "B": 6}
        degree_idx = chord_map[chord]
        chord_intervals = self.config.chord_types[chord_type]
        root_note_idx = degree_idx % len(note_pool)
        chord_notes = []
        for interval in chord_intervals:
            note_idx = (root_note_idx + interval) % len(note_pool)
            note = note_pool[note_idx]
            if note not in chord_notes:
                chord_notes.append(note)
        return chord_notes

    def _chord_pool(self, voice: Voice, chord: str) -> list[int]:
        if voice.chord_type is None:
            return voice.note_pool
        return self._create_chord(voice.note_pool, chord, voice.chord_type)

    # BARS

    def _bar(self, count: int, movements: list[Movement], note_pool: list[int],
             num_notes: list[int], start: list[int] = None) -> List[List[int]]:
        bar = []
        if start is not None:
            previous = start
        else:
            previous = sample(note_pool, choice(num_notes))
        bar.append(previous)
        for _ in range(count - 1):
            movement = choice(movements) if len(movements) > 1 else movements[0]
            match movement:
                case Movement.REPEAT:
                    notes = previous
                case Movement.RANDOM:
                    notes = sample(note_pool, choice(num_notes))
                case Movement.UP:
                    notes = [note_pool[(note_pool.index(n) + 1) % len(note_pool)] for n in previous]
                case Movement.DOWN:
                    notes = [note_pool[(note_pool.index(n) - 1) % len(note_pool)] for n in previous]
                case Movement.PAUSE:
                    notes = []
            previous = notes
            bar.append(notes)
        return bar

    def _voice_bar(self, voice: Voice, chord: str, bar_length: int) -> List[List[int]]:
        chord_pool = self._chord_pool(voice, chord)
        return self._bar(bar_length, voice.movements, chord_pool, voice.num_notes)

    # TRACKS

    def _concatenate(self, voices: list[Voice], tracks: dict[int, List[List[int]]]) -> List[List[int]]:
        track = []
        num_beats = 0
        for i in range(len(voices)):
            if tracks[i]:
                num_beats = len(tracks[i])
                break
        for beat in range(num_beats):
            chord = []
            for i in range(len(voices)):
                if tracks[i]:
                    chord.extend(tracks[i][beat])
            track.append(chord)
        return track

    def _track(self, count: int, progression: str, voices: list[Voice],
               bar_length: int, repeat: bool) -> List[List[int]]:
        tracks = {i: [] for i in range(len(voices))}
        bar_library = {}
        for chord in progression:
            for i, voice in enumerate(voices):
                track = tracks[i]
                if repeat:
                    key = (i, chord)
                    if key not in bar_library:
                        bar = self._voice_bar(voice, chord, bar_length)
                        bar_library[key] = bar
                    else:
                        bar = bar_library[key]
                else:
                    bar = self._voice_bar(voice, chord, bar_length)
                track.extend(bar)
        base_track = self._concatenate(voices, tracks)
        num_repeats = (count + len(base_track) - 1) // len(base_track)
        return (base_track * num_repeats)[:count]
