#!/bin/bash
# This script sets up the React project
npx create-react-app .
npm install axios tailwindcss@3.3.3 @headlessui/react lucide-react

# Set up Tailwind CSS
npx tailwindcss init -p