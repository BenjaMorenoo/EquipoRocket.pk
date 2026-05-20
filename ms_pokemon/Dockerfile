FROM node:18-slim
WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

# Copy source
COPY . .

EXPOSE 3002
CMD ["node", "server.js"]
