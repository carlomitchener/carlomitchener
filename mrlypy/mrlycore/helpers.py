import logging
import random
import sys

# LOGGING

_logging_configured = False

def create_logger(name: str) -> logging.Logger:
    global _logging_configured
    if not _logging_configured:
        logging.basicConfig(level=logging.INFO, format="(%(name)s) %(message)s")
        _logging_configured = True
    return logging.getLogger(name)

# APP

class App:
    def __init__(self, name: str):
        self.name = name
        self.commands = {}
        self.playground_fn = None

    def add(self, name: str, fn, description: str, nargs: int = 0):
        self.commands[name] = (fn, description, nargs)

    def test(self, fn):
        self.playground_fn = fn

    def help(self):
        print(self.name)
        for name, (_, desc, _) in self.commands.items():
            print(f"{name:<16}{desc}")

    def run(self):
        create_logger(self.name)
        args = sys.argv[1:]
        if not args:
            if self.playground_fn:
                self.playground_fn()
            else:
                self.help()
            return
        command = args[0]
        if command in self.commands:
            fn, _, nargs = self.commands[command]
            if nargs and args[1:]:
                fn(*[int(a) if a.isdigit() else a for a in args[1:nargs+1]])
            else:
                fn()
        else:
            self.help()

# UTILS

def hex_key(k: int = 8) -> str:
    return "".join(random.choices("0123456789abcdef", k=k))

def random_seed() -> int:
    return random.randint(0, 2**32 - 1)
