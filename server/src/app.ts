/** @format */
// app.ts - Server Automobiliste avec Booking
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import "express-async-errors";
import userRouter from "./routes/userRoutes.js";
import carRoutes from "./routes/carRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import favoritesRoutes from "./routes/FavoritesRoutes.js";
import pool from "./db/pgDB.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// /setup pour setup la base de données complète
app.get("/setup", async (req, res) => {
  try {
    console.log("🔧 Configuration de la base de données automobiliste...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
          id SERIAL PRIMARY KEY,
          garageId INTEGER NOT NULL,
          automobileId INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
          userId INTEGER,
          likedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(garageId, automobileId)
      );
    `);
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_favorites_user_id()
      RETURNS TRIGGER AS $$
      BEGIN
          SELECT user_id INTO NEW.userId FROM cars WHERE id = NEW.automobileId;
          NEW.updatedAt = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
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

    // 2. Créer la table users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          address TEXT[],
          city VARCHAR(100),
          state VARCHAR(100),
          zip VARCHAR(20),
          country VARCHAR(100),
          createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Créer la table cars
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cars (
          id SERIAL PRIMARY KEY,
          mark VARCHAR(255) NOT NULL,
          matricule VARCHAR(255) UNIQUE NOT NULL,
          model VARCHAR(255),
          year INTEGER,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Créer la table address
    await pool.query(`
      CREATE TABLE IF NOT EXISTS address (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          place VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('home', 'work', 'other', 'billing', 'shipping')),
          createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Créer la table booking (NOUVELLE)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS booking (
          id SERIAL PRIMARY KEY,
          
          -- Références vers l'autre microservice (pas de FK)
          garageId INTEGER NOT NULL,        -- ID du garage (pas de FK - autre DB)
          garageAddress TEXT,               -- Cache local pour performance
          garageName VARCHAR(255),          -- Cache local pour performance
          serviceId INTEGER NOT NULL,       -- ID du service (pas de FK - autre DB)
          
          -- Références locales (avec FK)
          automobileId INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
          userId INTEGER,                   -- Calculé depuis automobileId
          
          -- Données de réservation
          reservedAt TIMESTAMPTZ NOT NULL, -- Date/heure de la réservation
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
          notes TEXT,                       -- Notes additionnelles
          
          -- Métadonnées
          createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          
          -- Contraintes
          UNIQUE(garageId, automobileId, reservedAt) -- Éviter les doublons
      );
    `);

    // 6. Créer la fonction spéciale pour booking (mise à jour userId automatique)
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_booking_user_id()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Récupérer l'userId depuis la table cars
          SELECT user_id INTO NEW.userId 
          FROM cars 
          WHERE id = NEW.automobileId;
          
          -- Mettre à jour updatedAt
          NEW.updatedAt = NOW();
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 7. Créer tous les triggers
    const tables = [
      { table: "users", trigger: "update_users_updated_at" },
      { table: "cars", trigger: "update_cars_updated_at" },
      { table: "address", trigger: "update_address_updated_at" },
      { table: "favorites", trigger: "update_favorites_updated_at" }, // ← AJOUTÉ
      { table: "booking", trigger: "update_booking_updated_at" },
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
    await pool.query(`
      DROP TRIGGER IF EXISTS set_favorites_user_id ON favorites;
      CREATE TRIGGER set_favorites_user_id
      BEFORE INSERT OR UPDATE ON favorites
      FOR EACH ROW
      EXECUTE FUNCTION update_favorites_user_id();
    `);
    // 8. Créer le trigger spécial pour booking (userId automatique)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_booking_user_id') THEN
          CREATE TRIGGER set_booking_user_id
          BEFORE INSERT OR UPDATE ON booking
          FOR EACH ROW
          EXECUTE FUNCTION update_booking_user_id();
        END IF;
      END
      $$;
    `);

    // 9. Créer tous les index

    await pool.query(`
      -- Index pour users
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
      
      -- Index pour cars
      CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);
      CREATE INDEX IF NOT EXISTS idx_cars_matricule ON cars(matricule);
      CREATE INDEX IF NOT EXISTS idx_cars_mark ON cars(mark);
      
      -- Index pour address
      CREATE INDEX IF NOT EXISTS idx_address_user_id ON address(user_id);
      CREATE INDEX IF NOT EXISTS idx_address_type ON address(type);
      
      -- Index pour booking
      CREATE INDEX IF NOT EXISTS idx_booking_garage_id ON booking(garageId);
      CREATE INDEX IF NOT EXISTS idx_booking_automobile_id ON booking(automobileId);
      CREATE INDEX IF NOT EXISTS idx_booking_user_id ON booking(userId);
      CREATE INDEX IF NOT EXISTS idx_booking_service_id ON booking(serviceId);
      CREATE INDEX IF NOT EXISTS idx_booking_reserved_at ON booking(reservedAt);
      CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(status);
      CREATE INDEX IF NOT EXISTS idx_booking_created_at ON booking(createdAt);
      -- index favories 
      CREATE INDEX IF NOT EXISTS idx_favorites_garage_id ON favorites(garageId);
      CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(userId);
      
      -- Index composés pour booking (version simplifiée)
      CREATE INDEX IF NOT EXISTS idx_booking_user_status ON booking(userId, status);
      CREATE INDEX IF NOT EXISTS idx_booking_garage_status ON booking(garageId, status);
    `);

    // 10. Insérer des données de test
    await pool.query(`
      INSERT INTO users (name, email, password, phone, city, state, country) VALUES
      ('Ahmed Alami', 'ahmed.alami@email.com', 'password123', '+212600123456', 'Casablanca', 'Grand Casablanca', 'Morocco'),
      ('Fatima Benali', 'fatima.benali@email.com', 'password456', '+212611234567', 'Rabat', 'Rabat-Salé-Kénitra', 'Morocco'),
      ('Mohamed Elkadi', 'mohamed.elkadi@email.com', 'password789', '+212622345678', 'Marrakech', 'Marrakech-Safi', 'Morocco')
      ON CONFLICT (email) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO cars (mark, matricule, model, year, user_id) VALUES
      ('Toyota', 'A-123-456', 'Camry', 2020, 1),
      ('Honda', 'B-789-012', 'Civic', 2019, 1),
      ('Mercedes', 'C-345-678', 'C-Class', 2021, 2),
      ('BMW', 'D-901-234', 'X3', 2022, 3),
      ('Renault', 'E-567-890', 'Clio', 2018, 2)
      ON CONFLICT (matricule) DO NOTHING;
    `);
    // 7. Dans les données de test, ajoutez :

    await pool.query(`
      INSERT INTO favorites (garageId, automobileId) VALUES
      (1, 1), (2, 1), (1, 3), (3, 4)
      ON CONFLICT (garageId, automobileId) DO NOTHING; 
    `);

    await pool.query(`
      INSERT INTO address (user_id, place, type) VALUES
      (1, '123 Rue Mohammed V, Casablanca', 'home'),
      (1, '456 Boulevard Hassan II, Casablanca', 'work'),
      (2, '789 Avenue Allal Ben Abdellah, Rabat', 'home'),
      (2, '321 Rue des Consuls, Rabat', 'work'),
      (3, '654 Avenue Mohammed VI, Marrakech', 'home')
      ON CONFLICT DO NOTHING;
    `);

    // 11. Insérer des réservations de test
    await pool.query(`
      INSERT INTO booking (garageId, garageAddress, garageName, automobileId, serviceId, reservedAt, status, notes) VALUES
      (1, '123 Rue de la Mécanique, Casablanca', 'Garage Mécanique Pro', 1, 1, '2025-05-25 09:00:00+00', 'confirmed', 'Réparation moteur'),
      (1, '123 Rue de la Mécanique, Casablanca', 'Garage Mécanique Pro', 2, 2, '2025-05-25 14:00:00+00', 'pending', 'Révision transmission'),
      (2, '456 Avenue Hassan II, Rabat', 'Carrosserie Elite', 3, 5, '2025-05-26 10:30:00+00', 'confirmed', 'Peinture pare-choc'),
      (3, '789 Boulevard Zerktouni, Casablanca', 'Électro Auto Services', 4, 8, '2025-05-27 15:00:00+00', 'pending', 'Diagnostic électronique'),
      (4, '321 Rue Moulay Youssef, Marrakech', 'Pneus Plus', 5, 11, '2025-05-28 08:00:00+00', 'confirmed', 'Montage pneus hiver')
      ON CONFLICT (garageId, automobileId, reservedAt) DO NOTHING;
    `);

    // 12. Créer des vues utiles
    await pool.query(`
      -- Vue pour les réservations complètes
      CREATE OR REPLACE VIEW booking_complete AS
      SELECT 
          b.id,
          b.garageId,
          b.garageName,
          b.garageAddress,
          b.serviceId,
          b.automobileId,
          b.userId,
          b.reservedAt,
          b.status,
          b.notes,
          b.createdAt,
          b.updatedAt,
          -- Données utilisateur (JOIN local)
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          -- Données voiture (JOIN local)
          c.mark as car_mark,
          c.model as car_model,
          c.matricule as car_matricule,
          c.year as car_year,
          -- Adresse utilisateur (JOIN local)
          a.place as user_address,
          a.type as address_type
      FROM booking b
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN cars c ON b.automobileId = c.id
      LEFT JOIN address a ON u.id = a.user_id AND a.type = 'home'
      ORDER BY b.reservedAt DESC;
    `);

    console.log("✅ Configuration terminée avec succès");

    res.status(200).json({
      message:
        "Configuration de la base de données réussie - Server Automobiliste",
      server: "Automobiliste",
      port: process.env.PORT || 5000,
      tables_created: ["users", "cars", "address", "booking"],
      triggers_created: [
        "update_users_updated_at",
        "update_cars_updated_at",
        "update_address_updated_at",
        "update_booking_updated_at",
        "set_booking_user_id",
      ],
      indexes_created: [
        "idx_users_email",
        "idx_cars_user_id",
        "idx_cars_matricule",
        "idx_address_user_id",
        "idx_address_type",
        "idx_booking_garage_id",
        "idx_booking_automobile_id",
        "idx_booking_user_id",
        "idx_booking_service_id",
        "idx_booking_reserved_at",
        "idx_booking_status",
      ],
      test_data: {
        users: 3,
        cars: 5,
        addresses: 5,
        bookings: 5,
      },
      microservice_architecture: {
        local_tables: ["users", "cars", "address", "booking"],
        external_api_calls: ["garages", "services"],
        api_gateway_url:
          process.env.GARAGE_API_URL || "http://localhost:5001/api",
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la configuration :", error);
    res.status(500).json({
      message: "Erreur lors de la configuration de la base de données",
      error: (error as Error).message,
    });
  }
});

// Test endpoint pour vérifier les tables
app.get("/check-tables", async (req, res) => {
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
      message: "Tables dans la base de données automobiliste:",
      server: "Automobiliste",
      tables: result.rows.map((row) => row.table_name),
      record_counts: counts,
    });
  } catch (error) {
    console.error("Error checking tables:", error);
    res.status(500).json({
      message: "Error checking tables.",
      error: (error as Error).message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Automobiliste API",
    timestamp: new Date().toISOString(),
    port: PORT,
    version: "1.0.0",
    features: ["Users", "Cars", "Address", "Booking"],
    architecture: "Microservice",
    external_dependencies: ["Garage API"],
  });
});

// Endpoint pour obtenir un aperçu rapide des données
app.get("/overview", async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM cars) as total_cars,
        (SELECT COUNT(*) FROM address) as total_addresses,
        (SELECT COUNT(*) FROM booking) as total_bookings,
        (SELECT COUNT(*) FROM booking WHERE status = 'confirmed') as confirmed_bookings,
        (SELECT COUNT(*) FROM booking WHERE status = 'pending') as pending_bookings
    `);

    const recentBookings = await pool.query(`
      SELECT b.id, b.garageName, b.status, b.reservedAt, u.name as user_name, c.mark as car_mark, c.model as car_model
      FROM booking b
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN cars c ON b.automobileId = c.id
      ORDER BY b.createdAt DESC
      LIMIT 5
    `);

    res.status(200).json({
      message: "Aperçu du système automobiliste",
      statistics: stats.rows[0],
      recent_bookings: recentBookings.rows,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Erreur lors de la récupération de l'aperçu",
      error: error.message,
    });
  }
});

// Routes
app.use("/api", userRouter);
app.use("/api", carRoutes);
app.use("/api", addressRoutes);
app.use("/api", bookingRoutes);
app.use("/api", favoritesRoutes);

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
    message: "Route non trouvée - Server Automobiliste",
    service: "Automobiliste API",
    availableRoutes: [
      "GET /health - Status de l'API",
      "GET /setup - Configuration de la base de données",
      "GET /check-tables - Vérifier les tables",
      "GET /overview - Aperçu du système",
      "",
      "=== USERS ===",
      "POST /api/users - Créer un utilisateur",
      "GET /api/users - Lister les utilisateurs",
      "GET /api/users/:id - Un utilisateur",
      "PUT /api/users/:id - Modifier un utilisateur",
      "DELETE /api/users/:id - Supprimer un utilisateur",
      "",
      "=== CARS ===",
      "POST /api/users/:userId/cars - Ajouter une voiture",
      "GET /api/users/:userId/cars - Voitures d'un utilisateur",
      "GET /api/users/:userId/cars/:carId - Une voiture",
      "PUT /api/users/:userId/cars/:carId - Modifier une voiture",
      "DELETE /api/users/:userId/cars/:carId - Supprimer une voiture",
      "",
      "=== ADDRESSES ===",
      "POST /api/users/:userId/addresses - Ajouter une adresse",
      "GET /api/users/:userId/addresses - Adresses d'un utilisateur",
      "PUT /api/users/:userId/addresses/:addressId - Modifier une adresse",
      "DELETE /api/users/:userId/addresses/:addressId - Supprimer une adresse",
      "",
      "=== BOOKINGS ===",
      "POST /api/bookings - Créer une réservation",
      "GET /api/bookings - Lister les réservations",
      "GET /api/bookings/user/:userId - Réservations d'un utilisateur",
      "GET /api/bookings/garage/:garageId - Réservations d'un garage",
      "PUT /api/bookings/:id - Modifier une réservation",
      "DELETE /api/bookings/:id - Supprimer une réservation",
      "=== FAVORITES ===",
      "POST /api/favorites - Ajouter aux favoris",
      "GET /api/favorites/user/:userId - Favoris d'un utilisateur",
      "DELETE /api/favorites/:id - Supprimer un favori",
    ],
  });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`✅ Automobiliste Server is running on port ${PORT}`);
      console.log(`🏥 Health check: GET http://localhost:${PORT}/health`);
      console.log(`📊 Overview: GET http://localhost:${PORT}/overview`);
      console.log(`🔧 Setup database: GET http://localhost:${PORT}/setup`);
      console.log(`📋 Check tables: GET http://localhost:${PORT}/check-tables`);
      console.log(`🚗 Automobiliste API: http://localhost:${PORT}/api`);
      console.log(
        `🔗 External Garage API: ${
          process.env.GARAGE_API_URL || "http://localhost:5001/api"
        }`,
      );
    });
  } catch (error) {
    console.log("❌ Error starting server:", error);
  }
};

start();

export default app;
