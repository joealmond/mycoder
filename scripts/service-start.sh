#!/bin/bash
# Start the ticket processor service

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - use systemd
    systemctl --user start ticket-processor
    echo "✓ Service started"
    systemctl --user status ticket-processor --no-pager
else
    # macOS - use PM2
    pm2 start ecosystem.config.js
    pm2 logs ticket-processor
fi
