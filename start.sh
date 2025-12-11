#!/bin/bash
echo "🚀 Starting WhatsApp Bot..."
echo "📅 Date: $(date)"
echo "📁 Directory: $(pwd)"

# Install dependencies jika belum
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Cek auth folder
if [ ! -d "auth_info" ]; then
    echo "📁 Creating auth folder..."
    mkdir -p auth_info
fi

# Start bot
echo "🤖 Starting bot..."
node index.js
