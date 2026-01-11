# Dockerfile untuk Railway dengan Node.js
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY start.sh ./
COPY railway.json ./

# Make start.sh executable
RUN chmod +x start.sh

# Expose port ( Railway akan overwrite ini)
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start command - Railway akan override dengan startCommand
CMD ["node", "src/index.js"]
