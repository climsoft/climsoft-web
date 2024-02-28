FROM node:21-alpine3.18 AS build-stage
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build --prod

FROM nginx:1.25.4-alpine
COPY --from=build-stage /app/dist/pwa /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]