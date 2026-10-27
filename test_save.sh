#!/bin/bash
cd backend
go build -o server ./cmd/api
./server &
PID=$!
sleep 2

# We need an access token to create an article.
# Since we don't have one easily, let's check the code for syntax issues.
kill $PID
