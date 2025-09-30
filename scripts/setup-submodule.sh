#!/bin/bash

set -e

SUBMODULE_PATH="data"
TARGET_FOLDER="content"

echo "🚀 Setting up blog submodule..."
echo "   Target: $SUBMODULE_PATH"
echo "   Keeping only: $TARGET_FOLDER/"
echo ""

if [ ! -d "$SUBMODULE_PATH/.git" ]; then
  echo "📥 Initializing submodule..."
  git submodule update --init "$SUBMODULE_PATH"
fi

cd "$SUBMODULE_PATH"

echo "🧹 Cleaning previous sparse-checkout config..."
git sparse-checkout disable 2>/dev/null || true

echo "📂 Configuring sparse checkout..."
git sparse-checkout init --no-cone

echo "$TARGET_FOLDER/" > .git/info/sparse-checkout

echo "🔄 Applying sparse checkout..."
git read-tree -mu HEAD

echo "🗑️  Removing root-level files..."
find . -maxdepth 1 -type f ! -name '.git*' -delete 2>/dev/null || true

echo "⬇️  Pulling latest content..."
MAIN_BRANCH=$(git remote show origin | grep 'HEAD branch' | cut -d' ' -f5)
git pull origin "$MAIN_BRANCH" 2>/dev/null || true

echo ""
echo "✅ Submodule setup complete!"
echo ""
echo "📁 Current structure:"
ls -la | grep -v '^total' | grep -v '^\.$' | grep -v '^\.\.$'

echo ""
echo "📝 Sparse checkout config:"
cat .git/info/sparse-checkout

cd ../..

echo ""
echo "🎉 Done! You can now run: npm run ingest"