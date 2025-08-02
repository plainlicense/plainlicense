"""
This is where we take everything apart.
"""
from dataclasses import dataclass
from typing import Any, NamedTuple
from overrides.hooks.factory._constants import (
    LINEBREAK,
    PARAGRAPH_BREAK,
    PATTERNS,
    SPACE,
    Patterns,
)

# Before we actually take anything apart, we need to basically make a map of where everything is so we can put it back together later.

class Part(NamedTuple):
    """
    A generic part of a license of any type.
    """
    parts_index: int
    kind: str
    kind_order: int
    inline: bool
    content: Any
    start_index: int
    end_index: int
    parent: Any
    children: list[Any]

@dataclass(order=True)
class LicenseParts:
    """
    A simple store for license parts with an auto-incrementing index.
    """
    _index = 0
    parts: dict[Part, Any]
    def __init__(self):
        self.index = LicenseParts._index
        LicenseParts._index += 1
        self.parts = {}

    def add_part(self, part: Part, content):
        """
        Add a part to the license.
        """
        self.parts[part] = content

    def get_part(self, part: Part):
        """
        Get a part from the license.
        """
        return self.parts.get(part)

    def remove_part(self, part: Part):
        """
        Remove a part from the license.
        """
        if part in self.parts:
            del self.parts[part]

    def __getitem__(self, item):
        """
        Get a part by index.
        """
        return self.parts.get(item)
