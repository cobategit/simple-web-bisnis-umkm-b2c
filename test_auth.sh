#!/bin/bash
# Stop on error
set -e

# Run DB and Server in background
cd backend
go build -o server ./cmd/api
./server &
SERVER_PID=$!
sleep 2

# Create a test user directly in DB
# Wait, we need the DB running. I assume it's running because VITE_API_URL etc. implies the user is developing.
# Actually I can just curl the /health to see if it's running
curl -s http://localhost:8080/health
echo

# Try login
# Let's see if we can just test the Set-Cookie header.
# We don't have a user, so we will get 401, but does it return a cookie?
# No, it returns 401 before setting the cookie.

kill $SERVER_PID
