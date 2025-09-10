# Use official Node.js image as the base
FROM node:18-alpine

RUN apk update && apk add --no-cache bash


# Set working directory
WORKDIR /src

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Build Next.js for production
RUN npm run build

# Expose port
EXPOSE 4001

# Start the app
CMD ["npm", "run", "start"]
