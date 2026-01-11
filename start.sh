#!/bin/bash

# Navigate to app directory  
cd "$(dirname "$0")"

# Start the bot with node directly
exec node src/index.js

