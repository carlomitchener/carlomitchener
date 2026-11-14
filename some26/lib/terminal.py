import sys

def pick_number(number):
    if not number.isdigit() or int(number) < 1 or int(number) % 2 == 0:
        sys.exit(f"'{number}' must be odd and positive")
    return int(number)

def pick_level(level):
    if not level.isdigit() or int(level) < 1:
        sys.exit(f"'{level}' must be an integer >= 1")
    return int(level)

def menu(usage, commands, notes, footer):
    width = max(len(name) for name in commands)
    print(usage)
    print()
    for name, (_, blurb) in commands.items():
        print(f"  {name:<{width}}  {blurb}")
    print()
    for note in notes:
        print(f"  {note}")
    print()
    print(footer)
