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

Actions in this repo are versioned with git tags. Consumer repos pin to a specific tag (e.g. `@v1.0.0`) rather than `@main` for supply-chain safety.

To cut a new release:

```bash
git tag v1.1.0
git push origin v1.1.0
```

For breaking changes, bump the major version (`v2.0.0`) and update the usage example in this README. Consumer repos opt in by updating their `uses:` line.
