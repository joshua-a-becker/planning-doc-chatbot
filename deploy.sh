#!/bin/bash
set -e

APP_DIR="/root/planning-doc-chatbot"

echo "=== Installing system dependencies ==="
apt-get update
apt-get install -y curl

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs python3 python3-pip

# Install Caddy
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

echo "=== Installing Python dependencies ==="
pip3 install openai pydantic tinydb filelock

echo "=== Installing Node dependencies and building ==="
cd $APP_DIR/ux
npm install
npm run build

echo "=== Configuring environment ==="
echo "$APP_DIR" > $APP_DIR/localdir.txt
mkdir -p $APP_DIR/logs $APP_DIR/storage $APP_DIR/ux/userdata

echo "=== Setting up systemd service ==="
cat > /etc/systemd/system/negotiation-coach.service <<EOF
[Unit]
Description=Negotiation Coach
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/ux
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable negotiation-coach
systemctl restart negotiation-coach

echo "=== Configuring Caddy ==="
cp $APP_DIR/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy

echo "=== Done ==="
systemctl status negotiation-coach --no-pager
