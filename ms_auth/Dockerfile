FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar package.json e instalar dependencias
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

# Copiar el código fuente
COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
