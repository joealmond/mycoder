#!/bin/bash
# Stop the ticket processor service

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - use systemd
    systemctl --user stop ticket-processor
    echo "✓ Service stopped"
else
    # macOS - use PM2
    pm2 stop ticket-processor
    echo "✓ Service stopped"
fi
