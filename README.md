# Resident Advisor

[ra.co](https://ra.co)


This repo is used to house our organisation-wide health files, which can include `CONTRIBUTING`, `SUPPORT`, `CODE_OF_CONDUCT`, `ISSUE_TEMPLATE`(S), or `PULL_REQUEST_TEMPLATE`(S). If another organisation repo doesn't include one of these files, it will fallback to the one found in this repo.

See [here](https://github.blog/changelog/2019-02-21-organization-wide-community-health-files/) for more info.

## Shared Actions

This repo houses reusable GitHub Actions that any repo in the organisation can reference directly.

### Release PR Bot

Automatically creates or updates a release PR from `develop` → `main`. Each time it runs, it:

- Finds all merged PRs on `develop` not yet in `main`
- Builds a PR body listing each one with author
- Auto-requests reviews from the authors of those PRs
- Updates the PR body and adds any new reviewers if the release PR already exists

#### Usage

Pin to a published release tag for supply-chain safety. Published GitHub releases are immutable — the tag cannot be moved or deleted. Find available releases on the [releases page](https://github.com/resident-advisor/.github/releases).

```yaml
# .github/workflows/release-pr.yml
name: Release PR

on:
  push:
    branches:
      - develop

jobs:
  release-pr:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: resident-advisor/.github/.github/actions/release-pr-bot@v1.0.0
```

To use non-default branch names:

```yaml
    steps:
      - uses: resident-advisor/.github/.github/actions/release-pr-bot@v1.0.0
        with:
          main_branch: master
          develop_branch: staging
```

#### Inputs

| Input            | Default   | Description                  |
| ---------------- | --------- | ---------------------------- |
| `main_branch`    | `main`    | The branch to release into   |
| `develop_branch` | `develop` | The branch being released    |

## Releasing New Action Versions

Releases are created using `scripts/release.sh`, which tags the current commit and opens a draft GitHub release. Publishing the release makes the tag immutable.

### Prerequisites

- [git](https://git-scm.com/)
- [GitHub CLI](https://cli.github.com/) — install with `brew install gh`
- Authenticated with the GitHub CLI: `gh auth login`

### Steps

From `main` with a clean working directory:

```bash
# You should use semantic versioning to decide what version to pass
./scripts/release.sh v1.1.0
```

The script will confirm the version, branch, and commit before doing anything. Once confirmed it will:

1. Create and push the tag
2. Open a draft release in GitHub

Add release notes to the draft, then publish it. Consumer repos update their `uses:` tag to pick up the new version.
