"""
Update the sponsors' donation markdown file.
"""
import os
import re

from pathlib import Path
from typing import Any, TypedDict, TypeGuard

import ez_yaml as yaml
import requests


DONATE_FILE = Path.cwd() / "docs/helping/donate.md"
GOAL = 5000
ENDPOINT = "https://api.github.com/graphql"
USERNAME = "bashandbone"


class DonateFrontMatter(TypedDict):
    """
    TypedDict for the front matter of the donation markdown file.
    """
    title: str
    description: str
    template: str
    funding_goal: int
    funding_progress: int


def frontmatter_guard(content: Any) -> TypeGuard[DonateFrontMatter]:
    """
    Type guard to check if the content is a valid DonateFrontMatter.

    Args:
        content (Any): The content to check.

    Returns:
        TypeGuard[DonateFrontMatter]: True if content is a valid DonateFrontMatter, False otherwise.
    """
    return isinstance(content, dict) and all(
        key in content for key in ["title", "description", "template", "funding_goal", "funding_progress"]
    )


def fetch_total_amount(token: str) -> int:
    """
    Fetch the total amount of sponsorships received by a user from the GitHub API.

    Sends a GraphQL query to the GitHub API to retrieve the lifetime sponsorship values for a specified user. It sums the amounts received in cents and returns the total amount in dollars.

    Args:
        token (str): The authorization token used to access the GitHub API.

    Returns:
        int: The total amount of sponsorships received, in dollars.
    """
    url = "https://api.github.com/graphql"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    query = (
        """
    {
    user(login: """
        f'"{USERNAME}"'
        """) {
        lifetimeReceivedSponsorshipValues(first: 200) {
        edges {
            node {
            amountInCents
            formattedAmount
            sponsor {
                ... on User {
                login
                }
                ... on Organization {
                login
                }
            }
            }
        }
        }
    }
    }
    """
    )
    try:
        if response := requests.post(url, json={"query": query}, headers=headers, timeout=15):
            cents = sum(
                edge["node"]["amountInCents"]
                for edge in response.json()["data"]["user"]["lifetimeReceivedSponsorshipValues"][
                    "edges"
                ]
            )
            return cents // 100
    except Exception as e:
        print(e)
        return 0
    return 0


def update_front_matter(content: str, amount: int) -> str:
    """
    Update the front matter of the donation markdown file with the new funding progress amount. Also sets the funding goal.

    Args:
        content (str): The original markdown content containing front matter.
        amount (int): The new funding progress amount to be updated in the front matter.

    Returns:
        str: The updated markdown content with the modified front matter.
    """
    if front_matter_match := re.match(
        r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL | re.MULTILINE
    ):
        front_matter = yaml.to_object(front_matter_match[1])
        rest_of_document = content[front_matter_match.end() :]
    else:
        front_matter = {}
        rest_of_document = content

    if not frontmatter_guard(front_matter):
        raise ValueError("Invalid front matter format.")

    front_matter["funding_progress"] = amount
    front_matter["funding_goal"] = GOAL

    # Convert the updated front matter back to YAML
    updated_front_matter = yaml.to_string(front_matter)

    # Reconstruct the document
    return f"---\n{updated_front_matter}---\n{rest_of_document}"


def main() -> None:
    """
    Main function to update the sponsors' donation markdown file.

    Retrieves the total amount of sponsorships from the GitHub API and updates the front matter of the donation markdown file with this amount. Writes the updated content back to the file.

    Args:
        None

    Returns:
        None
    """
    if token := os.getenv("GH_TOKEN"):
        total_amount = fetch_total_amount(token)

        content = DONATE_FILE.read_text(encoding="utf-8")

        updated_content = update_front_matter(content, total_amount)

        DONATE_FILE.write_text(updated_content, encoding="utf-8")
    else:
        raise ValueError(
            "Please set the GH_TOKEN environment variable with your GitHub token."
        )


if __name__ == "__main__":
    main()
