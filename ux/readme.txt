### DEPLOY WITH PM2

pm2 list               # See what's running
pm2 logs              # See logs
pm2 restart server    # Restart your app
pm2 stop server      # Stop your app
pm2 delete server    # Remove app from PM2

# Generate startup script (this detects your platform - Ubuntu, etc)
pm2 startup

# Save your current process list (your server.js)
pm2 save

pm2 restart server # restart

pm2 monit            # Shows real-time monitoring

$ pm2 unstartup systemd

while true; do python3 clientBot.py; done