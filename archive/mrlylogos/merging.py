import glob
import json
import os
from helpers import frames_to_gif, frames_to_video, play_animation
from letters import letter_names

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_final_writing_frame():
    frame_files = glob.glob(f"{ROOT_DIR}/data/json/writing/frame_*.json")
    frame_files.sort(key=lambda x: int(x.split("_")[1].split(".")[0]))
    final_frame = frame_files[-1]
    with open(final_frame, 'r') as f:
        return json.load(f)

def calculate_center_position():
    canvas_width = 49
    canvas_height = 7
    letter_width = 5
    letter_height = 5
    center_x = (canvas_width - letter_width) // 2
    center_y = (canvas_height - letter_height) // 2
    return center_x, center_y

def get_letter_positions():
    positions = []
    for i in range(len(letter_names)):
        x_offset = 1 + i * 6
        y_offset = 1
        positions.append((x_offset, y_offset))
    return positions

def interpolate_position(start_pos, end_pos, progress):
    start_x, start_y = start_pos
    end_x, end_y = end_pos
    current_x = start_x + (end_x - start_x) * progress
    current_y = start_y + (end_y - start_y) * progress
    return int(current_x), int(current_y)

def extract_letter_from_canvas(canvas, x_offset, y_offset):
    letter_bits = []
    for row in range(5):
        letter_row = ""
        for col in range(5):
            canvas_y = y_offset + row
            canvas_x = x_offset + col
            if canvas_y < len(canvas) and canvas_x < len(canvas[0]):
                letter_row += canvas[canvas_y][canvas_x]
            else:
                letter_row += "0"
        letter_bits.append(letter_row)
    return letter_bits

def place_letter_on_canvas(canvas, letter_bits, x_offset, y_offset):
    for row in range(5):
        for col in range(5):
            canvas_y = y_offset + row
            canvas_x = x_offset + col
            if canvas_y < len(canvas) and canvas_x < len(canvas[0]):
                if letter_bits[row][col] == "1":
                    canvas[canvas_y][canvas_x] = "1"

def get_merge_phase(frame_idx, num_frames):
    phase_length = num_frames // 4
    if frame_idx < phase_length:
        return 1, frame_idx / phase_length
    elif frame_idx < phase_length * 2:
        return 2, (frame_idx - phase_length) / phase_length
    elif frame_idx < phase_length * 3:
        return 3, (frame_idx - phase_length * 2) / phase_length
    else:
        return 4, (frame_idx - phase_length * 3) / (num_frames - phase_length * 3)

def get_letter_position(letter_idx, phase, phase_progress, start_positions, center_x, center_y):
    if phase == 1:
        start_x, start_y = start_positions[letter_idx]
        if letter_idx == 0:
            target_x, target_y = start_positions[1]
            current_x = start_x + int((target_x - start_x) * phase_progress)
            current_y = start_y + int((target_y - start_y) * phase_progress)
            return current_x, current_y
        elif letter_idx == 7:
            target_x, target_y = start_positions[6]
            current_x = start_x + int((target_x - start_x) * phase_progress)
            current_y = start_y + int((target_y - start_y) * phase_progress)
            return current_x, current_y
        else:
            return start_x, start_y
    elif phase == 2:
        if letter_idx in [0, 1]:
            group_pos_x, group_pos_y = start_positions[1]
            target_x, target_y = start_positions[2]
            current_x = group_pos_x + int((target_x - group_pos_x) * phase_progress)
            current_y = group_pos_y + int((target_y - group_pos_y) * phase_progress)
            return current_x, current_y
        elif letter_idx in [6, 7]:
            group_pos_x, group_pos_y = start_positions[6]
            target_x, target_y = start_positions[5]
            current_x = group_pos_x + int((target_x - group_pos_x) * phase_progress)
            current_y = group_pos_y + int((target_y - group_pos_y) * phase_progress)
            return current_x, current_y
        else:
            start_x, start_y = start_positions[letter_idx]
            return start_x, start_y
    elif phase == 3:
        if letter_idx in [0, 1, 2]:
            group_pos_x, group_pos_y = start_positions[2]
            target_x, target_y = start_positions[3]
            current_x = group_pos_x + int((target_x - group_pos_x) * phase_progress)
            current_y = group_pos_y + int((target_y - group_pos_y) * phase_progress)
            return current_x, current_y
        elif letter_idx in [5, 6, 7]:
            group_pos_x, group_pos_y = start_positions[5]
            target_x, target_y = start_positions[4]
            current_x = group_pos_x + int((target_x - group_pos_x) * phase_progress)
            current_y = group_pos_y + int((target_y - group_pos_y) * phase_progress)
            return current_x, current_y
        else:
            start_x, start_y = start_positions[letter_idx]
            return start_x, start_y
    else:
        if letter_idx in [0, 1, 2, 3]:
            group_start_x, group_start_y = start_positions[3]
        else:
            group_start_x, group_start_y = start_positions[4]
        current_x = group_start_x + int((center_x - group_start_x) * phase_progress)
        current_y = group_start_y + int((center_y - group_start_y) * phase_progress)
        return current_x, current_y

def create_merge_frame(frame_idx, num_frames):
    canvas_width = 49
    canvas_height = 7
    canvas = [["0" for _ in range(canvas_width)] for _ in range(canvas_height)]
    start_positions = get_letter_positions()
    center_x, center_y = calculate_center_position()
    final_frame = get_final_writing_frame()
    phase, phase_progress = get_merge_phase(frame_idx, num_frames)
    for letter_idx, letter_name in enumerate(letter_names):
        current_x, current_y = get_letter_position(letter_idx, phase, phase_progress, start_positions, center_x, center_y)
        start_x, start_y = start_positions[letter_idx]
        letter_bits = extract_letter_from_canvas(final_frame, start_x, start_y)
        place_letter_on_canvas(canvas, letter_bits, current_x, current_y)
    return ["".join(row) for row in canvas]

def calculate_frames():
    canvas_width = 49
    return canvas_width // 2

def create_frames():
    num_frames = calculate_frames()
    os.makedirs(f"{ROOT_DIR}/data/json/merging", exist_ok=True)
    previous_frame_data = None
    actual_frame_count = 0
    for frame_idx in range(num_frames + 1):
        frame_data = create_merge_frame(frame_idx, num_frames)
        if frame_data != previous_frame_data:
            with open(f"{ROOT_DIR}/data/json/merging/frame_{actual_frame_count}.json", "w") as f:
                json.dump(frame_data, f, indent=2)
            if actual_frame_count % 5 == 0:
                print(f"Generated merge frame {actual_frame_count} (from logical frame {frame_idx})")
            previous_frame_data = frame_data
            actual_frame_count += 1
    print(f"Total unique frames: {actual_frame_count}")

def main():
    create_frames()
    frames_to_video(f"{ROOT_DIR}/data/json/merging", f"{ROOT_DIR}/data/animation/merging.mp4", 25)
    frames_to_gif(f"{ROOT_DIR}/data/json/merging", f"{ROOT_DIR}/data/animation/merging.gif", 25)
    play_animation(f"{ROOT_DIR}/data/json/merging", 25, "🟨", "🟪")

if __name__ == "__main__":
    main()
