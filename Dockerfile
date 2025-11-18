# Use official Node.js runtime as base image
FROM node:18-alpine

# Expose app port 
EXPOSE 3001

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy app code
COPY . .

# Start app
CMD ["npm", "start"]
