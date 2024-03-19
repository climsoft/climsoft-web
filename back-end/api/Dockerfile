# Build stage
FROM node:21-alpine3.18
WORKDIR /app
COPY package*.json .
RUN npm install

# Execute npm run build first and only copy file inside the dist folder only?
COPY . . 
CMD [ "npm", "run", "start:prod" ]
# Then execute commands for typeorm migrations? 