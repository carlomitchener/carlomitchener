from enum import Enum

class Step(Enum):
    FAILED = "failed"
    CREATE = "create"
    GENERATE = "generate"
    MOCKUP = "mockup"
    PROCESS = "process"
    FILES = "files"
    STATUS = "status"
    PRODUCT = "product"
    PING = "ping"
    SYNC = "sync"
    PUBLISH = "publish"
    COMPLETE = "complete"
    ARCHIVE = "archive"
