
@dataclass
class RenderContext:
    """Context object passed to elements during rendering"""

    format_type: FormatType  # READER, GITHUB, PLAINTEXT, etc.
    elements: dict[str, DocumentElement]  # All document elements by ID
    relationships: RelationshipTracker  # Cross-reference resolver

    # Format-specific settings
    footnote_counter: int = 1
    collected_footnotes: list[FootnoteElement] = field(default_factory=list)

    # Rendering state
    current_depth: int = 0  # For nested elements
    parent_context: str | None = None  # e.g., "admonition", "codeblock"

    # Format-specific helpers
    def should_inline_footnotes(self) -> bool:
        return self.format_type == FormatType.READER

    def get_footnote_style(self) -> str:
        return (
            "markdown"
            if self.format_type in [FormatType.GITHUB, FormatType.READER]
            else "plaintext"
        )

    def register_footnote(self, footnote: FootnoteElement) -> int:
        """Register footnote for end-of-document collection"""
        self.collected_footnotes.append(footnote)
        current = self.footnote_counter
        self.footnote_counter += 1
        return current
