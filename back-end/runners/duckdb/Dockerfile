FROM node:20-slim

WORKDIR /app

# Install runner dependencies from the committed lockfile. User-adapter
# DuckDB extensions are NOT installed here — they are declared in the
# adapter's extensions.txt manifest and installed lazily by the runner at
# first run, cached under <scriptDir>/.installed/.
COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js .

EXPOSE 5104

CMD ["node", "server.js"]
