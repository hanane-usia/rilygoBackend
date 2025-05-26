#!/bin/bash
# deploy.sh - Script de déploiement automatique

echo "🚀 Déploiement de l'application Rilygo"

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

echo "✅ Docker et Docker Compose sont installés"

# Créer les dossiers nécessaires
echo "📁 Création de la structure des dossiers..."
mkdir -p init-scripts/rilygo
mkdir -p init-scripts/garagiste
mkdir -p logs

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down

# Supprimer les images existantes (optionnel)
read -p "Voulez-vous reconstruire les images Docker ? (y/N): " rebuild
if [[ $rebuild =~ ^[Yy]$ ]]; then
    echo "🔨 Reconstruction des images..."
    docker-compose build --no-cache
fi

# Démarrer les services
echo "🚀 Démarrage des services..."
docker-compose up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 30

# Vérifier le statut des services
echo "📊 Statut des services:"
docker-compose ps

# Afficher les logs
echo "📋 Logs des services (Ctrl+C pour quitter):"
docker-compose logs -f

# Scripts utiles supplémentaires

# stop.sh
cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Arrêt de tous les services Rilygo"
docker-compose down
echo "✅ Services arrêtés"
EOF

# restart.sh
cat > restart.sh << 'EOF'
#!/bin/bash
echo "🔄 Redémarrage des services Rilygo"
docker-compose restart
echo "✅ Services redémarrés"
EOF

# logs.sh
cat > logs.sh << 'EOF'
#!/bin/bash
if [ -z "$1" ]; then
    echo "📋 Logs de tous les services:"
    docker-compose logs -f
else
    echo "📋 Logs du service $1:"
    docker-compose logs -f $1
fi
EOF

# backup.sh
cat > backup.sh << 'EOF'
#!/bin/bash
echo "💾 Sauvegarde des bases de données"
DATE=$(date +%Y%m%d_%H%M%S)

# Sauvegarde Rilygo
docker exec postgres-rilygo pg_dump -U postgres Rilygo > backup_rilygo_$DATE.sql
echo "✅ Sauvegarde Rilygo créée: backup_rilygo_$DATE.sql"

# Sauvegarde Garagiste
docker exec postgres-garagiste pg_dump -U postgres rilygoGaragiste > backup_garagiste_$DATE.sql
echo "✅ Sauvegarde Garagiste créée: backup_garagiste_$DATE.sql"
EOF

# Rendre les scripts exécutables
chmod +x stop.sh restart.sh logs.sh backup.sh

echo "✅ Scripts de gestion créés:"
echo "  - ./stop.sh : Arrêter tous les services"
echo "  - ./restart.sh : Redémarrer tous les services"  
echo "  - ./logs.sh [service] : Voir les logs"
echo "  - ./backup.sh : Sauvegarder les bases de données"