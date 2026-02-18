#!/bin/bash
# Build shared package first
cd ..
npm install
cd shared
npm run build
cd ../web
npm install
npm run build
