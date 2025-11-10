#!/bin/bash

# Sprint Management System Setup Script
# This script sets up the sprint management system for first use

echo "🚀 Setting up Sprint Management System..."
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js v14+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install js-yaml
echo ""

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.js
echo ""

# Create backups directory
echo "📁 Creating backups directory..."
mkdir -p documentation/backups
echo ""

# Test scripts
echo "🧪 Testing scripts..."
echo ""

echo "Testing validation script..."
node scripts/validate-sprints.js

if [ $? -eq 0 ]; then
    echo "✅ Validation script works!"
else
    echo "⚠️  Validation script returned warnings or errors"
fi

echo ""
echo "Testing status script..."
node scripts/sprint-status.js

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo ""
echo "📚 Available Commands:"
echo "  npm run sprint-status    - View sprint dashboard"
echo "  npm run validate-sprints - Validate configuration"
echo "  npm run sync-sprints     - Sync changes to sprint files"
echo "  npm run view-changelog   - View recent changes"
echo "  npm run full-sync        - Validate + Sync + Status"
echo ""
echo "📖 Documentation:"
echo "  Read: documentation/SPRINT-MANAGEMENT-README.md"
echo ""
echo "🎯 Next Steps:"
echo "  1. Review SPRINT-MASTER.md"
echo "  2. Run: npm run sprint-status"
echo "  3. Make your first edit!"
echo ""
echo "Happy sprint planning! 🎉"
