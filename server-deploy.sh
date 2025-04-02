#!/bin/bash

echo "===== UPDATING SERVER FROM GITHUB ====="

# Navigate to project directory
cd ~/exterrn-mvp

# Pull latest changes
git pull

# Restart Docker containers
echo "===== RESTARTING DOCKER CONTAINERS ====="
docker-compose down
docker-compose up --build -d

echo "===== SERVER UPDATE COMPLETE ====="
