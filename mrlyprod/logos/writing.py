import json
import os
from helpers import frames_to_gif, frames_to_video, play_animation
from letters import letter_names

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

strokes = {
    "m": [
        [(4,0), (3,0), (2,0), (1,0), (0,0)],
        [(0,1), (0,2), (0,3), (0,4)],
        [(1,4), (2,4), (3,4), (4,4)],
        [(1,2), (2,2), (3,2), (4,2)],
    ],
    "r": [
        [(4,0), (3,0), (2,0), (1,0), (0,0)],
        [(0,1), (0,2), (0,3), (0,4)],
    ],
    "l": [
        [(0,0), (1,0), (2,0), (3,0), (4,0)],
        [(4,1), (4,2), (4,3), (4,4)],
    ],
    "y": [
        [(0,0), (1,0), (2,0)],
        [(2,1), (2,2), (2,3)],
        [(0,4), (1,4), (2,4)],
        [(3,4), (4,4), (4,3), (4,2), (4,1), (4,0)],
    ],
    "p": [
        [(4,0), (3,0), (2,0), (1,0), (0,0)],
        [(0,1), (0,2), (0,3), (0,4)],
        [(1,4)],
        [(2,4), (2,3), (2,2), (2,1)],
    ],
    "o": [
        [(4,0), (3,0), (2,0), (1,0), (0,0)],
        [(0,1), (0,2), (0,3), (0,4)],
        [(1,4), (2,4), (3,4), (4,4)],
        [(4,3), (4,2), (4,1)],
    ],
    "d": [
        [(2,3), (2,2), (2,1), (2,0)],
        [(3,0), (4,0)],
        [(4,1), (4,2), (4,3), (4,4)],
        [(3,4), (2,4), (1,4), (0,4)],
    ]
}

def create_canvas():
    canvas = []
    for i in range(7):
        canvas.append(list("0" * 49))
    return canvas

def get_letter_offset(letter_idx):
    return 1 + letter_idx * 6

def create_stroke_sequence():
    sequence = []
    for letter_idx, letter_name in enumerate(letter_names):
        letter_strokes = strokes[letter_name]
        x_offset = get_letter_offset(letter_idx)
        for stroke in letter_strokes:
            for row, col in stroke:
                canvas_x = x_offset + col
                canvas_y = 1 + row
                sequence.append((canvas_y, canvas_x))
    return sequence

def create_frames():
    os.makedirs(f"{ROOT_DIR}/data/json/writing", exist_ok=True)
    sequence = create_stroke_sequence()
    canvas = create_canvas()
    for frame_idx in range(len(sequence) + 1):
        for i in range(frame_idx):
            y, x = sequence[i]
            canvas[y][x] = "1"
        frame_data = ["".join(row) for row in canvas]
        with open(f"{ROOT_DIR}/data/json/writing/frame_{frame_idx}.json", "w") as f:
            json.dump(frame_data, f, indent=2)

def main():
    create_frames()
    frames_to_video(f"{ROOT_DIR}/data/json/writing", f"{ROOT_DIR}/data/animation/writing.mp4", 25)
    frames_to_gif(f"{ROOT_DIR}/data/json/writing", f"{ROOT_DIR}/data/animation/writing.gif", 25)
    play_animation(f"{ROOT_DIR}/data/json/writing", 25, "🟨", "🟪")

if __name__ == "__main__":
    main()
