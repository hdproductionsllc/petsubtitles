#!/bin/bash
# What My Pet Thinks deploy script
# Builds, verifies, and deploys to Vercel production
#
# Usage: ./scripts/deploy.sh
# Or:    npm run deploy (if added to package.json)

set -e

echo "🐾 What My Pet Thinks Deploy"
echo "======================"
echo ""

# Step 1: Build
echo "📦 Building..."
npm run build
echo ""

# Step 2: Deploy to Vercel
echo "🚀 Deploying to Vercel production..."
vercel --prod --yes --name whatmypetthinks
echo ""

echo "✅ Deployed! Check https://whatmypetthinks.com"
