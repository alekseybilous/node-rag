FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]