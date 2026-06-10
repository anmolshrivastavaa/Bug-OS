# Start from official Playwright image
# Using a specific version tag (v1.40.0-jammy) as 'latest' is not provided by Microsoft for this repo
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# Switch to root to install packages
USER root

# Install Python 3, Java JDK, and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# Install required Python packages for selenium and playwright
# We use --break-system-packages for environments like this container where we want globally available packages
RUN pip3 install selenium playwright requests

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code (temp, videos, node_modules etc are excluded by .dockerignore)
COPY . .

# Ensure temp and videos directories exist with proper permissions for runtime execution
RUN mkdir -p temp public/videos && chmod -R 777 temp public/videos

# Expose the application port
EXPOSE 3000

# Start BugOS
CMD ["npm", "start"]
