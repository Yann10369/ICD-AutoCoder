# Build stage
# Using official source (will use Docker Desktop mirror if configured)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Using npm install instead of npm ci since package-lock.json may not exist
RUN npm install

# Copy source code
COPY . .

# Move index.html from public to root (Vite requires it in root)
RUN cp public/index.html ./index.html

# Build the application
RUN npm run build

# Production stage
# Using official source (will use Docker Desktop mirror if configured)
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

