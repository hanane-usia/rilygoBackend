# ecrire dockerfile for my server 
FROM node:16
WORKDIR /app/server
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 1337
CMD ["npm", "run", "dev"]