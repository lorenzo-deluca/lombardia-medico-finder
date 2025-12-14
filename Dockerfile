FROM node:18-slim

# Install dependencies for Chrome and VNC
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    xvfb \
    x11vnc \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

# Install Chromium (works on both AMD64 and ARM64)
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install Node dependencies including devDependencies for building
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install

# Copy application source
COPY . .

# Build TypeScript
RUN npm run build

# Create directory for cookies and screenshots
RUN mkdir -p cookies screenshots logs

# Set environment variables
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose VNC port
EXPOSE 5900

# Start script
COPY start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
