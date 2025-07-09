#!/bin/bash

# Auto-detect MCP setup script
# Usage: ./auto-detect-setup.sh [target-directory]

TARGET_DIR="${1:-$(pwd)}"
ROSLYN_MCP_PATH="$(cd "$(dirname "$0")" && pwd)"

echo "🔍 Auto-detecting C# project setup for: $TARGET_DIR"
echo "🔧 Using roslyn-mcp from: $ROSLYN_MCP_PATH"

# Function to find project root
find_project_root() {
    local current_dir="$1"
    
    # Look for common project indicators
    while [ "$current_dir" != "/" ]; do
        if [ -f "$current_dir"/*.sln ] || \
           [ -f "$current_dir"/*.csproj ] || \
           [ -f "$current_dir"/Packages/manifest.json ] || \
           [ -d "$current_dir"/Assets ]; then
            echo "$current_dir"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done
    
    # Default to provided directory
    echo "$1"
}

PROJECT_ROOT="$(find_project_root "$TARGET_DIR")"

echo "📁 Detected project root: $PROJECT_ROOT"

# Create .mcp.json
cat > "$TARGET_DIR/.mcp.json" << EOF
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": ["$ROSLYN_MCP_PATH/dist/cli.js"],
      "env": {
        "PROJECT_ROOT": "$PROJECT_ROOT"
      }
    }
  }
}
EOF

echo "✅ Created .mcp.json in: $TARGET_DIR"
echo "🎯 Project root set to: $PROJECT_ROOT"

# Validate setup
if [ -f "$TARGET_DIR/.mcp.json" ]; then
    echo "📋 Configuration:"
    cat "$TARGET_DIR/.mcp.json"
    echo ""
    echo "🚀 Setup complete! You can now use Claude Code in this directory."
else
    echo "❌ Failed to create configuration file"
    exit 1
fi