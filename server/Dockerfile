FROM node:latest

RUN mkdir -p /opt/wallet-service/server
WORKDIR /opt/wallet-service/server

COPY ./index.js ./

COPY package.json package-lock.json ./
RUN yarn install

ENTRYPOINT yarn start
