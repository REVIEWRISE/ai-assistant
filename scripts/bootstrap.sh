#!/bin/bash
set -e

echo "Starting server bootstrap..."

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# Rotate container logs — otherwise json-file logs grow unbounded on the host
# over months of real traffic.
if [ ! -f /etc/docker/daemon.json ] || ! grep -q '"max-size"' /etc/docker/daemon.json 2>/dev/null; then
    echo "Configuring Docker log rotation..."
    sudo mkdir -p /etc/docker
    sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    sudo systemctl restart docker
fi

# Enable and configure Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable

# fail2ban — the box has root SSH open to the internet; ban repeated failed
# login attempts. Set explicitly rather than relying on the package default.
if [ ! -f /etc/fail2ban/jail.local ]; then
    sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[sshd]
enabled = true
EOF
fi
sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban

# Disable SSH password auth — deploy already authenticates via SERVER_SSH_KEY,
# so nothing depends on password login, and leaving it enabled is a needless
# brute-force surface.
if ! grep -qE '^\s*PasswordAuthentication\s+no' /etc/ssh/sshd_config; then
    echo "Disabling SSH password authentication..."
    sudo sed -i -E 's/^\s*#?\s*PasswordAuthentication\s+.*/PasswordAuthentication no/' /etc/ssh/sshd_config
    grep -qE '^\s*PasswordAuthentication\s+no' /etc/ssh/sshd_config || \
      echo "PasswordAuthentication no" | sudo tee -a /etc/ssh/sshd_config > /dev/null
    sudo systemctl reload ssh
fi

# 2GB swap file — cheap insurance against memory pressure (container restarts,
# traffic spikes) regardless of how much RAM is provisioned.
if [ ! -f /swapfile ] && ! swapon --show | grep -q .; then
    echo "Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
    sudo sysctl -w vm.swappiness=10
    grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf > /dev/null
fi

echo "Bootstrap complete!"
