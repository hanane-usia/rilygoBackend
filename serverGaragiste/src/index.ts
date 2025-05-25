/** @format */
// index.ts - Application complète pour garagistes et garages
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import garagisteRoutes from "./routes/garagisteRoutes";
import garageRoutes from "./routes/GarageRoutes";
import categoryRoutes from "./routes/CategoryRoutes";
import garagesSearchRoutes from "./routes/GaragesSearchRoutes";
import garageImagesRoutes from "./routes/Garage-imagesRoutes";
import pool from "./db/pgDB";
import { specs } from "./docs/swagers";

const app = express();
// pour documntation de l'api DPAR SWAGER
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "API Garages - Documentation",
  }),
);
// Middleware
app.use(cors());
app.use(express.json());

// Middleware pour gérer les erreurs async
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// /setup pour setup la base de données complète
app.get(
  "/setup",
  asyncHandler(async (req: any, res: any) => {
    try {
      console.log("🔧 Début de la configuration de la base de données...");

      // 1. Créer la fonction pour mettre à jour updatedAt EN PREMIER
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updatedAt = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // 2. Créer la table garagiste
      await pool.query(`
        CREATE TABLE IF NOT EXISTS garagiste (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            profileImage VARCHAR(500),
            deplomeImage VARCHAR(500),
            createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. Créer la table categories
      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 4. Créer la table subcategories
      await pool.query(`
        CREATE TABLE IF NOT EXISTS subcategories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, category_id)
        );
      `);

      // 5. Créer la table garages (MISE À JOUR avec image principale)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS garages (
            id SERIAL PRIMARY KEY,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
            capacity INTEGER NOT NULL CHECK (capacity > 0),
            isDisponible BOOLEAN DEFAULT TRUE,
            name VARCHAR(255),
            address TEXT,
            phone VARCHAR(50),
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            main_image VARCHAR(500),
            description TEXT,
            createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 6. Créer la table garage_subcategories
      await pool.query(`
        CREATE TABLE IF NOT EXISTS garage_subcategories (
            id SERIAL PRIMARY KEY,
            garage_id INTEGER NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
            subcategory_id INTEGER NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(garage_id, subcategory_id)
        );
      `);

      // 7. Créer la table garage_images pour les galeries d'images
      await pool.query(`
        CREATE TABLE IF NOT EXISTS garage_images (
            id SERIAL PRIMARY KEY,
            garage_id INTEGER NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
            image_url VARCHAR(500) NOT NULL,
            is_featured BOOLEAN DEFAULT FALSE,
            title VARCHAR(255),
            alt_text VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 8. Créer les triggers pour toutes les tables
      const tables = [
        { table: "garagiste", trigger: "update_garagiste_updated_at" },
        { table: "categories", trigger: "update_categories_updated_at" },
        { table: "subcategories", trigger: "update_subcategories_updated_at" },
        { table: "garages", trigger: "update_garages_updated_at" },
        { table: "garage_images", trigger: "update_garage_images_updated_at" },
      ];

      for (const { table, trigger } of tables) {
        await pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${trigger}') THEN
              CREATE TRIGGER ${trigger}
              BEFORE UPDATE ON ${table}
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
            END IF;
          END
          $$;
        `);
      }

      // 9. Créer les index
      await pool.query(`
        -- Index pour garagiste
        CREATE INDEX IF NOT EXISTS idx_garagiste_email ON garagiste(email);
        CREATE INDEX IF NOT EXISTS idx_garagiste_name ON garagiste(name);
        
        -- Index pour categories
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
        
        -- Index pour subcategories
        CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
        CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name);
        
        -- Index pour garages
        CREATE INDEX IF NOT EXISTS idx_garages_category_id ON garages(category_id);
        CREATE INDEX IF NOT EXISTS idx_garages_isDisponible ON garages(isDisponible);
        CREATE INDEX IF NOT EXISTS idx_garages_capacity ON garages(capacity);
        CREATE INDEX IF NOT EXISTS idx_garages_location ON garages(latitude, longitude);
        
        -- Index pour garage_subcategories
        CREATE INDEX IF NOT EXISTS idx_garage_subcategories_garage_id ON garage_subcategories(garage_id);
        CREATE INDEX IF NOT EXISTS idx_garage_subcategories_subcategory_id ON garage_subcategories(subcategory_id);
        
        -- Index pour garage_images
        CREATE INDEX IF NOT EXISTS idx_garage_images_garage_id ON garage_images(garage_id);
        CREATE INDEX IF NOT EXISTS idx_garage_images_is_featured ON garage_images(is_featured);
      `);

      // 10. Insérer les données de test pour les catégories
      await pool.query(`
        INSERT INTO categories (name, description) VALUES
        ('Visite Technique', 'Services de réparation et maintenance mécanique'),
        ('Lavage', 'Services de lavage automobile'),
        ('Vidange', 'Services de vidange et entretien général'),
        ('Pneumatiques', 'Services de pneumatiques et jantes'),
        ('Bris de glace', 'Services de réparation de bris de glace'),
        ('Autre', 'Autre')
        ON CONFLICT (name) DO NOTHING;
      `);

      // 11. Insérer les sous-catégories
      await pool.query(`
        INSERT INTO subcategories (name, description, category_id) VALUES
        -- Visite Technique (category_id: 1)
        ('Test de suspension', 'Test de suspension', 1),
        ('Test de freinage', 'Test de freinage', 1),
        ('inspection de securite', 'inspection de securite', 1),
        ('controle des emissions', 'controle des emissions', 1),
        ('controle des lumières', 'controle des lumières', 1),
        ('Autre', 'Autre', 1),

        -- Lavage (category_id: 2)
        ('Lavage interieur', 'Lavage interieur', 2),
        ('Lavage exterieur', 'Lavage exterieur', 2),
        ('Nettoyage moteur', 'Nettoyage moteur', 2),
        ('Lavage complet', 'lavage complet', 2),
        ('Cire de polissage', 'cire de polissage', 2),
        ('Autre', 'Autre', 2),

        -- Vidange (category_id: 3)
        ('Vidange du liquide de frein', 'Vidange du liquide de frein', 3),
        ('Vidange du boite de vitesses', 'Vidange du boite de vitesses', 3),
        ('Vidange d''huile', 'Vidange d''huile', 3),
        ('Remplacement du filtre à air', 'Remplacement du filtre à air', 3),
        ('Verification des fluides', 'Verification des fluides', 3),
        ('Autre', 'Autre', 3),

        -- Pneumatiques (category_id: 4)
        ('Rotation des pneus', 'Rotation des pneus', 4),
        ('Équilibrage', 'Équilibrage des roues', 4),
        ('Parallélisme', 'Réglage du parallélisme', 4),
        ('Changement de pneus', 'Changement de pneus', 4),
        ('Réparation', 'Réparation de pneus', 4),
        ('Autre', 'Autre', 4),

        -- Bris de glace (category_id: 5)
        ('Reparation d''impacts', 'Reparation d''impacts', 5),
        ('Reparation de glace', 'Reparation de glace', 5),
        ('Remplacement de glace', 'Remplacement de glace', 5),
        ('Teintage de Vitres', 'Teintage de Vitres', 5),
        ('Autre', 'Autre', 5)
        ON CONFLICT (name, category_id) DO NOTHING;
      `);

      // 12. Insérer quelques garagistes de test
      await pool.query(`
        INSERT INTO garagiste (name, email, password, phone) VALUES
        ('Ahmed Mechanic', 'ahmed@garage.com', 'password123', '+212600123456'),
        ('Mohamed Expert', 'mohamed@auto.com', 'password456', '+212611234567'),
        ('Youssef Pro', 'youssef@repair.com', 'password789', '+212622345678')
        ON CONFLICT (email) DO NOTHING;
      `);

      // 13. Insérer quelques garages de test (avec images principales)
      await pool.query(`
        INSERT INTO garages (category_id, capacity, isDisponible, name, address, phone, latitude, longitude, main_image, description) VALUES
        (1, 5, true, 'Garage Mécanique Pro', '123 Rue de la Mécanique, Casablanca', '+212522123456', 33.5731, -7.5898, 'https://example.com/images/garage1_main.jpg', 'Centre technique spécialisé dans les contrôles mécaniques et visites techniques officielles.'),
        (2, 4, true, 'Carrosserie Elite', '456 Avenue Hassan II, Rabat', '+212537789012', 34.0209, -6.8416, 'https://example.com/images/garage2_main.jpg', 'Service de lavage premium avec équipements modernes et produits écologiques.'),
        (3, 3, false, 'Électro Auto Services', '789 Boulevard Zerktouni, Casablanca', '+212522345678', 33.5992, -7.6327, 'https://example.com/images/garage3_main.jpg', 'Spécialiste de la vidange et de l''entretien général des véhicules toutes marques.'),
        (4, 6, true, 'Pneus Plus', '321 Rue Moulay Youssef, Marrakech', '+212524567890', 31.6295, -7.9811, 'https://example.com/images/garage4_main.jpg', 'Vente et installation de pneumatiques avec service d''équilibrage et de parallélisme.'),
        (5, 8, true, 'Entretien Express', '654 Avenue Mohammed V, Fès', '+212535901234', 34.0372, -5.0003, 'https://example.com/images/garage5_main.jpg', 'Réparation et remplacement de vitres et pare-brise avec garantie d''étanchéité.')
        ON CONFLICT DO NOTHING;
      `);

      // 14. Insérer les galeries d'images pour chaque garage
      await pool.query(`
        INSERT INTO garage_images (garage_id, image_url, is_featured, title, alt_text) VALUES
        -- Images pour Garage Mécanique Pro
        (1, 'https://example.com/images/garage1/image1.jpg', true, 'Accueil', 'Accueil du Garage Mécanique Pro'),
        (1, 'https://example.com/images/garage1/image2.jpg', false, 'Équipement', 'Équipement de diagnostic avancé'),
        (1, 'https://example.com/images/garage1/image3.jpg', false, 'Atelier', 'Atelier de réparation'),
        
        -- Images pour Carrosserie Elite
        (2, 'https://example.com/images/garage2/image1.jpg', true, 'Station de lavage', 'Station de lavage automatique'),
        (2, 'https://example.com/images/garage2/image2.jpg', false, 'Lavage intérieur', 'Service de nettoyage intérieur'),
        (2, 'https://example.com/images/garage2/image3.jpg', false, 'Polissage', 'Service de polissage professionnel'),
        
        -- Images pour Électro Auto Services
        (3, 'https://example.com/images/garage3/image1.jpg', true, 'Station vidange', 'Station de vidange moderne'),
        (3, 'https://example.com/images/garage3/image2.jpg', false, 'Stockage huiles', 'Zone de stockage des huiles'),
        (3, 'https://example.com/images/garage3/image3.jpg', false, 'Analyse fluides', 'Équipement d''analyse des fluides'),
        
        -- Images pour Pneus Plus
        (4, 'https://example.com/images/garage4/image1.jpg', true, 'Stock pneus', 'Large stock de pneus disponibles'),
        (4, 'https://example.com/images/garage4/image2.jpg', false, 'Équilibrage', 'Machine d''équilibrage numérique'),
        (4, 'https://example.com/images/garage4/image3.jpg', false, 'Montage', 'Zone de montage de pneus'),
        
        -- Images pour Entretien Express
        (5, 'https://example.com/images/garage5/image1.jpg', true, 'Atelier vitres', 'Atelier de réparation de vitres'),
        (5, 'https://example.com/images/garage5/image2.jpg', false, 'Stock pare-brises', 'Stock de pare-brises pour différents modèles'),
        (5, 'https://example.com/images/garage5/image3.jpg', false, 'Réparation', 'Réparation d''impact sur pare-brise')
        ON CONFLICT DO NOTHING;
      `);

      // 15. Insérer les relations garage-subcategories
      await pool.query(`
        INSERT INTO garage_subcategories (garage_id, subcategory_id) VALUES
        -- Garage Mécanique Pro (services mécaniques)
        (1, 1), (1, 2), (1, 3),
        -- Carrosserie Elite (services carrosserie)
        (2, 7), (2, 8), (2, 10),
        -- Électro Auto Services (services électroniques)
        (3, 13), (3, 14), (3, 15),
        -- Pneus Plus (services pneumatiques)
        (4, 19), (4, 20), (4, 21),
        -- Entretien Express (entretien général)
        (5, 25), (5, 26), (5, 27)
        ON CONFLICT (garage_id, subcategory_id) DO NOTHING;
      `);

      console.log(
        "✅ Configuration de la base de données terminée avec succès",
      );

      res.status(200).json({
        message:
          "Configuration de la base de données réussie pour toutes les tables",
        tables_created: [
          "garagiste",
          "categories",
          "subcategories",
          "garages",
          "garage_subcategories",
          "garage_images",
        ],
        triggers_created: [
          "update_garagiste_updated_at",
          "update_categories_updated_at",
          "update_subcategories_updated_at",
          "update_garages_updated_at",
          "update_garage_images_updated_at",
        ],
        indexes_created: [
          "idx_garagiste_email",
          "idx_garagiste_name",
          "idx_categories_name",
          "idx_subcategories_category_id",
          "idx_garages_category_id",
          "idx_garages_isDisponible",
          "idx_garages_capacity",
          "idx_garages_location",
          "idx_garage_images_garage_id",
          "idx_garage_images_is_featured",
        ],
        test_data: {
          categories: 6,
          subcategories: 30,
          garagistes: 3,
          garages: 5,
          garage_subcategory_relations: 15,
          garage_images: 15,
        },
      });
    } catch (error) {
      console.error("❌ Erreur lors de la configuration :", error);
      res.status(500).json({
        message: "Erreur lors de la configuration de la base de données",
        error: (error as Error).message,
      });
    }
  }),
);

// Test endpoint pour vérifier les tables
app.get(
  "/check-tables",
  asyncHandler(async (req: any, res: any) => {
    try {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      // Compter les enregistrements dans chaque table
      const counts = {};
      for (const row of result.rows) {
        try {
          const countResult = await pool.query(
            `SELECT COUNT(*) FROM ${row.table_name}`,
          );
          (counts as any)[row.table_name] = parseInt(countResult.rows[0].count);
        } catch (err) {
          (counts as any)[row.table_name] = "Error";
        }
      }

      res.status(200).json({
        message: "Tables dans la base de données :",
        tables: result.rows.map((row: any) => row.table_name),
        record_counts: counts,
      });
    } catch (error) {
      console.error("Erreur lors de la vérification des tables :", error);
      res.status(500).json({
        message: "Erreur lors de la vérification des tables",
        error: (error as Error).message,
      });
    }
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Garage Management API",
    timestamp: new Date().toISOString(),
    port: PORT,
    version: "1.0.0",
    features: [
      "Garagistes",
      "Garages",
      "Categories",
      "Subcategories",
      "Géolocalisation",
      "Galeries d'images",
    ],
  });
});

// Endpoint pour obtenir un aperçu rapide des données
app.get(
  "/overview",
  asyncHandler(async (req: any, res: any) => {
    try {
      const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM garagiste) as total_garagistes,
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM subcategories) as total_subcategories,
        (SELECT COUNT(*) FROM garages) as total_garages,
        (SELECT COUNT(*) FROM garages WHERE isDisponible = true) as available_garages,
        (SELECT COUNT(*) FROM garage_images) as total_garage_images
    `);

      const recentGarages = await pool.query(`
      SELECT g.id, g.name, g.capacity, g.isDisponible, c.name as category_name,
             g.latitude, g.longitude, g.main_image, g.description,
             (SELECT COUNT(*) FROM garage_images gi WHERE gi.garage_id = g.id) as image_count
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      ORDER BY g.createdAt DESC
      LIMIT 5
    `);

      res.status(200).json({
        message: "Aperçu du système",
        statistics: stats.rows[0],
        recent_garages: recentGarages.rows,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Erreur lors de la récupération de l'aperçu",
        error: error.message,
      });
    }
  }),
);

// Routes
app.use("/api", garagisteRoutes);
app.use("/api", garageRoutes);
app.use("/api", categoryRoutes);
app.use("/api", garagesSearchRoutes);
app.use("/api", garageImagesRoutes);

// Middleware de gestion d'erreurs global
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    message: "Une erreur interne du serveur s'est produite",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// 404 handler avec routes mises à jour
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route non trouvée",
    availableRoutes: [
      "GET /health - Status de l'API",
      "GET /setup - Configuration de la base de données",
      "GET /check-tables - Vérifier les tables",
      "GET /overview - Aperçu du système",
      "",
      "=== GARAGISTES ===",
      "POST /api/garagistes - Créer un garagiste",
      "GET /api/garagistes - Lister les garagistes",
      "GET /api/garagistes/:id - Un garagiste",
      "PUT /api/garagistes/:id - Modifier un garagiste",
      "DELETE /api/garagistes/:id - Supprimer un garagiste",
      "POST /api/garagistes/login - Connexion",
      "",
      "=== GARAGES ===",
      "POST /api/garages - Créer un garage",
      "GET /api/garages - Lister les garages",
      "GET /api/garages/:id - Un garage",
      "PUT /api/garages/:id - Modifier un garage",
      "DELETE /api/garages/:id - Supprimer un garage",
      "GET /api/garages/category/:categoryId - Garages par catégorie",
      "GET /api/garages/subcategory/:subcategoryId - Garages par sous-catégorie",
      "",
      "=== IMAGES DE GARAGE ===",
      "POST /api/garages/:garageId/images - Ajouter une image à un garage",
      "GET /api/garages/:garageId/images - Obtenir toutes les images d'un garage",
      "PUT /api/garages/:garageId/images/:imageId - Modifier une image",
      "DELETE /api/garages/:garageId/images/:imageId - Supprimer une image",
      "",
      "=== RECHERCHE GÉOLOCALISÉE ===",
      "GET /api/search/subcategory/:subcategoryId/location/:latitude/:longitude/:radiusZone - Recherche par sous-catégorie et localisation",
      "GET /api/search/category/:categoryId/location/:latitude/:longitude/:radiusZone - Recherche par catégorie et localisation",
      "",
      "=== CATÉGORIES ===",
      "GET /api/categories - Toutes les catégories",
      "GET /api/categories/:id - Une catégorie",
      "GET /api/subcategories - Toutes les sous-catégories",
      "GET /api/subcategories/:id - Une sous-catégorie",
    ],
  });
});

const PORT = process.env.PORT || 5001;

const start = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`✅ Garage Management Server is running on port ${PORT}`);
      console.log(`🏥 Health check: GET http://localhost:${PORT}/health`);
      console.log(`📊 Overview: GET http://localhost:${PORT}/overview`);
      console.log(`🔧 Setup database: GET http://localhost:${PORT}/setup`);
      console.log(`📋 Check tables: GET http://localhost:${PORT}/check-tables`);
      console.log(`🚗 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔗 Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.log("❌ Error starting server:", error);
  }
};

start();

export default app;
