#!/bin/bash

# Script to update the lg CLI tool

echo "Updating lg CLI tool..."

# Build the project
echo "Building project..."
npm run build

# Unlink the global package if it exists
echo "Unlinking global package..."
npm unlink -g lg 2>/dev/null || true

# Link the package globally
echo "Linking package globally..."
npm link

echo "lg CLI tool has been updated successfully!"
echo "You can now use the 'lg' command in your terminal." 