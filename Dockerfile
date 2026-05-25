FROM node:20-bullseye-slim

# Install system dependencies (including ffmpeg and build tools for native packages)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    graphicsmagick \
    webp \
    git \
    python3 \
    make \
    g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy all application files (pre-obfuscated)
COPY . .

# Expose HTTP port for health checks
EXPOSE 8000

# Start command
CMD ["node", "index.js"]
