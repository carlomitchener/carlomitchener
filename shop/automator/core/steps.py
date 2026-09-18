from enum import Enum

class Step(Enum):
    FAILED = "failed"
    GENERATE = "generate"
    MOCKUP = "mockup"
    PROCESS = "process"
    FILES = "files"
    STATUS = "status"
    PRODUCT = "product"
    PING = "ping"
    SYNC = "sync"
    PREVIEW = "preview"
    PUBLISH = "publish"
    COMPLETE = "complete"
    ARCHIVE = "archive"
