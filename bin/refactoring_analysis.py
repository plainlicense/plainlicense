#!/usr/bin/env python3
# sourcery skip: avoid-single-character-names-variables
"""
Analyze git history to identify extensive TypeScript refactors.

This script examines commits in a specific directory to find patterns
that indicate major refactoring work, without needing to load file contents.
"""

import contextlib
import json
import subprocess

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Literal


@dataclass
class CommitStats:
    """Statistics for a single commit affecting the target directory."""
    sha: str
    author: str
    date: datetime
    message: str
    files_changed: int
    insertions: int
    deletions: int
    total_changes: int

    @property
    def change_ratio(self) -> float:
        """Ratio of total changes to files changed (intensity per file)."""
        return self.total_changes / self.files_changed if self.files_changed > 0 else 0


class RefactorAnalyzer:
    """Analyze git history to identify extensive refactoring commits."""

    def __init__(self, repo_path: str, target_directory: str = "src/assets/javascripts"):
        """Initialize the analyzer with the repository path and target directory."""
        self.repo_path = repo_path
        self.target_directory = target_directory

    def get_commit_stats(self, since_date: str | None = None) -> list[CommitStats]:
        """
        Get detailed statistics for commits affecting the target directory and its subdirectories ONLY.

        The git command filters to only include commits that modified files within
        the specified directory tree (e.g., src/assets/javascripts/**).

        Args:
            since_date: Optional date filter (e.g., "2023-01-01")
        """
        # Build git log command - the "--" followed by directory path limits to that directory tree
        cmd = [
            "git", "-C", self.repo_path, "log",
            "--pretty=format:%H|%an|%ai|%s",
            "--numstat",
            "--", self.target_directory
        ]

        if since_date:
            cmd.insert(-2, f"--since={since_date}")

        print(f"Analyzing commits affecting: {self.target_directory} (and subdirectories)")

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)  # noqa: S603
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Git command failed: {e.stderr}") from e

        return self._parse_git_output(result.stdout)

    def _parse_git_output(self, output: str) -> list[CommitStats]:
        """Parse git log output into CommitStats objects."""
        commits = []
        lines = output.strip().split('\n')
        i = 0

        while i < len(lines):
            if not lines[i]:
                i += 1
                continue

            # Parse commit header
            parts = lines[i].split('|', 3)
            if len(parts) != 4:
                i += 1
                continue

            sha, author, date_str, message = parts
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))

            # Parse file changes
            i += 1
            insertions = deletions = files_changed = 0

            while i < len(lines) and lines[i] and '|' not in lines[i]:
                # numstat format: insertions\tdeletions\tfilename
                parts = lines[i].split('\t')
                if len(parts) >= 3:
                    with contextlib.suppress(ValueError):
                        ins = int(parts[0]) if parts[0] != '-' else 0
                        dels = int(parts[1]) if parts[1] != '-' else 0
                        insertions += ins
                        deletions += dels
                        files_changed += 1
                i += 1

            commits.append(CommitStats(
                sha=sha,
                author=author,
                date=date,
                message=message,
                files_changed=files_changed,
                insertions=insertions,
                deletions=deletions,
                total_changes=insertions + deletions
            ))

        return commits

    def identify_refactor_commits(
        self,
        commits: list[CommitStats],
        min_changes: int = 100,
        min_files: int = 2,
        min_change_ratio: float = 50.0
    ) -> list[CommitStats]:
        """
        Identify commits that likely represent extensive refactors.

        Args:
            min_changes: Minimum total line changes
            min_files: Minimum number of files changed
            min_change_ratio: Minimum ratio of changes per file
        """
        refactor_keywords = [
            'refactor', 'restructure', 'reorganize', 'cleanup', 'rewrite',
            'migrate', 'modernize', 'upgrade', 'convert', 'transform'
        ]

        candidates = []

        for commit in commits:
            # Check quantitative criteria
            if (commit.total_changes >= min_changes and
                commit.files_changed >= min_files and
                commit.change_ratio >= min_change_ratio):
                candidates.append(commit)
                continue

            # Check for refactor keywords in commit message
            message_lower = commit.message.lower()
            if any(keyword in message_lower for keyword in refactor_keywords) and commit.total_changes >= min_changes // 2:
                candidates.append(commit)

        return sorted(candidates, key=lambda c: c.total_changes, reverse=True)

    def analyze_refactor_patterns(self, refactor_commits: list[CommitStats]) -> dict:
        """Analyze patterns in refactoring commits."""
        if not refactor_commits:
            return {"error": "No refactor commits found"}

        total_refactors = len(refactor_commits)
        total_changes = sum(c.total_changes for c in refactor_commits)
        total_files = sum(c.files_changed for c in refactor_commits)

        # Group by author
        by_author = {}
        for commit in refactor_commits:
            author = commit.author
            if author not in by_author:
                by_author[author] = {"count": 0, "total_changes": 0}
            by_author[author]["count"] += 1
            by_author[author]["total_changes"] += commit.total_changes

        # Timeline analysis
        dates = [c.date for c in refactor_commits]
        date_range = (min(dates), max(dates)) if dates else (None, None)

        return {
            "summary": {
                "total_refactor_commits": total_refactors,
                "total_lines_changed": total_changes,
                "total_files_affected": total_files,
                "average_changes_per_refactor": total_changes / total_refactors,
                "average_files_per_refactor": total_files / total_refactors,
            },
            "timeline": {
                "first_refactor": (
                    date_range[0].isoformat() if date_range[0] else None
                ),
                "latest_refactor": (
                    date_range[1].isoformat() if date_range[1] else None
                ),
                "span_days": (
                    (date_range[1] - date_range[0]).days
                    if (date_range[0] is not None and date_range[1] is not None)
                    else None
                ),
            },
            "by_author": by_author,
            "largest_refactors": [
                {
                    "sha": c.sha[:8],
                    "date": c.date.strftime("%Y-%m-%d"),
                    "message": (
                        f"{c.message[:100]}..."
                        if len(c.message) > 100
                        else c.message
                    ),
                    "changes": c.total_changes,
                    "files": c.files_changed,
                    "ratio": round(c.change_ratio, 1),
                }
                for c in refactor_commits[:10]
            ],
        }

    def verify_directory_scope(self) -> dict[str, object]:
        """
        Verify which files in the target directory have been modified in git history.
        This helps confirm the analysis scope is correct.
        """
        cmd = [
            "git", "-C", self.repo_path, "log",
            "--name-only", "--pretty=format:", "--", self.target_directory
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)  # noqa: S603  # this is all development code
            files = {line.strip() for line in result.stdout.strip().split('\n') if line.strip()}

            # Filter to only files in our target directory
            target_files = [f for f in files if f.startswith(self.target_directory)]

            # Categorize by file type
            ts_files = [f for f in target_files if f.endswith(('.ts', '.tsx'))]
            js_files = [f for f in target_files if f.endswith(('.js', '.jsx'))]
            other_files = [f for f in target_files if not any(f.endswith(ext) for ext in ['.ts', '.tsx', '.js', '.jsx'])]

            return {
                "total_files_in_history": len(target_files),
                "typescript_files": len(ts_files),
                "javascript_files": len(js_files),
                "other_files": len(other_files),
                "sample_files": target_files[:10],  # Show first 10 for verification
                "directory_confirmed": self.target_directory
            }

        except subprocess.CalledProcessError as e:
            return {"error": f"Could not verify directory scope: {e.stderr}"}

    def run_analysis(
        self,
        since_date: str | None = None,
        output_file: str | None = None,
        *,
        verify_scope: bool = True
    ) -> dict:
        """Run complete refactor analysis and optionally save results."""
        print(f"Analyzing refactors in {self.target_directory}...")

        scope_info = self.print_and_return_results() if verify_scope else None
        # Get all commits
        commits = self.get_commit_stats(since_date)
        print(f"Found {len(commits)} total commits affecting the directory")

        # Identify refactors
        refactor_commits = self.identify_refactor_commits(commits)
        print(f"Identified {len(refactor_commits)} potential refactor commits")

        # Analyze patterns
        analysis = self.analyze_refactor_patterns(refactor_commits)

        # Add scope info to results
        if verify_scope and scope_info is not None:
            analysis["scope_verification"] = scope_info

        # Save results if requested
        if output_file:
            with Path(output_file).open('w') as f:
                json.dump(analysis, f, indent=2, default=str)
            print(f"Results saved to {output_file}")

        return analysis

    def print_and_return_results(self) -> dict[str, object]:
        """Print and return the directory scope verification results."""
        result: dict = self.verify_directory_scope()
        print("Directory scope verified:")
        print(f"  - TypeScript files: {result.get('typescript_files', 0)}")
        print(f"  - JavaScript files: {result.get('javascript_files', 0)}")
        print(
            f"  - Total files in git history: {result.get('total_files_in_history', 0)}"
        )
        if result.get('sample_files'):
            print(f"  - Sample files: {result['sample_files'][:3]}...")
        print()

        return result

def _analyze_refactor(analyzer, args) -> None:
    """Run the refactor analysis with the provided arguments."""
    analysis = analyzer.run_analysis(args.since, args.output, verify_scope=not args.no_verify)

    # Print summary
    print("\n" + "="*50)
    print("REFACTOR ANALYSIS SUMMARY")
    print("="*50)

    summary = analysis.get("summary", {})
    for key, value in summary.items():
        print(f"{key.replace('_', ' ').title()}: {value}")

    print("\nTop 5 Largest Refactors:")
    for i, refactor in enumerate(analysis.get("largest_refactors", [])[:5], 1):
        print(f"{i}. {refactor['sha']} ({refactor['date']})")
        print(f"   {refactor['changes']} changes across {refactor['files']} files")
        print(f"   {refactor['message']}")
        print()


def main() -> Literal[1, 0]:
    """Example usage of the RefactorAnalyzer."""
    import argparse

    parser = argparse.ArgumentParser(description="Analyze git history for TypeScript refactors")
    parser.add_argument("repo_path", help="Path to the git repository")
    parser.add_argument("--directory", default="src/assets/javascripts",
                       help="Directory to analyze (default: src/assets/javascripts)")
    parser.add_argument("--since", help="Analyze commits since date (YYYY-MM-DD)")
    parser.add_argument("--output", help="Save results to JSON file")
    parser.add_argument("--min-changes", type=int, default=100,
                       help="Minimum line changes for refactor detection")
    parser.add_argument("--min-files", type=int, default=2,
                       help="Minimum files changed for refactor detection")
    parser.add_argument("--no-verify", action="store_true",
                       help="Skip directory scope verification")

    args = parser.parse_args()

    analyzer = RefactorAnalyzer(args.repo_path, args.directory)

    try:
        _analyze_refactor(analyzer, args)
    except Exception as e:
        print(f"Error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
