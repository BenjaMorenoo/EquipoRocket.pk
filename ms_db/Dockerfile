FROM node:18-slim

# Instalamos dos2unix para limpiar los saltos de línea de Windows (\r)
RUN apt-get update && apt-get install -y dos2unix && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Copy entrypoint that waits for Postgres, runs init and starts the app
COPY entrypoint.sh ./entrypoint.sh

# Limpiamos el archivo con dos2unix y luego le damos permisos de ejecución
RUN dos2unix ./entrypoint.sh && chmod +x ./entrypoint.sh

EXPOSE 4002

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
CMD ["node", "server.js"]