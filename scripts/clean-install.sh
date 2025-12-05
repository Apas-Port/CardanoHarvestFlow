#!/bin/bash

# Clean installation script for fixing Vercel deployment issues

echo "🧹 Cleaning project..."

# Remove node_modules and lock files
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml

# Clear Next.js cache
rm -rf .next
rm -rf .vercel

echo "📦 Installing dependencies with pnpm..."
pnpm install

echo "🔨 Building project..."
pnpm build

echo "✅ Clean installation complete!"