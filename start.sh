#!/bin/bash

# Navigate to app directory  
cd "$(dirname "$0")"

# Start the bot with npx (works on Railway with Nixpacks)
exec npx --yes node src/index.js

