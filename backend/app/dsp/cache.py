"""Small in-memory render cache shared by analysis and audio endpoints."""

from __future__ import annotations

import hashlib
import threading
from collections import OrderedDict

from ..schemas import Patch, Sequence
from .render import RenderResult


class RenderCache:
    def __init__(self, max_items: int = 12) -> None:
        self._items: OrderedDict[str, RenderResult] = OrderedDict()
        self._lock = threading.Lock()
        self._max_items = max_items

    @staticmethod
    def key_for(patch: Patch, sequence: Sequence) -> str:
        payload = patch.model_dump_json() + "|" + sequence.model_dump_json()
        return hashlib.sha1(payload.encode("utf-8")).hexdigest()

    def get(self, key: str) -> RenderResult | None:
        with self._lock:
            result = self._items.get(key)
            if result is not None:
                self._items.move_to_end(key)
            return result

    def put(self, key: str, result: RenderResult) -> None:
        with self._lock:
            self._items[key] = result
            self._items.move_to_end(key)
            while len(self._items) > self._max_items:
                self._items.popitem(last=False)


render_cache = RenderCache()
