#!/bin/bash
set -e

echo "🔧 Setting up environment..."

# Check if .env exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists!"
  read -p "Do you want to overwrite it? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# Copy .env.example to .env
cp .env.example .env

echo "✅ Created .env file from .env.example"
echo ""
echo "📝 Please edit .env and set the following values:"
echo "   - OPENAI_API_KEY (your OpenAI API key)"
echo ""
echo "Then run: npm run docker:up"