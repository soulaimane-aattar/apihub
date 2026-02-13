FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npm run prisma:generate
RUN npx prisma --version

COPY src ./src

EXPOSE 3000

CMD ["sh", "-c", "npm run migrate:deploy && npm start"]
