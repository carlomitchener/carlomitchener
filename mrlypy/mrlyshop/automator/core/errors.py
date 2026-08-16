# CORE

class NoTaskError(Exception):
    """Raised when no task is available for a given step in the pipeline."""
    pass

class Retry(Exception):
    """Raised when the task needs to wait for an external process or retry later."""
    pass

class TaskFailed(Exception):
    """Raised when a task is in FAILED state and requires intervention."""
    pass

class TaskAborted(Exception):
    """Raised when a task should be discarded and the product returned to the pool."""
    pass

# PRINTFUL

class PrintfulError(Exception):
    """Raised when a Printful error occurs."""
    pass

# SHOPIFY

class ShopifyError(Exception):
    """Raised when a Shopify error occurs."""
    pass
