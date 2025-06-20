"""Common types for the license factory."""
from ast import match_case
from enum import StrEnum
from typing import Literal, TypedDict

type PermissionsTags = Literal["distribution", "commercial-use", "modifications", "patent-use", "private-use", "revokable"]

type ConditionsTags = Literal["disclose-source", "document-changes", "include-copyright", "same-license", "same-license--file", "same-license--library",]

type LimitationsTags = Literal["liability", "patent-use", "trademark-use", "warranty"]

class PlainLicenseTags(StrEnum):
    """
    Enum representing different tags for Plain licenses.
    """
    CAN_SHARE = "can share"
    CAN_SELL = "can sell"
    CAN_CHANGE = "can change"
    CAN_MIX = "can mix"
    CAN_REVOKE = "can revoke"
    RELICENSE = "relicense"
    SHARE_ALIKE_STRICT = "share alike (strict)"
    SHARE_ALIKE_RELAXED = "share alike (relaxed)"
    GIVE_CREDIT = "give credit"
    DESCRIBE_CHANGES = "describe changes"
    SHARE_SOURCE = "share source"

    @property
    def icon_var_name(self) -> str:
        """
        Returns the variable name for the tag, which is the same as the tag value.
        """
        return self.value.replace(" ", "").replace("(", "").replace(")", "").replace("-", "")

    @property
    def var_name(self) -> str:
        """
        Returns the variable name for the tag, which is the same as the tag value.
        """
        return self.value.replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_")

    @property
    def label_name(self) -> str:
        """
        Returns the label variable name for the tag, which is the same as the tag value.
        """
        return self.value.replace(" ", "-").replace("(", "").replace(")", "").replace("-", "-")


class LicenseCategory(StrEnum):
    """Enum representing different categories of Plain licenses."""
    PERMISSIVE = "permissive"
    PUBLIC_DOMAIN = "public domain"
    COPYLEFT = "copyleft"
    SOURCE_AVAILABLE = "source available"
    PROPRIETARY = "proprietary"

class ReferenceLink(TypedDict):
    """
    TypedDict representing a reference link in a license.
    """
    name: str
    url: str
    title: str | None

class LicenseFrontMatter(TypedDict):
    """
    TypedDict representing the front matter of a license.
    """
    template: Literal["license.html"]
    plain_name: str
    spdx_id: str | None
    original_name: str | None
    also_known_as: list[str] | None
    original_url: str | None
    original_organization: str | None
    original_version: str | None
    plain_version: str | None
    also_known_as: list[str] | None
    category: LicenseCategory
    license_description: str
    notes: str | None
    permissions: list[PermissionsTags] | None
    conditions: list[ConditionsTags] | None
    limitations: list[LimitationsTags] | None
    extra_how: str | None
    reader_license_text: str
    original_license_text: str | None
    link_in_original: bool
    reference_links: list[ReferenceLink] | None
    outro: str | None
