# Dockerfile pour le Gateway Express
FROM node:18-alpine

# Installer curl pour le healthcheck
RUN apk add --no-cache curl

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 8080

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changer la propriété des fichiers
RUN chown -R nextjs:nodejs /app
USER nextjs

# Démarrer l'application
CMD ["npm", "start"]