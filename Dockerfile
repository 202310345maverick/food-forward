# Use Node 20 LTS for stability with Next.js
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies first (better cache usage)
COPY package*.json ./
RUN npm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 4000

# Start the app
CMD ["npm", "start"]
