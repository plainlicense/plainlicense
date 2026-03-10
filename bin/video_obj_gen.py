#!/usr/bin/env python3
"""
Generates a TypeScript file with all the video paths for the hero section.
"""
import json
import re

from pathlib import Path
from typing import Literal, NamedTuple, TypedDict, cast


#================================================
#                 Configuration
#================================================
SAVE_PATH: Path = Path("/workspaces/plainlicense/src/assets/javascripts/features/hero/video/data.ts")
NAMES: list[str] = ["tokyo_shuffle", "break_free"]
CODECS: list[str] = ["av1", "vp9", "h264"]
VIDEO_EXTENSIONS: dict[str, str] = {"av1": "webm", "vp9": "webm", "h264": "mp4"}
IMAGE_EXTENSIONS: list[str] = ["avif", "webp", "png"]
RESOLUTIONS: list[int] = [3840, 2560, 1920, 1280, 854, 640, 426]
BASE_PATH: str = "./assets/videos/hero"

#================================================
#                Type Definitions
#================================================

type Resolution = Literal[3840, 2560, 1920, 1280, 854, 640, 426] #
type VideoCodec = Literal["avif", "vp9", "h264"]
type ImageExt = Literal["avif", "webp", "png"]

type ResolutionDict = dict[Resolution, str]
type PosterValues = dict[Resolution | Literal["srcset"], str]

class Variants(TypedDict):
    """Type definition for the variants object."""
    av1: dict[int, str]
    vp9: dict[int, str]
    h264: dict[int, str]

class PostersObject(TypedDict):
    """Type definition for the posters object."""
    avif: PosterValues
    webp: PosterValues
    png: PosterValues

class VideoObject(TypedDict):
    """Type definition for the video object."""
    variants: Variants
    posters: PostersObject
    parentPath: str
    baseName: str

class PathTuple(NamedTuple):
    """Tuple of a key variable name and its corresponding path."""
    path_var: str
    path: str

#===========================
#     Regex Patterns
#===========================
# Regex patterns
RES_QUOTES = re.compile(r"\"(\d+)\":")
ENUM_QUOTES = re.compile(r"\"(HeroName\..+?)\"")
KEY_QUOTES = re.compile(r"\"([a-zA-Z0-9]+)\"")
VAR_QUOTES = re.compile(r"\"([a-zA-Z0-9]+)\",")
RESOLUTIONS_PATTERN = re.compile(f"{'|'.join([str(res) for res in RESOLUTIONS])}")
IMAGE_EXT_PATTERN = re.compile(f"{'|'.join(IMAGE_EXTENSIONS)}", re.IGNORECASE)


#================================================

def generate_base_video_object(name: str) -> VideoObject:
    """Generate base video object for a single video name."""
    variants = {codec: {resolution: '' for resolution in RESOLUTIONS} for codec in CODECS}
    posters = {ext: {resolution: '' for resolution in RESOLUTIONS} for ext in IMAGE_EXTENSIONS}
    video_object = {name: {"variants": variants, "posters": {}, "parentPath": "", "baseName": ""}}
    modified_name = name.replace("_", " ").title().replace(" ", "")
    video_object[name]['baseName'] = f'HeroName.{modified_name}'
    video_object[name]['parentPath'] = f"{BASE_PATH}/{name}"
    for ext in IMAGE_EXTENSIONS:
        video_object[name]['posters'][ext] = {**posters[ext], "srcset": ""} # type: ignore - Not sure why this is throwing an error, because it should be valid
    return cast(VideoObject, video_object)

def format_key_name(name: str) -> str:
    """Convert file name to camelCase key format."""
    split_name = name.split("_")
    return f"{split_name[0]}{split_name[1].title()}" if "_" in name else name

def get_name(name: str, resolution: int, extension: str, codec: str | None = None) -> str:
    """Generate filename based on parameters."""
    return f"{name}_{codec}_{resolution}.{extension}" if codec else f"{name}_{resolution}.{extension}"

def get_path(name: str, ext: str, base_path: str, resolved_name: str) -> str:
    """Generate full file path based on extension type."""
    match ext:
        case "webm" | "mp4":
            return f"{base_path}/{name}/{resolved_name}"
        case "avif" | "webp" | "png":
            return f"{base_path}/{name}/posters/{resolved_name}"
        case _:
            raise ValueError("Invalid extension type.")

def to_js_string_literal(string: str) -> str:
    """Convert string to JS string literal."""
    return "${" + string + "}"

def generate_video_paths(name: str, key_name: str, video_obj: VideoObject) -> tuple[list[PathTuple], VideoObject]:
    """Generate video and poster paths for a single video name."""
    name_paths = []
    srcset_vals = []

    for resolution in RESOLUTIONS:
        for codec in CODECS:
            ext = VIDEO_EXTENSIONS[codec]
            file_name = get_name(name, resolution, ext, codec)
            path = get_path(name, ext, BASE_PATH, file_name)
            var_name = f"{key_name}{codec.title()}{resolution}"
            video_obj[name]['variants'][codec][int(resolution)] = var_name
            name_paths.append(PathTuple(var_name, path))

        for ext in IMAGE_EXTENSIONS:
            file_name = get_name(name, resolution, ext)
            path = get_path(name, ext, BASE_PATH, file_name)
            var_name = f"{key_name}{ext.title()}{resolution}"
            video_obj[name]['posters'][ext][int(resolution)] = var_name
            name_paths.append(PathTuple(var_name, path))
            srcset_vals.append(f"{to_js_string_literal(var_name)} {resolution}w")

    # Generate srcset strings
    srcset_vals.sort(key=lambda x: int(RESOLUTIONS_PATTERN.search(x).group(0)), reverse=True) # type: ignore - it will always match, I promise
    for ext in IMAGE_EXTENSIONS:
        srcset = ', '.join(val for val in srcset_vals if ext.title() in val)
        video_obj[name]['posters'][ext]['srcset'] = f"`{srcset}`"

    return name_paths, video_obj


def generate_all_paths(video_obj: VideoObject) -> tuple[VideoObject, list[PathTuple]]:
    """Generate all file paths for all video names."""
    all_paths: list[PathTuple] = []
    for name in NAMES:
        key_name = format_key_name(name)
        paths, video_obj = generate_video_paths(name, key_name, video_obj)
        all_paths.extend(paths)
    return video_obj, all_paths

def create_import_statement(path: PathTuple) -> str:
    """Create import statements from paths."""
    return f"\n  import {path.path_var} from '{path.path}';\n"

def process_video_object_string(video_obj: VideoObject) -> str:
    """Convert video object to JSON string."""
    as_json = json.dumps(video_obj, indent=2)
    as_json = RES_QUOTES.sub(r"\1:", as_json)
    as_json = ENUM_QUOTES.sub(r"\1", as_json)
    as_json = VAR_QUOTES.sub(r"\1,", as_json)
    return KEY_QUOTES.sub(r"\1", as_json)

def main() -> str:
    """Main function to generate TypeScript file."""
    video_objects = {}
    for name in NAMES:
        video_objects |= generate_base_video_object(name)
    video_objects, paths = generate_all_paths(video_objects) # type: ignore
    imports = [create_import_statement(path) for path in paths]
    enum_names = [f"{name.replace('_', ' ').title().replace(' ', '')} = '{name}'" for name in NAMES]
    hero_enum = "export enum HeroName {\n" + ",\n".join(list(enum_names)) + "\n}"
    return f'{"".join(imports)}\n\n{hero_enum}\n\nexport const rawHeroVideos = {process_video_object_string(video_objects)};' # type: ignore


if __name__ == "__main__":
    content = main()
    if SAVE_PATH.exists():
        SAVE_PATH.unlink()
    SAVE_PATH.write_text(content)
