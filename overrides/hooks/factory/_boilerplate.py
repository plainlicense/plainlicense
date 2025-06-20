from textwrap import dedent


def get_not_advice_text(issues_link: str, edit_link: str) -> tuple[str, str]:
    """Returns the "not advice" disclaimer text for the license."""
    return (
        dedent("We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk."),

        dedent(f"""We are normal people making licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]({issues_link} "Submit an issue on GitHub") or [edit this page]({edit_link} "edit on GitHub")."""
        )
    )

def get_not_official_text(plain_license: str, original_license: str | None = None, original_organization: str | None = None, original_url: str | None = None) -> tuple[str] | tuple[str,str]:
    """Returns the "not official" disclaimer text for the license."""
    if not original_license or not original_organization or not original_url:
        return ("",)
    return (
        dedent(
            f"""\
        Plain License is not affiliated with the original {original_license.strip()} authors or {original_organization.strip()}. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.""".strip()
        ),
        dedent(f"""\
        If you want to use the {plain_license.strip()}, start by reading the official {original_license.strip()} license text. You can find the official {original_license.strip()} [here]({original_url.strip()} "check out the official {original_license.strip()}"). If you have questions about the {original_license.strip()}, you should talk to a lawyer.
        """.strip()),
    )

def get_embed_link(
    embed_url: str,
    title: str,
    page_url: str,
) -> tuple:
    # TODO: Add embed link
    pass
