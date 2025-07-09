#!/bin/bash

# Production project setup script for roslyn-mcp

echo "🚀 Setting up roslyn-mcp for production project"
echo "================================================"

# Get project path from user
read -p "Enter your production project path: " PROD_PROJECT_PATH

# Validate path exists
if [ ! -d "$PROD_PROJECT_PATH" ]; then
    echo "❌ Error: Directory does not exist: $PROD_PROJECT_PATH"
    exit 1
fi

# Check for solution or project files
echo "🔍 Scanning for C# project files..."
SOLUTION_FILES=$(find "$PROD_PROJECT_PATH" -maxdepth 2 -name "*.sln" | head -5)
PROJECT_FILES=$(find "$PROD_PROJECT_PATH" -maxdepth 3 -name "*.csproj" | head -10)

echo ""
if [ -n "$SOLUTION_FILES" ]; then
    echo "📄 Found solution files:"
    echo "$SOLUTION_FILES"
fi

if [ -n "$PROJECT_FILES" ]; then
    echo "📁 Found project files:"
    echo "$PROJECT_FILES"
fi

if [ -z "$SOLUTION_FILES" ] && [ -z "$PROJECT_FILES" ]; then
    echo "⚠️  Warning: No .sln or .csproj files found in the first 2-3 directory levels"
    echo "   Make sure this is a C# project directory"
fi

# Create .mcp.json
echo ""
echo "📝 Creating .mcp.json configuration..."

cat > "$PROD_PROJECT_PATH/.mcp.json" << EOF
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": ["$(pwd)/dist/cli.js"],
      "env": {
        "PROJECT_ROOT": "$PROD_PROJECT_PATH"
      }
    }
  }
}
EOF

echo "✅ Created: $PROD_PROJECT_PATH/.mcp.json"

# Test basic project structure
echo ""
echo "🔧 Testing basic project setup..."

# Check if dotnet is available
if command -v dotnet &> /dev/null; then
    echo "✅ .NET CLI found: $(dotnet --version)"
    
    # Try to restore packages
    echo "🔄 Testing dotnet restore..."
    cd "$PROD_PROJECT_PATH"
    if dotnet restore --verbosity quiet; then
        echo "✅ dotnet restore successful"
    else
        echo "⚠️  dotnet restore had issues (this may be normal for some projects)"
    fi
else
    echo "❌ .NET CLI not found - please install .NET SDK"
fi

echo ""
echo "🎯 Setup complete! Next steps:"
echo "1. Open Claude Code in your production project directory"
echo "2. The roslyn-mcp server will automatically start"
echo "3. Test with: 'Check for errors in [filename.cs]'"
echo ""
echo "📍 Production project: $PROD_PROJECT_PATH"
echo "📍 MCP config: $PROD_PROJECT_PATH/.mcp.json"