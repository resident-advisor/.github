#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# release.sh — create an immutable draft GitHub release
#
# Usage: ./release.sh <version>
#   e.g. ./release.sh v1.2.0
#
# Requires: git, gh (GitHub CLI), authenticated via `gh auth login`
# ---------------------------------------------------------------------------

VERSION="${1:-}"

# --- validate input ---------------------------------------------------------

if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>  (e.g. $0 v1.2.0)"
  exit 1
fi

if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be in the format vX.Y.Z (got '$VERSION')"
  exit 1
fi

# --- pre-flight checks ------------------------------------------------------

if ! gh auth status &>/dev/null; then
  echo "Error: not authenticated with GitHub CLI. Run: gh auth login"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working directory is dirty. Commit or stash your changes first."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Warning: you are on '$CURRENT_BRANCH', not 'main'."
  read -r -p "Continue anyway? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

if git rev-parse "$VERSION" &>/dev/null; then
  echo "Error: tag '$VERSION' already exists."
  exit 1
fi

# --- confirm before doing anything ------------------------------------------

echo ""
echo "  Version : $VERSION"
echo "  Branch  : $CURRENT_BRANCH"
echo "  Commit  : $(git rev-parse --short HEAD)"
echo ""
read -r -p "Create and push tag '$VERSION', then open a draft release? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || exit 1

# --- tag and push -----------------------------------------------------------

echo ""
echo "→ Creating tag $VERSION..."
git tag "$VERSION"

echo "→ Pushing tag to origin..."
git push origin "$VERSION"

# --- create draft release ---------------------------------------------------

echo "→ Creating draft release on GitHub..."
gh release create "$VERSION" \
  --draft \
  --title "$VERSION" \
  --notes "<!-- Add release notes here before publishing -->"

echo ""
echo "✓ Done. Draft release created for $VERSION."
echo ""
echo "Next steps:"
echo "  1. Open the draft release in GitHub and add your release notes."
echo "  2. Click 'Publish release' — it will become immutable immediately."
echo ""

# Open the release in the browser for convenience
gh release view "$VERSION" --web