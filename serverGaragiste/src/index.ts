/** @format */
// index.ts - Application complète pour garagistes et garages
import dotenv from "dotenv";
import axios from "axios";

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

// ===== MIDDLEWARE =====

// Documentation API avec Swagger
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "API Garages - Documentation",
  }),
);

// Middleware de base
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware pour les logs des requêtes
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📝 [${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Middleware pour gérer les erreurs async
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ===== ENDPOINTS DE CONFIGURATION =====

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
            isActive BOOLEAN DEFAULT TRUE,
            lastLogin TIMESTAMPTZ,
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
            icon VARCHAR(255),
            color VARCHAR(7),
            isActive BOOLEAN DEFAULT TRUE,
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
            icon VARCHAR(255),
            estimated_duration INTEGER DEFAULT 60,
            isActive BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, category_id)
        );
      `);

      // 5. Créer la table garages (MISE À JOUR avec plus de champs)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS garages (
            id SERIAL PRIMARY KEY,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
            capacity INTEGER NOT NULL CHECK (capacity > 0),
            isDisponible BOOLEAN DEFAULT TRUE,
            name VARCHAR(255) NOT NULL,
            address TEXT,
            phone VARCHAR(50),
            email VARCHAR(255),
            website VARCHAR(255),
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            main_image VARCHAR(500),
            description TEXT,
            opening_hours JSONB,
            rating DECIMAL(3,2) DEFAULT 0.0,
            total_reviews INTEGER DEFAULT 0,
            is_verified BOOLEAN DEFAULT FALSE,
            is_premium BOOLEAN DEFAULT FALSE,
            garagiste_id INTEGER REFERENCES garagiste(id) ON DELETE SET NULL,
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
            price DECIMAL(10,2),
            estimated_duration INTEGER DEFAULT 60,
            is_available BOOLEAN DEFAULT TRUE,
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
            image_type VARCHAR(50) DEFAULT 'general',
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 8. Créer la table booking pour les réservations
      await pool.query(`
        CREATE TABLE IF NOT EXISTS booking (
            id SERIAL PRIMARY KEY,
            garageId INTEGER NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
            subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
            customer_name VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(50) NOT NULL,
            customer_email VARCHAR(255),
            vehicle_brand VARCHAR(100),
            vehicle_model VARCHAR(100),
            vehicle_year INTEGER,
            vehicle_plate VARCHAR(20),
            reservedAt TIMESTAMPTZ NOT NULL,
            estimated_duration INTEGER DEFAULT 60,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
            notes TEXT,
            total_price DECIMAL(10,2),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 9. Créer la table reviews pour les avis
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            garage_id INTEGER NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
            booking_id INTEGER REFERENCES booking(id) ON DELETE SET NULL,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255),
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            is_published BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 10. Créer les triggers pour toutes les tables
      const tables = [
        { table: "garagiste", trigger: "update_garagiste_updated_at" },
        { table: "categories", trigger: "update_categories_updated_at" },
        { table: "subcategories", trigger: "update_subcategories_updated_at" },
        { table: "garages", trigger: "update_garages_updated_at" },
        { table: "garage_images", trigger: "update_garage_images_updated_at" },
        { table: "booking", trigger: "update_booking_updated_at" },
        { table: "reviews", trigger: "update_reviews_updated_at" },
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

      // 11. Créer les index pour optimiser les performances
      await pool.query(`
        -- Index pour garagiste
        CREATE INDEX IF NOT EXISTS idx_garagiste_email ON garagiste(email);
        CREATE INDEX IF NOT EXISTS idx_garagiste_name ON garagiste(name);
        CREATE INDEX IF NOT EXISTS idx_garagiste_isActive ON garagiste(isActive);
        
        -- Index pour categories
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
        CREATE INDEX IF NOT EXISTS idx_categories_isActive ON categories(isActive);
        
        -- Index pour subcategories
        CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
        CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name);
        CREATE INDEX IF NOT EXISTS idx_subcategories_isActive ON subcategories(isActive);
        
        -- Index pour garages
        CREATE INDEX IF NOT EXISTS idx_garages_category_id ON garages(category_id);
        CREATE INDEX IF NOT EXISTS idx_garages_isDisponible ON garages(isDisponible);
        CREATE INDEX IF NOT EXISTS idx_garages_capacity ON garages(capacity);
        CREATE INDEX IF NOT EXISTS idx_garages_location ON garages(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_garages_rating ON garages(rating);
        CREATE INDEX IF NOT EXISTS idx_garages_is_verified ON garages(is_verified);
        CREATE INDEX IF NOT EXISTS idx_garages_garagiste_id ON garages(garagiste_id);
        
        -- Index pour garage_subcategories
        CREATE INDEX IF NOT EXISTS idx_garage_subcategories_garage_id ON garage_subcategories(garage_id);
        CREATE INDEX IF NOT EXISTS idx_garage_subcategories_subcategory_id ON garage_subcategories(subcategory_id);
        CREATE INDEX IF NOT EXISTS idx_garage_subcategories_is_available ON garage_subcategories(is_available);
        
        -- Index pour garage_images
        CREATE INDEX IF NOT EXISTS idx_garage_images_garage_id ON garage_images(garage_id);
        CREATE INDEX IF NOT EXISTS idx_garage_images_is_featured ON garage_images(is_featured);
        CREATE INDEX IF NOT EXISTS idx_garage_images_image_type ON garage_images(image_type);
        
        -- Index pour booking
        CREATE INDEX IF NOT EXISTS idx_booking_garageId ON booking(garageId);
        CREATE INDEX IF NOT EXISTS idx_booking_reservedAt ON booking(reservedAt);
        CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(status);
        CREATE INDEX IF NOT EXISTS idx_booking_customer_phone ON booking(customer_phone);
        
        -- Index pour reviews
        CREATE INDEX IF NOT EXISTS idx_reviews_garage_id ON reviews(garage_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
        CREATE INDEX IF NOT EXISTS idx_reviews_is_published ON reviews(is_published);
      `);

      // 12. Créer une fonction pour calculer la moyenne des notes
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_garage_rating()
        RETURNS TRIGGER AS $$
        BEGIN
          UPDATE garages 
          SET 
            rating = (
              SELECT COALESCE(AVG(rating), 0) 
              FROM reviews 
              WHERE garage_id = COALESCE(NEW.garage_id, OLD.garage_id) 
              AND is_published = true
            ),
            total_reviews = (
              SELECT COUNT(*) 
              FROM reviews 
              WHERE garage_id = COALESCE(NEW.garage_id, OLD.garage_id) 
              AND is_published = true
            )
          WHERE id = COALESCE(NEW.garage_id, OLD.garage_id);
          RETURN COALESCE(NEW, OLD);
        END;
        $$ language 'plpgsql';
      `);

      // 13. Créer le trigger pour mettre à jour automatiquement les notes
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_garage_rating_trigger') THEN
            CREATE TRIGGER update_garage_rating_trigger
            AFTER INSERT OR UPDATE OR DELETE ON reviews
            FOR EACH ROW
            EXECUTE FUNCTION update_garage_rating();
          END IF;
        END
        $$;
      `);

      // 14. Insérer les données de test pour les catégories
      await pool.query(`
        INSERT INTO categories (name, description, icon, color) VALUES
        ('Visite Technique', 'Services de réparation et maintenance mécanique', '🔧', '#FF6B35'),
        ('Lavage', 'Services de lavage automobile', '🚿', '#4ECDC4'),
        ('Vidange', 'Services de vidange et entretien général', '🛢️', '#45B7D1'),
        ('Pneumatiques', 'Services de pneumatiques et jantes', '🛞', '#96CEB4'),
        ('Bris de glace', 'Services de réparation de bris de glace', '🔨', '#FECA57'),
        ('Carrosserie', 'Services de carrosserie et peinture', '🎨', '#FF9FF3'),
        ('Autre', 'Autres services automobiles', '⚙️', '#54A0FF')
        ON CONFLICT (name) DO NOTHING;
      `);

      // 15. Insérer les sous-catégories
      await pool.query(`
        INSERT INTO subcategories (name, description, category_id, icon, estimated_duration) VALUES
        -- Visite Technique (category_id: 1)
        ('Test de suspension', 'Test de suspension', 1, '🔩', 45),
        ('Test de freinage', 'Test de freinage', 1, '🛑', 30),
        ('Inspection de sécurité', 'Inspection de sécurité', 1, '🛡️', 60),
        ('Contrôle des émissions', 'Contrôle des émissions', 1, '💨', 30),
        ('Contrôle des lumières', 'Contrôle des lumières', 1, '💡', 20),
        ('Autre', 'Autre service technique', 1, '⚙️', 60),

        -- Lavage (category_id: 2)
        ('Lavage intérieur', 'Lavage intérieur', 2, '🧽', 45),
        ('Lavage extérieur', 'Lavage extérieur', 2, '🚿', 30),
        ('Nettoyage moteur', 'Nettoyage moteur', 2, '🧼', 60),
        ('Lavage complet', 'Lavage complet', 2, '✨', 90),
        ('Cire de polissage', 'Cire de polissage', 2, '✨', 60),
        ('Autre', 'Autre service de lavage', 2, '🧽', 45),

        -- Vidange (category_id: 3)
        ('Vidange du liquide de frein', 'Vidange du liquide de frein', 3, '🛑', 30),
        ('Vidange de boîte de vitesses', 'Vidange de boîte de vitesses', 3, '⚙️', 45),
        ('Vidange d''huile', 'Vidange d''huile', 3, '🛢️', 30),
        ('Remplacement du filtre à air', 'Remplacement du filtre à air', 3, '🌬️', 20),
        ('Vérification des fluides', 'Vérification des fluides', 3, '🔍', 30),
        ('Autre', 'Autre service de vidange', 3, '🛢️', 45),

        -- Pneumatiques (category_id: 4)
        ('Rotation des pneus', 'Rotation des pneus', 4, '🔄', 30),
        ('Équilibrage', 'Équilibrage des roues', 4, '⚖️', 45),
        ('Parallélisme', 'Réglage du parallélisme', 4, '📐', 60),
        ('Changement de pneus', 'Changement de pneus', 4, '🛞', 45),
        ('Réparation', 'Réparation de pneus', 4, '🔧', 30),
        ('Autre', 'Autre service pneumatique', 4, '🛞', 45),

        -- Bris de glace (category_id: 5)
        ('Réparation d''impacts', 'Réparation d''impacts', 5, '🔨', 45),
        ('Réparation de glace', 'Réparation de glace', 5, '🪟', 60),
        ('Remplacement de glace', 'Remplacement de glace', 5, '🔄', 90),
        ('Teintage de vitres', 'Teintage de vitres', 5, '🕶️', 120),
        ('Autre', 'Autre service vitrage', 5, '🪟', 60),

        -- Carrosserie (category_id: 6)
        ('Réparation de bosses', 'Réparation de bosses', 6, '🔨', 180),
        ('Peinture', 'Service de peinture', 6, '🎨', 240),
        ('Polissage', 'Polissage de carrosserie', 6, '✨', 90),
        ('Débosselage', 'Débosselage sans peinture', 6, '🔧', 120),
        ('Autre', 'Autre service carrosserie', 6, '🎨', 120)
        ON CONFLICT (name, category_id) DO NOTHING;
      `);

      // 16. Insérer quelques garagistes de test
      await pool.query(`
        INSERT INTO garagiste (name, email, password, phone, isActive) VALUES
        ('Ahmed Mechanic', 'ahmed@garage.com', '$2b$10$hashpassword123', '+212600123456', true),
        ('Mohamed Expert', 'mohamed@auto.com', '$2b$10$hashpassword456', '+212611234567', true),
        ('Youssef Pro', 'youssef@repair.com', '$2b$10$hashpassword789', '+212622345678', true),
        ('Fatima Auto', 'fatima@carservice.com', '$2b$10$hashpassword101', '+212633456789', true),
        ('Omar Garage', 'omar@quickfix.com', '$2b$10$hashpassword112', '+212644567890', true)
        ON CONFLICT (email) DO NOTHING;
      `);

      // 17. Insérer des garages de test avec plus de données
      await pool.query(`
        INSERT INTO garages (category_id, capacity, isDisponible, name, address, phone, email, latitude, longitude, main_image, description, garagiste_id, rating, total_reviews, is_verified, opening_hours) VALUES
        (1, 8, true, 'Garage Mécanique Pro', '123 Rue de la Mécanique, Casablanca', '+212522123456', 'contact@mechpro.ma', 33.5731, -7.5898, 'https://example.com/images/garage1_main.jpg', 'Centre technique spécialisé dans les contrôles mécaniques et visites techniques officielles.', 1, 4.5, 127, true, '{"lundi": "08:00-18:00", "mardi": "08:00-18:00", "mercredi": "08:00-18:00", "jeudi": "08:00-18:00", "vendredi": "08:00-18:00", "samedi": "08:00-13:00", "dimanche": "fermé"}'),
        
        (2, 6, true, 'Carrosserie Elite', '456 Avenue Hassan II, Rabat', '+212537789012', 'info@elite-carrosserie.ma', 34.0209, -6.8416, 'https://example.com/images/garage2_main.jpg', 'Service de lavage premium avec équipements modernes et produits écologiques.', 2, 4.2, 89, true, '{"lundi": "07:30-19:00", "mardi": "07:30-19:00", "mercredi": "07:30-19:00", "jeudi": "07:30-19:00", "vendredi": "07:30-19:00", "samedi": "08:00-17:00", "dimanche": "09:00-15:00"}'),
        
        (3, 5, true, 'Électro Auto Services', '789 Boulevard Zerktouni, Casablanca', '+212522345678', 'service@electroauto.ma', 33.5992, -7.6327, 'https://example.com/images/garage3_main.jpg', 'Spécialiste de la vidange et de l''entretien général des véhicules toutes marques.', 3, 4.8, 203, true, '{"lundi": "08:00-18:30", "mardi": "08:00-18:30", "mercredi": "08:00-18:30", "jeudi": "08:00-18:30", "vendredi": "08:00-18:30", "samedi": "08:00-16:00", "dimanche": "fermé"}'),
        
        (4, 10, true, 'Pneus Plus Marrakech', '321 Rue Moulay Youssef, Marrakech', '+212524567890', 'contact@pneusplus.ma', 31.6295, -7.9811, 'https://example.com/images/garage4_main.jpg', 'Vente et installation de pneumatiques avec service d''équilibrage et de parallélisme.', 4, 4.3, 156, true, '{"lundi": "08:00-19:00", "mardi": "08:00-19:00", "mercredi": "08:00-19:00", "jeudi": "08:00-19:00", "vendredi": "08:00-19:00", "samedi": "08:00-18:00", "dimanche": "09:00-16:00"}'),
        
        (5, 4, true, 'Vitrage Express Fès', '654 Avenue Mohammed V, Fès', '+212535901234', 'info@vitrageexpress.ma', 34.0372, -5.0003, 'https://example.com/images/garage5_main.jpg', 'Réparation et remplacement de vitres et pare-brise avec garantie d''étanchéité.', 5, 4.6, 98, true, '{"lundi": "08:30-18:00", "mardi": "08:30-18:00", "mercredi": "08:30-18:00", "jeudi": "08:30-18:00", "vendredi": "08:30-18:00", "samedi": "09:00-17:00", "dimanche": "fermé"}'),
        
        (6, 12, true, 'Carrosserie Moderne', '987 Rue Allal Ben Abdellah, Rabat', '+212537112233', 'contact@carromodern.ma', 34.0181, -6.8342, 'https://example.com/images/garage6_main.jpg', 'Atelier de carrosserie moderne spécialisé dans la réparation et la peinture automobile.', 1, 4.4, 78, false, '{"lundi": "08:00-17:30", "mardi": "08:00-17:30", "mercredi": "08:00-17:30", "jeudi": "08:00-17:30", "vendredi": "08:00-17:30", "samedi": "08:00-15:00", "dimanche": "fermé"}'),
        
        (1, 6, true, 'Auto Contrôle Agadir', '147 Boulevard Mohammed V, Agadir', '+212528334455', 'controle@autoagadir.ma', 30.4278, -9.5981, 'https://example.com/images/garage7_main.jpg', 'Centre de contrôle technique automobile agréé par l''État.', 2, 4.1, 134, true, '{"lundi": "08:00-18:00", "mardi": "08:00-18:00", "mercredi": "08:00-18:00", "jeudi": "08:00-18:00", "vendredi": "08:00-18:00", "samedi": "08:00-14:00", "dimanche": "fermé"}'),
        
        (2, 8, true, 'Lavage Premium Tanger', '258 Avenue des FAR, Tanger', '+212539556677', 'premium@lavagetanger.ma', 35.7595, -5.8340, 'https://example.com/images/garage8_main.jpg', 'Station de lavage premium avec service VIP et produits haut de gamme.', 3, 4.7, 91, true, '{"lundi": "07:00-20:00", "mardi": "07:00-20:00", "mercredi": "07:00-20:00", "jeudi": "07:00-20:00", "vendredi": "07:00-20:00", "samedi": "07:00-20:00", "dimanche": "08:00-18:00"}')
        ON CONFLICT DO NOTHING;
      `);

      // 18. Insérer des galeries d'images plus complètes
      await pool.query(`
        INSERT INTO garage_images (garage_id, image_url, is_featured, title, alt_text, image_type, sort_order) VALUES
        -- Images pour Garage Mécanique Pro
        (1, 'https://example.com/images/garage1/facade.jpg', true, 'Façade principale', 'Façade du Garage Mécanique Pro', 'exterior', 1),
        (1, 'https://example.com/images/garage1/atelier.jpg', false, 'Atelier principal', 'Atelier de réparation équipé', 'interior', 2),
        (1, 'https://example.com/images/garage1/diagnostic.jpg', false, 'Équipement diagnostic', 'Station de diagnostic moderne', 'equipment', 3),
        (1, 'https://example.com/images/garage1/reception.jpg', false, 'Accueil client', 'Zone d''accueil des clients', 'interior', 4),
        
        -- Images pour Carrosserie Elite
        (2, 'https://example.com/images/garage2/lavage.jpg', true, 'Station de lavage', 'Station de lavage automatique', 'exterior', 1),
        (2, 'https://example.com/images/garage2/interieur.jpg', false, 'Nettoyage intérieur', 'Service de nettoyage intérieur', 'service', 2),
        (2, 'https://example.com/images/garage2/polissage.jpg', false, 'Zone polissage', 'Service de polissage professionnel', 'service', 3),
        (2, 'https://example.com/images/garage2/parking.jpg', false, 'Parking client', 'Parking pour les clients', 'exterior', 4),
        
        -- Images pour les autres garages...
        (3, 'https://example.com/images/garage3/vidange.jpg', true, 'Station vidange', 'Station de vidange moderne', 'service', 1),
        (3, 'https://example.com/images/garage3/huiles.jpg', false, 'Stock huiles', 'Zone de stockage des huiles', 'interior', 2),
        (3, 'https://example.com/images/garage3/analyse.jpg', false, 'Analyse fluides', 'Équipement d''analyse', 'equipment', 3),
        
        (4, 'https://example.com/images/garage4/pneus.jpg', true, 'Stock pneus', 'Large stock de pneus', 'interior', 1),
        (4, 'https://example.com/images/garage4/equilibrage.jpg', false, 'Équilibrage', 'Machine d''équilibrage', 'equipment', 2),
        (4, 'https://example.com/images/garage4/montage.jpg', false, 'Zone montage', 'Zone de montage de pneus', 'service', 3),
        
        (5, 'https://example.com/images/garage5/vitrage.jpg', true, 'Atelier vitrage', 'Atelier de réparation de vitres', 'interior', 1),
        (5, 'https://example.com/images/garage5/pare-brise.jpg', false, 'Stock pare-brises', 'Stock de pare-brises', 'interior', 2),
        (5, 'https://example.com/images/garage5/reparation.jpg', false, 'Réparation impact', 'Réparation d''impact', 'service', 3)
        ON CONFLICT DO NOTHING;
      `);

      // 19. Insérer les relations garage-subcategories avec prix
      await pool.query(`
        INSERT INTO garage_subcategories (garage_id, subcategory_id, price, estimated_duration, is_available) VALUES
        -- Garage Mécanique Pro (services techniques)
        (1, 1, 150.00, 45, true), (1, 2, 100.00, 30, true), (1, 3, 200.00, 60, true),
        (1, 4, 80.00, 30, true), (1, 5, 50.00, 20, true),
        
       -- Carrosserie Elite (services lavage)
       (2, 7, 80.00, 45, true), (2, 8, 50.00, 30, true), (2, 10, 120.00, 90, true),
       (2, 11, 100.00, 60, true),
       
       -- Électro Auto Services (services vidange)
       (3, 13, 120.00, 30, true), (3, 14, 180.00, 45, true), (3, 15, 80.00, 30, true),
       (3, 16, 60.00, 20, true), (3, 17, 40.00, 30, true),
       
       -- Pneus Plus (services pneumatiques)
       (4, 19, 80.00, 30, true), (4, 20, 100.00, 45, true), (4, 21, 150.00, 60, true),
       (4, 22, 200.00, 45, true), (4, 23, 60.00, 30, true),
       
       -- Vitrage Express (services vitrage)
       (5, 25, 80.00, 45, true), (5, 26, 150.00, 60, true), (5, 27, 300.00, 90, true),
       (5, 28, 250.00, 120, true),
       
       -- Carrosserie Moderne (services carrosserie)
       (6, 30, 500.00, 180, true), (6, 31, 800.00, 240, true), (6, 32, 200.00, 90, true),
       (6, 33, 300.00, 120, true),
       
       -- Auto Contrôle Agadir (services techniques)
       (7, 1, 140.00, 45, true), (7, 2, 90.00, 30, true), (7, 3, 180.00, 60, true),
       (7, 4, 70.00, 30, true), (7, 5, 45.00, 20, true),
       
       -- Lavage Premium Tanger (services lavage premium)
       (8, 7, 100.00, 45, true), (8, 8, 70.00, 30, true), (8, 9, 150.00, 60, true),
       (8, 10, 180.00, 90, true), (8, 11, 140.00, 60, true)
       ON CONFLICT (garage_id, subcategory_id) DO NOTHING;
     `);

      // 20. Insérer quelques réservations de test
      await pool.query(`
       INSERT INTO booking (garageId, subcategory_id, customer_name, customer_phone, customer_email, vehicle_brand, vehicle_model, vehicle_year, vehicle_plate, reservedAt, estimated_duration, status, total_price, notes) VALUES
       (1, 1, 'Hassan Alami', '+212600111222', 'hassan@email.com', 'Toyota', 'Corolla', 2020, '123456-A-78', '2025-05-28 09:00:00', 45, 'confirmed', 150.00, 'Test de suspension complet'),
       (1, 3, 'Aicha Bennani', '+212611222333', 'aicha@email.com', 'Renault', 'Clio', 2019, '789012-B-34', '2025-05-28 14:00:00', 60, 'pending', 200.00, 'Inspection sécurité annuelle'),
       (2, 8, 'Omar Tazi', '+212622333444', 'omar@email.com', 'Peugeot', '208', 2021, '345678-C-91', '2025-05-28 10:30:00', 30, 'confirmed', 50.00, 'Lavage extérieur simple'),
       (3, 15, 'Fatima Ouali', '+212633444555', 'fatima@email.com', 'Dacia', 'Logan', 2018, '901234-D-56', '2025-05-28 11:00:00', 30, 'completed', 80.00, 'Vidange huile moteur'),
       (4, 22, 'Youssef Idrissi', '+212644555666', 'youssef@email.com', 'Hyundai', 'i10', 2022, '567890-E-12', '2025-05-29 08:00:00', 45, 'confirmed', 200.00, 'Changement 4 pneus été'),
       (5, 27, 'Meryem Fassi', '+212655666777', 'meryem@email.com', 'Volkswagen', 'Golf', 2020, '234567-F-89', '2025-05-29 15:00:00', 90, 'pending', 300.00, 'Remplacement pare-brise'),
       (6, 31, 'Karim Berrada', '+212666777888', 'karim@email.com', 'BMW', 'Serie 3', 2019, '890123-G-45', '2025-05-30 09:00:00', 240, 'confirmed', 800.00, 'Peinture aile avant gauche')
       ON CONFLICT DO NOTHING;
     `);

      // 21. Insérer des avis clients de test
      await pool.query(`
       INSERT INTO reviews (garage_id, booking_id, customer_name, customer_email, rating, comment, is_verified, is_published) VALUES
       (1, 1, 'Hassan Alami', 'hassan@email.com', 5, 'Service excellent, très professionnel. Test de suspension effectué rapidement et avec précision.', true, true),
       (1, null, 'Nadia Cherkaoui', 'nadia@email.com', 4, 'Bon garage, personnel compétent. Délais respectés.', false, true),
       (2, 3, 'Omar Tazi', 'omar@email.com', 4, 'Lavage de qualité, voiture impeccable. Je recommande.', true, true),
       (2, null, 'Sara Benjelloun', 'sara@email.com', 5, 'Station moderne, service rapide. Très satisfaite du résultat.', false, true),
       (3, 4, 'Fatima Ouali', 'fatima@email.com', 5, 'Vidange parfaite, conseils utiles du mécanicien. Prix correct.', true, true),
       (3, null, 'Reda Amrani', 'reda@email.com', 4, 'Bon service, garage propre et bien organisé.', false, true),
       (4, 5, 'Youssef Idrissi', 'youssef@email.com', 4, 'Changement pneus rapide, bon conseil sur le choix des pneus.', true, true),
       (4, null, 'Laila Squalli', 'laila@email.com', 5, 'Excellent service, très bon rapport qualité-prix.', false, true),
       (5, 6, 'Meryem Fassi', 'meryem@email.com', 5, 'Remplacement pare-brise parfait, installation soignée.', true, true),
       (5, null, 'Amine Kettani', 'amine@email.com', 4, 'Service professionnel, délais respectés.', false, true)
       ON CONFLICT DO NOTHING;
     `);

      // 22. Créer des vues utiles pour les statistiques
      await pool.query(`
       -- Vue pour les statistiques des garages
       CREATE OR REPLACE VIEW garage_stats AS
       SELECT 
         g.id,
         g.name,
         g.rating,
         g.total_reviews,
         COUNT(DISTINCT gs.subcategory_id) as total_services,
         COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as confirmed_bookings,
         COUNT(DISTINCT CASE WHEN b.reservedAt::date = CURRENT_DATE THEN b.id END) as today_bookings,
         g.capacity - COUNT(DISTINCT CASE WHEN b.reservedAt::date = CURRENT_DATE AND b.status IN ('confirmed', 'pending') THEN b.id END) as available_slots
       FROM garages g
       LEFT JOIN garage_subcategories gs ON g.id = gs.garage_id
       LEFT JOIN booking b ON g.id = b.garageId
       WHERE g.isDisponible = true
       GROUP BY g.id, g.name, g.rating, g.total_reviews, g.capacity;

       -- Vue pour les services populaires
       CREATE OR REPLACE VIEW popular_services AS
       SELECT 
         s.id,
         s.name,
         c.name as category_name,
         COUNT(b.id) as booking_count,
         AVG(gs.price) as avg_price,
         AVG(s.estimated_duration) as avg_duration
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id
       LEFT JOIN booking b ON s.id = b.subcategory_id
       WHERE s.isActive = true
       GROUP BY s.id, s.name, c.name
       ORDER BY booking_count DESC;
     `);

      console.log("✅ Configuration de la base de données terminée avec succès");

      res.status(200).json({
        success: true,
        message: "Configuration de la base de données réussie pour toutes les tables",
        tables_created: [
          "garagiste", "categories", "subcategories", "garages",
          "garage_subcategories", "garage_images", "booking", "reviews"
        ],
        views_created: ["garage_stats", "popular_services"],
        triggers_created: [
          "update_garagiste_updated_at", "update_categories_updated_at",
          "update_subcategories_updated_at", "update_garages_updated_at",
          "update_garage_images_updated_at", "update_booking_updated_at",
          "update_reviews_updated_at", "update_garage_rating_trigger"
        ],
        test_data: {
          categories: 7,
          subcategories: 34,
          garagistes: 5,
          garages: 8,
          garage_subcategory_relations: 32,
          garage_images: 16,
          bookings: 7,
          reviews: 10
        }
      });
    } catch (error) {
      console.error("❌ Erreur lors de la configuration :", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la configuration de la base de données",
        error: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  }),
);

// ===== ENDPOINTS D'ADMINISTRATION =====

// Test endpoint pour vérifier les tables
app.get(
  "/check-tables",
  asyncHandler(async (req: any, res: any) => {
    try {
      const result = await pool.query(`
       SELECT 
         table_name,
         (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
       FROM information_schema.tables t
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'
       ORDER BY table_name;
     `);

      // Compter les enregistrements dans chaque table
      const counts = {};
      const tableInfo = {};

      for (const row of result.rows) {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) FROM ${row.table_name}`);
          (counts as any)[row.table_name] = parseInt(countResult.rows[0].count);

          const columnsResult = await pool.query(`
           SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns 
           WHERE table_name = $1 
           ORDER BY ordinal_position
         `, [row.table_name]);

          (tableInfo as any)[row.table_name] = {
            columns: columnsResult.rows,
            record_count: parseInt(countResult.rows[0].count)
          };
        } catch (err) {
          (counts as any)[row.table_name] = "Error";
          (tableInfo as any)[row.table_name] = { error: (err as Error).message };
        }
      }

      res.status(200).json({
        success: true,
        message: "Informations sur les tables de la base de données",
        summary: {
          total_tables: result.rows.length,
          total_records: Object.values(counts).reduce((sum: number, count) =>
            typeof count === 'number' ? sum + count : sum, 0)
        },
        tables: result.rows.map((row: any) => ({
          name: row.table_name,
          columns: row.column_count,
          records: (counts as any)[row.table_name]
        })),
        detailed_info: tableInfo
      });
    } catch (error) {
      console.error("Erreur lors de la vérification des tables :", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la vérification des tables",
        error: (error as Error).message
      });
    }
  }),
);

// Endpoint pour les statistiques avancées
app.get(
  "/stats",
  asyncHandler(async (req: any, res: any) => {
    try {
      // Statistiques générales
      const generalStats = await pool.query(`
       SELECT 
         (SELECT COUNT(*) FROM garagiste WHERE isActive = true) as active_garagistes,
         (SELECT COUNT(*) FROM categories WHERE isActive = true) as active_categories,
         (SELECT COUNT(*) FROM subcategories WHERE isActive = true) as active_subcategories,
         (SELECT COUNT(*) FROM garages WHERE isDisponible = true) as available_garages,
         (SELECT COUNT(*) FROM garages WHERE is_verified = true) as verified_garages,
         (SELECT COUNT(*) FROM booking WHERE status = 'confirmed') as confirmed_bookings,
         (SELECT COUNT(*) FROM booking WHERE reservedAt::date = CURRENT_DATE) as today_bookings,
         (SELECT COUNT(*) FROM reviews WHERE is_published = true) as published_reviews,
         (SELECT AVG(rating) FROM garages WHERE rating > 0) as avg_garage_rating
     `);

      // Top 5 garages par note
      const topGarages = await pool.query(`
       SELECT id, name, rating, total_reviews, address
       FROM garages 
       WHERE rating > 0 AND total_reviews > 0
       ORDER BY rating DESC, total_reviews DESC 
       LIMIT 5
     `);

      // Services les plus demandés
      const popularServices = await pool.query(`
       SELECT 
         s.name as service_name,
         c.name as category_name,
         COUNT(b.id) as booking_count,
         AVG(gs.price) as avg_price
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       LEFT JOIN booking b ON s.id = b.subcategory_id
       LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id
       GROUP BY s.id, s.name, c.name
       HAVING COUNT(b.id) > 0
       ORDER BY booking_count DESC
       LIMIT 10
     `);

      // Réservations par statut
      const bookingsByStatus = await pool.query(`
       SELECT status, COUNT(*) as count
       FROM booking
       GROUP BY status
       ORDER BY count DESC
     `);

      // Revenus par catégorie (basé sur les réservations confirmées)
      const revenueByCategory = await pool.query(`
       SELECT 
         c.name as category_name,
         COUNT(b.id) as completed_bookings,
         SUM(b.total_price) as total_revenue,
         AVG(b.total_price) as avg_booking_value
       FROM categories c
       JOIN subcategories s ON c.id = s.category_id
       JOIN booking b ON s.id = b.subcategory_id
       WHERE b.status IN ('confirmed', 'completed')
       GROUP BY c.id, c.name
       ORDER BY total_revenue DESC
     `);

      res.status(200).json({
        success: true,
        message: "Statistiques détaillées du système",
        timestamp: new Date().toISOString(),
        data: {
          general_statistics: generalStats.rows[0],
          top_rated_garages: topGarages.rows,
          popular_services: popularServices.rows,
          bookings_by_status: bookingsByStatus.rows,
          revenue_by_category: revenueByCategory.rows
        }
      });
    } catch (error: any) {
      console.error("Erreur lors de la récupération des statistiques :", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des statistiques",
        error: error.message
      });
    }
  }),
);

// Health check endpoint amélioré
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Garage Management API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    features: [
      "Garagistes Management",
      "Garages Management",
      "Categories & Subcategories",
      "Géolocalisation & Search",
      "Booking System",
      "Reviews & Rating",
      "Image Galleries",
      "Statistics & Analytics"
    ],
    database: {
      connected: true,
      type: "PostgreSQL"
    }
  });
});

// Endpoint pour obtenir un aperçu rapide des données
app.get(
  "/overview",
  asyncHandler(async (req: any, res: any) => {
    try {
      const stats = await pool.query(`
       SELECT 
         (SELECT COUNT(*) FROM garagiste WHERE isActive = true) as total_garagistes,
         (SELECT COUNT(*) FROM categories WHERE isActive = true) as total_categories,
         (SELECT COUNT(*) FROM subcategories WHERE isActive = true) as total_subcategories,
         (SELECT COUNT(*) FROM garages WHERE isDisponible = true) as total_garages,
         (SELECT COUNT(*) FROM garages WHERE isDisponible = true) as available_garages,
         (SELECT COUNT(*) FROM garage_images) as total_garage_images,
         (SELECT COUNT(*) FROM booking) as total_bookings,
         (SELECT COUNT(*) FROM reviews WHERE is_published = true) as total_reviews
     `);

      const recentGarages = await pool.query(`
       SELECT 
         g.id, g.name, g.capacity, g.isDisponible, g.rating, g.total_reviews,
         c.name as category_name, g.latitude, g.longitude, g.main_image, g.description,
         (SELECT COUNT(*) FROM garage_images gi WHERE gi.garage_id = g.id) as image_count,
         (SELECT COUNT(*) FROM booking b WHERE b.garageId = g.id AND b.reservedAt::date = CURRENT_DATE) as today_bookings
       FROM garages g
       LEFT JOIN categories c ON g.category_id = c.id
       WHERE g.isDisponible = true
       ORDER BY g.createdAt DESC
       LIMIT 5
     `);

      const recentBookings = await pool.query(`
       SELECT 
         b.id, b.customer_name, b.customer_phone, b.status, b.total_price,
         b.reservedAt, g.name as garage_name, s.name as service_name
       FROM booking b
       LEFT JOIN garages g ON b.garageId = g.id
       LEFT JOIN subcategories s ON b.subcategory_id = s.id
       ORDER BY b.created_at DESC
       LIMIT 5
     `);

      res.status(200).json({
        success: true,
        message: "Aperçu du système de gestion des garages",
        timestamp: new Date().toISOString(),
        statistics: stats.rows[0],
        recent_data: {
          garages: recentGarages.rows,
          bookings: recentBookings.rows
        }
      });
    } catch (error: any) {
      console.error("Erreur lors de la récupération de l'aperçu :", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération de l'aperçu",
        error: error.message
      });
    }
  }),
);

// ===== ROUTES PRINCIPALES =====

// Routes API
app.use("/api", garagisteRoutes);
app.use("/api", garageRoutes);
app.use("/api", categoryRoutes);
app.use("/api", garagesSearchRoutes);
app.use("/api", garageImagesRoutes);

// ===== MIDDLEWARE DE GESTION D'ERREURS =====

// Middleware de gestion d'erreurs global
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Global error handler:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Erreurs de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: "Erreur de validation",
      errors: err.errors
    });
  }

  // Erreurs de base de données
  if (err.code && err.code.startsWith('23')) {
    return res.status(409).json({
      success: false,
      message: "Conflit de données",
      error: "Une contrainte de base de données a été violée"
    });
  }

  // Erreur générique
  res.status(err.status || 500).json({
    success: false,
    message: "Une erreur interne du serveur s'est produite",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal Server Error",
    timestamp: new Date().toISOString()
  });
});

// 404 handler avec documentation complète des routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route non trouvée",
    requested_url: req.originalUrl,
    method: req.method,
    available_routes: {
      "=== ADMINISTRATION ===": [
        "GET /health - Status de l'API",
        "GET /setup - Configuration de la base de données",
        "GET /check-tables - Vérifier les tables et leurs structures",
        "GET /overview - Aperçu du système avec données récentes",
        "GET /stats - Statistiques détaillées et analytics",
        "GET /api-docs - Documentation Swagger de l'API"
      ],
      "=== GARAGISTES ===": [
        "POST /api/garagistes - Créer un nouveau garagiste",
        "GET /api/garagistes - Lister tous les garagistes",
        "GET /api/garagistes/:id - Obtenir un garagiste spécifique",
        "PUT /api/garagistes/:id - Modifier un garagiste",
        "DELETE /api/garagistes/:id - Supprimer un garagiste",
        "POST /api/garagistes/login - Connexion garagiste"
      ],
      "=== GARAGES ===": [
        "POST /api/garages - Créer un nouveau garage",
        "GET /api/garages - Lister tous les garages avec filtres",
        "GET /api/garages/:id - Obtenir un garage avec tous ses détails",
        "PUT /api/garages/:id - Modifier un garage",
        "DELETE /api/garages/:id - Supprimer un garage",
        "GET /api/garages/category/:categoryId - Garages par catégorie",
        "GET /api/garages/subcategory/:subcategoryId - Garages par sous-catégorie"
      ],
      "=== IMAGES DE GARAGE ===": [
        "POST /api/garages/:garageId/images - Ajouter une image",
        "GET /api/garages/:garageId/images - Obtenir toutes les images",
        "PUT /api/garages/:garageId/images/:imageId - Modifier une image",
        "DELETE /api/garages/:garageId/images/:imageId - Supprimer une image",
        "PUT /api/garages/:garageId/images/:imageId/featured - Définir image principale"
      ],
      "=== RECHERCHE GÉOLOCALISÉE ===": [
        "GET /api/search/nearby - Recherche par proximité avec query params",
        "GET /api/search/nearest - Trouver les garages les plus proches",
        "GET /api/search/bounds - Recherche dans une zone géographique",
        "GET /api/garages/subcategory/:id/location/:lat/:lng/:radius - Recherche par sous-catégorie",
        "GET /api/garages/category/:id/location/:lat/:lng/:radius - Recherche par catégorie"
      ],
      "=== CATÉGORIES ===": [
        "GET /api/categories - Toutes les catégories avec sous-catégories",
        "GET /api/categories/:id - Une catégorie spécifique",
        "GET /api/subcategories - Toutes les sous-catégories",
        "GET /api/subcategories/:id - Une sous-catégorie spécifique",
        "GET /api/categories/:id/subcategories - Sous-catégories d'une catégorie"
      ],
      "=== RÉSERVATIONS (À IMPLÉMENTER) ===": [
        "POST /api/bookings - Créer une réservation",
        "GET /api/bookings - Lister les réservations",
        "GET /api/bookings/:id - Obtenir une réservation",
        "PUT /api/bookings/:id - Modifier une réservation",
        "DELETE /api/bookings/:id - Annuler une réservation"
      ],
      "=== AVIS ET NOTES (À IMPLÉMENTER) ===": [
        "POST /api/reviews - Ajouter un avis",
        "GET /api/reviews/garage/:garageId - Avis d'un garage",
        "PUT /api/reviews/:id - Modifier un avis",
        "DELETE /api/reviews/:id - Supprimer un avis"
      ]
    },
    examples: {
      search_nearby: "/api/search/nearby?latitude=33.5731&longitude=-7.5898&radius=10&subcategory_id=1",
      garage_by_location: "/api/garages/subcategory/1/location/33.5731/-7.5898/10",
      garage_details: "/api/garages/1",
      categories: "/api/categories"
    }
  });
});

// ===== DÉMARRAGE DU SERVEUR =====

const PORT = process.env.PORT || 5001;

const start = async () => {
  try {
    // Test de connexion à la base de données
    await pool.query('SELECT NOW()');
    console.log("✅ Connexion à la base de données établie");

    app.listen(PORT, () => {
      console.log("\n🚀 ===== GARAGE MANAGEMENT SERVER STARTED =====");
      console.log(`🌐 Server running on port: ${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Overview: http://localhost:${PORT}/overview`);
      console.log(`📈 Statistics: http://localhost:${PORT}/stats`);
      console.log(`🔧 Setup database: http://localhost:${PORT}/setup`);
      console.log(`📋 Check tables: http://localhost:${PORT}/check-tables`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔗 Base API URL: http://localhost:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log("===================================================\n");
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    console.error("💡 Make sure PostgreSQL is running and environment variables are set correctly");
    process.exit(1);
  }
};

// Gestion gracieuse de l'arrêt du serveur
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

start();

export default app;