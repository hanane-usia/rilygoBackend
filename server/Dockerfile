# Dockerfile pour le serveur Rilygo Backend (TypeScript)
FROM node:18-alpine

# Installer curl pour le healthcheck
RUN apk add --no-cache curl

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour TypeScript)
RUN npm ci

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Supprimer les devDependencies après compilation pour réduire la taille
RUN npm prune --production

# Exposer le port
EXPOSE 3000

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changer la propriété des fichiers
RUN chown -R nextjs:nodejs /app
USER nextjs

# Démarrer l'application
CMD ["npm", "start"]