#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$#" -ne 1 ]; then
    echo -e "${RED}Usage: $0 SERVER_IP${NC}"
    echo "Example: $0 167.172.203.32"
    exit 1
fi

SERVER_IP=$1
SERVER_USER="root"
REMOTE_DIR="/root/planning-doc-chatbot"
LOCAL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${GREEN}=== Deploying to $SERVER_IP ===${NC}"
echo ""

echo -e "${YELLOW}Step 1: Syncing files to server...${NC}"

# Sync files, excluding node_modules, build artifacts, and local dev files
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'ux/build' \
    --exclude '.git' \
    --exclude '*.pyc' \
    --exclude '__pycache__' \
    --exclude 'ux/userdata' \
    --exclude 'logs' \
    --exclude '.DS_Store' \
    "$LOCAL_DIR/" \
    "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/"

echo -e "${GREEN}✓ Files synced${NC}"
echo ""

echo -e "${YELLOW}Step 2: Running deployment script on server...${NC}"

# Make deploy script executable and run it
ssh "${SERVER_USER}@${SERVER_IP}" "cd ${REMOTE_DIR} && chmod +x deploy.sh && ./deploy.sh"

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Your app is now deployed at:"
echo "  http://${SERVER_IP}"
echo ""
echo "To view logs:"
echo "  ssh ${SERVER_USER}@${SERVER_IP} 'journalctl -u negotiation-coach -f'"
