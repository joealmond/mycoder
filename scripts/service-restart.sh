#!/bin/bash
# Restart the ticket processor service

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - use systemd
    systemctl --user restart ticket-processor
    echo "✓ Service restarted"
    systemctl --user status ticket-processor --no-pager
else
    # macOS - use PM2
    pm2 restart ticket-processor
    pm2 logs ticket-processor
fi
