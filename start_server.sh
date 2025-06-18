#!/bin/bash

# Replace environment variable in config.js
sed "s/\$CHUTES_API_KEY/$CHUTES_API_KEY/g" config.js > config_runtime.js

# Start the HTTP server
python -m http.server 5000