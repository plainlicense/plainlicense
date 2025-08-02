"""Common types for the license factory."""

from enum import StrEnum
from typing import Literal, TypedDict


class BaseStrEnum(StrEnum):
    """
    Base class for string enums to ensure consistent string representation.
    """

    def __str__(self) -> str:
        return self.value

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}.{self.name}"

#===========================================================================
# *              Enums for Choosealicense.com Tags
#===========================================================================

"""
Somewhere along the line, I decided to use choosealicense.com's tag system
as a baseline. I programmatically pull in their license data and use it for defining tags in our license metadata.

It's *a system*, but it's just a way of trying to standardize the tags we use for licenses. **But** it's not particularly plain, and it doesn't cover all the tags we need. The `PermissionsTags`, `ConditionsTags`, and `LimitationsTags` enums are based on the tags used by choosealicense.com. The enums that follow `Limitations` are how we *actually* tag licenses, mapping their tags to our labels.

"""

class PermissionsTags(BaseStrEnum):
    """
    Enum representing different tags for Permissions in licenses.
    """

    DISTRIBUTION = "distribution"
    COMMERCIAL_USE = "commercial-use"
    MODIFICATIONS = "modifications"
    PATENT_USE = "patent-use"
    PRIVATE_USE = "private-use"
    #! Not used by choosealicense.com. Added to cover the concept of 'revokable' licenses, particularly when we dive into proprietary licenses.
    REVOKABLE = "revokable"
    RELICENSE = "relicense"  # Not used by choosealicense.com, but added to cover the concept of relicenseable licenses.


class ConditionsTags(BaseStrEnum):
    """
    Enum representing different tags for Conditions in licenses.
    """

    DISCLOSE_SOURCE = "disclose-source"
    DOCUMENT_CHANGES = "document-changes"
    INCLUDE_COPYRIGHT = "include-copyright"
    SAME_LICENSE = "same-license"  # Strictest, GPL 3 and AGPL 3
    SAME_LICENSE_FILE = "same-license--(file)"  # MPL
    SAME_LICENSE_LIBRARY = "same-license--(library)"  # LGPL


class LimitationsTags(BaseStrEnum):
    """
    Enum representing different tags for Limitations in licenses.
    """

    LIABILITY = "liability"
    PATENT_USE = "patent-use"
    TRADEMARK_USE = "trademark-use"
    WARRANTY = "warranty"

class PlainLicenseTags(BaseStrEnum):
    """
    Enum representing different tags for Plain licenses.

    Focuses on practical implications that matter to users - what they can do with the licensed work.

    Several controversial design decisions:

    ## No equivalent for `LimitationsTags`
    All licenses minimize liability and warranty. While some highlight trademark/patent restrictions, average users don't care and corporate lawyers will see the limitations regardless.

    ## No equivalent for `PATENT_USE` and `PRIVATE_USE` permissions
    Most licenses allow private use, and patent concepts don't help users understand what they can actually do. People who care about patents make decisions based on legal advice, not tags.

    ## Consolidated `SHARE_ALIKE` into two tags instead of three
    Copyleft licenses are brilliant but absurdly complex. Rather than three confusing variations (GPL/AGPL "stack", MPL "file", LGPL "library"), we use two: strict copyleft and relaxed copyleft.

    *required rant* After a year of license research, I still don't fully understand where the lines between these licenses lie. Nobody does. This ambiguity is the #1 reason people avoid copyleft licenses - not the "viral" nature, but their inaccessible complexity. Companies avoid them because unclear boundaries create litigation risk.
    """

    SHARE_IT = "share it"
    SELL_IT = "sell it"
    CHANGE_IT = "change it"
    MIX_IT = "mix it"
    REVOKE_IT = "revoke it"
    RELICENSE_IT = "relicense it"
    SHARE_ALIKE_STRICT = "share alike (strict)"
    SHARE_ALIKE_RELAXED = "share alike (relaxed)"
    GIVE_CREDIT = "give credit"
    DESCRIBE_CHANGES = "describe changes"
    SHARE_YOUR_WORK = "share your work"

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

    @classmethod
    def from_cal_tag(cls, tag: str) -> "PlainLicenseTags":
        """
        Converts a choosealicense.com tag to a PlainLicenseTags enum. All choosealicense.com tags *should* map to a PlainLicenseTags tag, but not at all PlainLicenseTags tags map to a choosealicense.com tag. Specifically: `RELICENSE_IT`, `MIX_IT`, and `REVOKE_IT` have no equivalent. *I* added `Revokable` to the data we capture with the choosealicense tags.
        TODO: Add relicense and mix tags to the initial data import with the choosealicense.com tags. Mix doesn't need to be added because it will align with the `MODIFICATIONS` tag (it really exists for clarity in the UI). Relicense does.
        """
        match tag:
            case PermissionsTags.DISTRIBUTION:
                return cls.SHARE_IT
            case PermissionsTags.COMMERCIAL_USE:
                return cls.SELL_IT
            case PermissionsTags.MODIFICATIONS:
                return cls.CHANGE_IT
            case PermissionsTags.REVOKABLE:
                return cls.REVOKE_IT
            case ConditionsTags.DISCLOSE_SOURCE:
                return cls.SHARE_YOUR_WORK
            case ConditionsTags.DOCUMENT_CHANGES:
                return cls.DESCRIBE_CHANGES
            case ConditionsTags.INCLUDE_COPYRIGHT:
                return cls.GIVE_CREDIT
            case ConditionsTags.SAME_LICENSE:
                return cls.SHARE_ALIKE_STRICT
            case ConditionsTags.SAME_LICENSE_FILE | ConditionsTags.SAME_LICENSE_LIBRARY:
                return cls.SHARE_ALIKE_RELAXED
            case _:
                raise ValueError(f"Unknown choosealicense.com tag: {tag}")



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
