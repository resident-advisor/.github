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

Pin to a specific commit SHA for supply-chain safety — branch and tag refs can be moved, but a commit SHA is immutable.
You can find the latest commit sha in the commit history.

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
      - uses: resident-advisor/.github/.github/actions/release-pr-bot@<commit-sha>
```

To use non-default branch names:

```yaml
    steps:
      - uses: resident-advisor/.github/.github/actions/release-pr-bot@<commit-sha>
        with:
          main_branch: master
          develop_branch: staging
```

#### Inputs

| Input            | Default   | Description                  |
| ---------------- | --------- | ---------------------------- |
| `main_branch`    | `main`    | The branch to release into   |
| `develop_branch` | `develop` | The branch being released    |
