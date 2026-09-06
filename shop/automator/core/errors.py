# CORE

class NoTaskError(Exception):
    pass

class Retry(Exception):
    pass

class TaskFailed(Exception):
    pass

class TaskAborted(Exception):
    pass

# PRINTFUL

class PrintfulError(Exception):
    pass

# SHOPIFY

class ShopifyError(Exception):
    pass
