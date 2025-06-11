# /// script
# requires_python = ">=3.12"
# dependencies = ["py-readability-metrics", "funcy", "rich", "cyclopts", "ez-yaml", "nltk"]
# ///
"""
A command line tool to calculate the readability of Plain License licenses compared to their original counterparts.
"""
# sourcery skip: avoid-global-variables
import json
import os
import sys

from collections.abc import Sequence
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Any, Literal, NamedTuple, TypedDict, TypeGuard

import nltk
import readability.scorers as scorers

from cyclopts import App, Parameter, Token
from readability import Readability
from rich.console import Console
from rich.json import JSON
from rich.padding import Padding
from rich.table import Table
from vendored.mod_license_factory import (
    LicenseContent,
    LicensePageData,
    parse_license_file,
)


nltk_data_dir = Path(__file__).parent / "nltk_data"
if nltk_data_dir not in nltk.data.path:
    nltk.data.path.append(str(nltk_data_dir))

try:
    nltk.find("punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True, download_dir=nltk_data_dir)


__version__ = "0.1.0"

IS_CI = bool(os.environ.get("GITHUB_RUN_ID")) or os.environ.get("CI") == "true"

PRINT_PARAMS = {} if IS_CI else { "overflow": "fold", "new_line_start": True, "emoji": True }

console= Console(
    color_system=None if IS_CI else "auto",
    markup=IS_CI,
    highlight=IS_CI,
    force_terminal=not IS_CI,
    no_color=IS_CI,
)

app = App(
    name="howplain",
    help="Calculate the readability of licenses",
    console=console,
    version=__version__,
    version_flags=["--version", "-v"],
    help_on_error=True,
)

REPO_ROOT = Path(__file__).parent.parent

type Metric = Literal[
    "ari",
    "coleman_liau",
    "dale_chall",
    "flesch",
    "flesch_kincaid",
    "gunning_fog",
    "linsear_write",
    "smog",
    "spache",
]

type IndividualScoreResponseType = (
                                    type[
                               scorers.ARI | scorers.ColemanLiau | scorers.DaleChall | scorers.Flesch | scorers.FleschKincaid | scorers.GunningFog | scorers.LinsearWrite | scorers.Smog | scorers.Spache
                               ]
)

type AllScoreResponseType = (
                            tuple[
                               type[scorers.ARI], type[scorers.ColemanLiau], type[scorers.DaleChall], type[scorers.Flesch], type[scorers.FleschKincaid], type[scorers.GunningFog], type[scorers.LinsearWrite], type[scorers.Smog], type[scorers.Spache]
                           ]
)

type ScorerResponseType = IndividualScoreResponseType | AllScoreResponseType


class Scores(TypedDict, total=False):
    """TypedDict for readability scores."""

    ari: scorers.ari.Result | None
    coleman_liau: scorers.coleman_liau.Result | None
    dale_chall: scorers.dale_chall.Result | None
    flesch: scorers.flesch.Result | None
    flesch_kincaid: scorers.flesch_kincaid.Result | None
    gunning_fog: scorers.gunning_fog.Result | None
    linsear_write: scorers.linsear_write.Result | None
    smog: scorers.smog.Result | None
    spache: scorers.spache.Result | None

class AboutMetric(NamedTuple):
    """NamedTuple for metric description."""
    name: str
    description: str

def validate_metrics_members(members: dict[str, Any | None]) -> TypeGuard[dict[str, tuple[str]]]:
    """Validate that all members have alternative names."""
    for metric, other_names in members.items():
        if not other_names:
            raise ValueError(f"Metric {metric} does not have alternative names.")
        if not isinstance(other_names, tuple):
            raise TypeError(
                f"Alternative names for {metric} must be a tuple, got {type(other_names)}."
            )
        if not all(isinstance(name, str) for name in other_names):
            raise TypeError(f"All alternative names for {metric} must be strings.")
    return True


class ReadabilityMetric(StrEnum):
    """Enum for readability metrics."""

    ARI = "ari"
    COLEMAN_LIAU = "coleman_liau"
    DALE_CHALL = "dale_chall"
    FLESCH = "flesch"
    FLESCH_KINCAID = "flesch_kincaid"
    GUNNING_FOG = "gunning_fog"
    LINSEAR_WRITE = "linsear_write"
    SMOG = "smog"
    SPACHE = "spache"

    ALL = "all"

    def __str__(self) -> str:
        """Return the string representation of the readability metric."""
        return self.value

    @property
    def other_names(self) -> tuple[str, ...]:
        """Return alternative names for the readability metric."""
        return self._generate_metric_names(self.value)

    @staticmethod
    def _generate_metric_names(k: str) -> tuple[str, ...]:
        """Generate alternative names for a readability metric."""
        names = [k, f"{k}_metrics"] if k == "all" else [k]
        if any("_" in name for name in names):
            new_names = []
            for name in names:
                if "_" in name:
                    new_names.extend(
                        (
                            name.replace("_", " "),
                            name.replace("_", "-"),
                            "".join(
                                n[0]
                                for n in name.split("_")
                                if n and n[0].isalpha()
                            ),
                        )
                    )
            names.extend(new_names)
        elif k in {"smog", "spache"}:
            names.append(k[:1])
        else:
            names.append(k[0])
        if k in {"coleman_liau", "dale_chall", "gunning_fog", "linsear_write"}:
            names.append(k[0])
        return tuple(
            sorted({
                n
                for name in names
                for n in (name.lower(), name.upper(), name.title())
                if name and n
            })
        )

    def _all_scorers_(self) -> AllScoreResponseType:
        """Return all scorer classes for the readability metric."""
        return (
            scorers.ARI,
            scorers.ColemanLiau,
            scorers.DaleChall,
            scorers.Flesch,
            scorers.FleschKincaid,
            scorers.GunningFog,
            scorers.LinsearWrite,
            scorers.Smog,
            scorers.Spache,
        )

    @property
    def scorer(self) -> ScorerResponseType:
        """Return the scorer class for the readability metric."""
        if self == ReadabilityMetric.ALL:
            return self._all_scorers_()
        scorer_map = {
            ReadabilityMetric.ARI: scorers.ARI,
            ReadabilityMetric.COLEMAN_LIAU: scorers.ColemanLiau,
            ReadabilityMetric.DALE_CHALL: scorers.DaleChall,
            ReadabilityMetric.FLESCH: scorers.Flesch,
            ReadabilityMetric.FLESCH_KINCAID: scorers.FleschKincaid,
            ReadabilityMetric.GUNNING_FOG: scorers.GunningFog,
            ReadabilityMetric.LINSEAR_WRITE: scorers.LinsearWrite,
            ReadabilityMetric.SMOG: scorers.Smog,
            ReadabilityMetric.SPACHE: scorers.Spache,
        }
        return scorer_map[self]

    @property
    def test_minimums(self) -> tuple[Literal["num_words", "num_sentences"], int]:
        """Return the minimum required input for the readability metric."""
        if self == ReadabilityMetric.SMOG:
            return "num_sentences", 30
        return "num_words", 100

    @classmethod
    def other_names_map(cls) -> dict[str, tuple[str, ...]]:
        """Return a map of readability metrics to their alternative names."""
        members = {k: v.other_names for k, v in cls.__members__.items()}
        if not validate_metrics_members(members):
            raise ValueError("Invalid readability metrics members.")
        return members

    @classmethod
    def from_name(cls, name: str) -> "ReadabilityMetric":
        """Return the ReadabilityMetric from a string name."""
        for member_name, names in cls.other_names_map().items():
            if name in names:
                return cls.__members__[member_name]
        raise ValueError(
            f"Invalid readability metric: {name}. Must be one of {cls.metrics()} or their alternative names: {[name for metric in cls for name in metric.other_names]}."
        )

    @classmethod
    def metrics(cls) -> list[str]:
        """Return a list of all readability metrics."""
        return sorted(cls.__members__.keys())

    @classmethod
    def readability_map(cls) -> dict["ReadabilityMetric", str]:  # type: ignore
        """Return a map of readability metrics to their function names."""
        return {v: k for k, v in cls._value2member_map_.items() if hasattr(Readability, k)}  # type: ignore

    @property
    def names(self) -> tuple[str, ...] | str:
        """Return the values of the readability metric."""
        return tuple(k for k in ReadabilityMetric.__members__ if k != "ALL") if self == ReadabilityMetric.ALL else self.name

    @property
    def about(self) -> AboutMetric:
        """Return the description of the readability metric."""
        return {
            # These are taken in large part from py-readability-metrics' README file.
            # (C) 2018 Carmine M. DiMascio and licensed under the MIT License.
            ReadabilityMetric.ARI: AboutMetric(name="Automated Readability Index", description="Unlike the other indices, the ARI, along with the Coleman-Liau, relies on a factor of characters per word, instead of the usual syllables per word. ARI is widely used on all types of texts."),
            ReadabilityMetric.COLEMAN_LIAU: AboutMetric(name="Coleman-Liau Index", description="The Coleman-Liau index is a readability test designed to gauge the understandability of English texts. The Coleman-Liau Formula usually gives a lower grade value than any of the Kincaid, ARI and Flesch values when applied to technical documents."),
            ReadabilityMetric.DALE_CHALL: AboutMetric(name="Dale-Chall Readability Score", description="The Dale-Chall Formula is an accurate readability formula for the simple reason that it is based on the use of familiar words, rather than syllable or letter counts. Reading tests show that readers usually find it easier to read, process and recall a passage if they find the words familiar. The Dale-Chall formula is based on a list of 3,000 familiar words, which were selected by a group of 4th grade students. The formula is designed to be used with texts that are written for an audience of 4th grade or higher."),
            ReadabilityMetric.FLESCH: AboutMetric(name="Flesch Reading Ease", description="The U.S. Department of Defense uses the Reading Ease test as the standard test of readability for its documents and forms. Florida requires that life insurance policies have a Flesch Reading Ease score of 45 or greater."),
            ReadabilityMetric.FLESCH_KINCAID: AboutMetric(name="Flesch-Kincaid Grade Level", description="The U.S. Army uses Flesch-Kincaid Grade Level for assessing the difficulty of technical manuals. The commonwealth of Pennsylvania uses Flesch-Kincaid Grade Level for scoring automobile insurance policies to ensure their texts are no higher than a ninth grade level of reading difficulty. Many other U.S. states also use Flesch-Kincaid Grade Level to score other legal documents such as business policies and financial forms."),
            ReadabilityMetric.GUNNING_FOG: AboutMetric(name="Gunning Fog Index", description="The Gunning fog index measures the readability of English writing. The index estimates the years of formal education needed to understand the text on a first reading. A fog index of 12 requires the reading level of a U.S. high school senior (around 18 years old)."),
            ReadabilityMetric.LINSEAR_WRITE: AboutMetric(name="Linsear Write Formula", description="Linsear Write is a readability metric for English text, purportedly developed for the United States Air Force to help them calculate the readability of their technical manuals."),
            ReadabilityMetric.SMOG: AboutMetric(name="Simple Measure of Gobbledygook Index", description="The SMOG Readability Formula is a popular method to use on health literacy materials."),
            ReadabilityMetric.SPACHE: AboutMetric(name="Spache Readability Formula", description="The Spache Readability Formula is used for Primary-Grade Reading Materials, published in 1953 in The Elementary School Journal. The Spache Formula is best used to calculate the difficulty of text that falls at the 3rd grade level or below."),
        }[self]

    @property
    def result_attrs(self) -> tuple[str, ...]:
        """Return the attributes of the result object for the readability metric."""
        if self == ReadabilityMetric.ALL:
            raise ValueError("ALL is not a valid readability metric. Get the property of each type.")
        match self:
            case ReadabilityMetric.ARI:
                return ("score", "grade_levels", "ages")
            case ReadabilityMetric.DALE_CHALL:
                return ("score", "grade_levels")
            case ReadabilityMetric.FLESCH:
                return ("score", "grade_levels", "ease")
            case ReadabilityMetric.COLEMAN_LIAU | ReadabilityMetric.GUNNING_FOG | ReadabilityMetric.FLESCH_KINCAID | ReadabilityMetric.LINSEAR_WRITE | ReadabilityMetric.SMOG | ReadabilityMetric.SPACHE:
                return ("score", "grade_level")

def convert_metric_iterable(type_: Any, tokens: Sequence[Token]) -> tuple[ReadabilityMetric, ...]:
    """Convert a list of tokens into a tuple of ReadabilityMetric."""
    assert type_ == tuple[ReadabilityMetric, ...], "Type must be a tuple of ReadabilityMetric."  # noqa: S101
    metrics = []
    if len(tokens) == 1 and tokens[0].value.lower() == "all":
        return tuple(v for v in ReadabilityMetric.__members__.values() if v != ReadabilityMetric.ALL) # type: ignore
    for token in tokens:
        if " " in token.value or "," in token.value:
            values = token.value.replace(",", " ").split()
            metrics.extend(tuple(ReadabilityMetric.from_name(v.strip()) for v in values if v.strip()))
        else:
            metrics.append(ReadabilityMetric.from_name(token.value))
    return tuple(metrics)

class LicenseType(StrEnum):
    """Enum for license types."""

    MPL = "mpl"
    MIT = "mit"
    ELASTIC = "elastic"
    UNLICENSE = "unlicense"

    @property
    def spdx_id(self) -> str:
        """Return the SPDX ID for the license type."""
        return {
            LicenseType.MPL: "mpl-2.0",
            LicenseType.MIT: "mit",
            LicenseType.ELASTIC: "elastic-2.0",
            LicenseType.UNLICENSE: "unlicense",
        }[self]

    @property
    def category(self) -> str:
        """Return the category of the license type."""
        return {
            LicenseType.MPL: "copyleft",
            LicenseType.MIT: "permissive",
            LicenseType.ELASTIC: "source-available",
            LicenseType.UNLICENSE: "public-domain",
        }[self]

    @property
    def root_path(self) -> Path:
        """Return the root path for the license type."""
        return REPO_ROOT / "docs" / "licenses" / self.category / self.spdx_id

    @property
    def path(self) -> Path:
        """Return the path to the license file."""
        return self.root_path / "index.md" if self.root_path.is_dir() else self.root_path

    @classmethod
    def licenses(cls) -> list[str]:
        """Return a list of all license names."""
        return sorted(cls.__members__.keys())

    @classmethod
    def from_value(cls, value: str) -> "LicenseType":
        """Return the LicenseType from a string value."""
        value = value.strip().lower()
        if value in cls.licenses():
            return cls(value)
        if value in (ids := [license_type.spdx_id for license_type in cls]):
            return cls(ids.index(value))
        raise ValueError(
            f"Invalid license type: {value}. Must be one of {cls.licenses()} or their SPDX IDs: {[license_type.spdx_id for license_type in cls]}."
        )

class LicenseData(TypedDict):
    """TypedDict for license data."""

    license: LicenseContent
    plain_license_text: str
    original_text: str

def _create_page(license_path: Path) -> LicensePageData:
    """Create a license page data from a license file."""
    return parse_license_file(license_path)

def _get_license(license_name: LicenseType) -> LicenseContent:
    """Get the LicenseContent object for a given license name."""
    try:
        license_path = license_name.path
    except KeyError as e:
        raise ValueError(
            f"License {license_name} not found in available licenses. Must be one of {LicenseType.licenses()}."
        ) from e
    if not license_path:
        raise ValueError(f"License {license_name} not found in available licenses.")
    page = _create_page(license_path)
    return LicenseContent(page)


def _get_license_data(license_name: LicenseType) -> LicenseData:
    """Get the license data for a given license name."""
    license_content = _get_license(license_name)
    plain_text = license_content.plaintext_content
    original_text = license_content.original_plaintext_content
    return LicenseData(
        license=license_content, plain_license_text=plain_text, original_text=original_text
    )


def validate_scores(scores: dict[Any, Any]) -> TypeGuard[Scores]:
    """Validate that all scores are either float or None."""
    def is_value_result_class(key: Metric, value: Any) -> Any:
        """Get the score attribute from a result object."""
        module_type = getattr(scorers, key, None)
        if module_type and (result_type := getattr(module_type, "Result", None)):
            return result_type is type(value)
        return False
    return all((v for k,v in scores.items() if is_value_result_class(k,v)))

def get_score(readability_obj: Readability, metric_name: str) -> IndividualScoreResponseType | None:
    """Get the readability score for a given metric name."""
    if hasattr(readability_obj, metric_name):
        try:
            return getattr(readability_obj, metric_name)()
        except Exception:
            # Some metrics may fail (e.g., SMOG requires 30+ sentences)
            return None
    return None

def format_for_ci(pl_scores: Scores, pl_title: str, original_scores: Scores, original_title: str) -> None:
    """Format the scores for CI output."""
    score_book = {}
    for metric, result in pl_scores.items():
        result_attrs = ReadabilityMetric(metric).result_attrs
        score_book[pl_title][metric] = {attr: getattr(result, attr, None) for attr in result_attrs}
    for metric, result in original_scores.items():
        result_attrs = ReadabilityMetric(metric).result_attrs
        score_book[original_title][metric] = {attr: getattr(result, attr, None) for attr in result_attrs}
    JSON(json.dumps(score_book))

def format_for_console(pl_scores: Scores, pl_title: str, original_scores: Scores, original_title: str) -> None:
    """Format the scores for console output."""
    console.rule(f"[bold spring_green]{pl_title} vs. {original_title} Readability Scores")
    console.print("\n")
    table = Table(title=f"{pl_title} Readability Scores", show_lines=True)
    table.add_column("Metric", justify="left", style="cyan", no_wrap=True)
    table.add_column(f"{pl_title} Score", justify="center", style="spring_green")
    table.add_column(f"{original_title} Score", justify="center", style="dark_goldenrod3")
    table.add_column(":trophy: Winner :trophy:", justify="right", style="bold magenta")
    for metric in pl_scores:
        attrs = ReadabilityMetric(metric).result_attrs
        pl_score_table = Table(*attrs)
        pl_score_table.add_row(*(f"{getattr(pl_scores[metric], attr, "N/A")}:.2f" if attr == "score" else getattr(pl_scores[metric], attr, "N/A") for attr in attrs))
        original_score_table = Table(*attrs)
        original_score_table.add_row(*(f"{getattr(original_scores[metric], attr, "N/A")}:.2f" if attr == "score" else getattr(original_scores[metric], attr, "N/A") for attr in attrs))
        if metric == "flesch":
            winner = "plain" if pl_scores[metric].score and original_scores[metric].score and pl_scores[metric].score > original_scores[metric].score else "original" # type: ignore
        else:
            winner = "plain" if pl_scores[metric].score and original_scores[metric].score and pl_scores[metric].score < original_scores[metric].score else "original"
        table.add_row(metric.title(), pl_score_table, original_score_table, original_title.title(), winner)
    console.print(table)

def process_scores(unvalidated_pl_scores, unvalidated_original_scores, license_data) -> None:
    """Process the unvalidated scores into a validated Scores object."""
    if not validate_scores(unvalidated_original_scores) or not validate_scores(
        unvalidated_pl_scores
    ):
        raise ValueError(
            "Invalid readability scores. Ensure all scores are valid and of type float or None."
        )
    pl_scores: Scores = unvalidated_pl_scores
    original_scores: Scores = unvalidated_original_scores
    pl_title = license_data["license"].title
    original_title = license_data["license"].get_title(original=True)
    params = (pl_scores, pl_title, original_scores, original_title)
    if IS_CI:
        format_for_ci(*params)
    else:
        format_for_console(*params)

@app.default
def compare(
    license_name: Annotated[
        LicenseType,
        Parameter(
            required=True,
            help="The name of the license to compare readability for.",
            show_choices=True,
        ),
    ],
    /,
    metrics: Annotated[
        tuple[ReadabilityMetric, ...],
        Parameter(
            name=["-m", "--metrics"],
            help="The readability metrics to compare. Provide a list either as space separated, comma separated without spaces, or as a json list. Defaults to providing `all`, which will use all available metrics.",
            converter=convert_metric_iterable,
            show_choices=True,
            negative=False,
            json_list=True,
            consume_multiple=True,
        ),
    ] = tuple(v for v in ReadabilityMetric.__members__.values() if v != ReadabilityMetric.ALL)
) -> None:
    """Compare the readability of different license texts."""
    license_data = _get_license_data(license_name)
    pl_readability = Readability(license_data["plain_license_text"])


    pl_raw_scores = tuple(
        (metric.value, get_score(pl_readability, metric.value)) for metric in metrics
    )
    original_readability = Readability(license_data["original_text"])
    original_raw_scores = tuple(
        (metric.value, get_score(original_readability, metric.value)) for metric in metrics
    )
    unvalidated_pl_scores = dict(pl_raw_scores)
    unvalidated_original_scores = dict(original_raw_scores)
    process_scores(unvalidated_pl_scores, unvalidated_original_scores, license_data, metrics)


@app.command
def about(
    metrics: Annotated[
        tuple[ReadabilityMetric, ...],
        Parameter(
            required=True,
            help="The readability metric or metrics to get information about.",
            show_choices=True,
            converter=convert_metric_iterable,
            negative=False,
            json_list=True,
            consume_multiple=True,
        ),
    ], /
) -> None:
    """Get information about a readability metric or several metrics."""
    if not metrics:
        console.print("No metrics provided. Use --help to see available metrics.", style="bold red")
        return
    for m in metrics:
        about_metric = m.about
        console.rule(f"[bold spring_green]{about_metric.name}")
        text = Padding(about_metric.description, (1, 2, 2, 2), style="dark_goldenrod3")
        console.print(text, **PRINT_PARAMS)  # type: ignore


def main() -> None:
    """Main entry point for the command line interface."""
    print(f"Running howplain version {__version__}...")
    try:
        app()
    except Exception:
        console.print_exception(show_locals=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
