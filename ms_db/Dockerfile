FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Copy entrypoint that waits for Postgres, runs init and starts the app
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 4002

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
CMD ["node", "server.js"]
