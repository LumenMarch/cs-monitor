#!/bin/bash

# =============================================================================
# init.sh - Project Initialization Script (uv-managed)
# =============================================================================
# Run this script at the start of every session to ensure the environment
# is properly set up.
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Initializing CS2 Monitor project (uv)...${NC}"

# Check uv
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: uv is not installed.${NC}"
    echo "Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

UV_VERSION=$(uv --version 2>&1)
echo -e "${GREEN}✓ uv: $UV_VERSION${NC}"

# Sync dependencies (uv will pick up Python 3.12+ per pyproject.toml,
# auto-download if missing, and create .venv).
echo "Syncing Python dependencies via uv sync..."
if ! uv sync; then
    echo -e "${RED}Error: uv sync failed.${NC}"
    exit 1
fi

PYTHON_VERSION=$(uv run python --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✓ Python: $PYTHON_VERSION${NC}"

mkdir -p data

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Copy from .env.example:${NC}"
    echo "  cp .env.example .env"
    echo "  # Then edit .env with your actual API keys and webhook URLs"
fi

# Check Node.js for frontend tasks
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>&1)
    echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        echo "Installing frontend dependencies..."
        (cd frontend && npm install)
    fi
else
    echo -e "${YELLOW}Warning: Node.js not found. Frontend development requires Node.js 18+.${NC}"
    echo "  Download from: https://nodejs.org/"
fi

# Verify syntax of core files
echo "Verifying Python syntax..."
uv run python -m py_compile main.py config.py 2>/dev/null || true
for f in api/*.py core/*.py notify/*.py storage/*.py utils/*.py web/*.py web/routers/*.py; do
    [ -f "$f" ] && uv run python -m py_compile "$f" 2>/dev/null || true
done

echo -e "${GREEN}✓ Initialization complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Ensure .env is configured with your API keys"
echo "  2. Run tests:        uv run pytest tests/"
echo "  3. Run app:          uv run python main.py        (scheduler + Web on :8080)"
echo "  4. Run frontend dev: cd frontend && npm run dev"
echo ""
echo "Common uv commands:"
echo "  uv add <pkg>            # add a runtime dependency"
echo "  uv add --dev <pkg>      # add a dev dependency"
echo "  uv sync                 # sync env to lock file"
echo "  uv lock --upgrade       # upgrade lock file"
echo ""
echo "Ready to continue development."
