#!/bin/bash

# Remove old locks
rm -f /tmp/.X99-lock

# Start Xvfb
Xvfb :99 -screen 0 1280x1024x24 &
sleep 2

# Start Window Manager
fluxbox &

# Start VNC Server
x11vnc -display :99 -forever -passwd "$VNC_PASSWORD" -bg -o /var/log/x11vnc.log

# Start Node Application
echo "Starting Medico Finder..."
npm start
