import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_requests=100, window_seconds=60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    def allow(self, user_id):
        now = time.time()
        window = self.requests[user_id]
        window = [t for t in window if now - t < self.window_seconds]
        if len(window) < self.max_requests:
            window.append(now)
            self.requests[user_id] = window
            return True
        return False

# TODO: Add anomaly detection for abuse patterns 