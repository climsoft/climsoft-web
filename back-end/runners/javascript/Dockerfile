FROM node:20-slim

WORKDIR /app

# Install runner dependencies from the committed lockfile. User-adapter
# dependencies are NOT installed here — they are installed lazily into
# per-script node_modules at first run, cached under <scriptDir>/.installed/.
COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js .

EXPOSE 5103

CMD ["node", "server.js"]
