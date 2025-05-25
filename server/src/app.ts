/** @format */
// app.ts
dotenv.config();
import express from "express";
import cors from "cors";
import "express-async-errors";
import dotenv from "dotenv";
import userRouter from "./routes/userRoutes.js";
import carRoutes from "./routes/carRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import pool from "./db/pgDB.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// /setup pour setup la base de données
app.get("/setup", async (req, res) => {
  try {
    // Créer la table users
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

    // Créer la table cars (renommée de "car" en "cars" pour la cohérence)
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

    // Créer la table address
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

    // Créer la fonction pour mettre à jour updatedAt
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updatedAt = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Créer les triggers pour users
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
          CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END
      $$;
    `);

    // Créer les triggers pour cars
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cars_updated_at') THEN
          CREATE TRIGGER update_cars_updated_at
          BEFORE UPDATE ON cars
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END
      $$;
    `);

    // Créer les triggers pour address
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_address_updated_at') THEN
          CREATE TRIGGER update_address_updated_at
          BEFORE UPDATE ON address
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END
      $$;
    `);

    // Créer les index pour améliorer les performances
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);
      CREATE INDEX IF NOT EXISTS idx_cars_matricule ON cars(matricule);
      CREATE INDEX IF NOT EXISTS idx_address_user_id ON address(user_id);
      CREATE INDEX IF NOT EXISTS idx_address_type ON address(type);
    `);

    res.status(200).json({
      message: "Database setup successful for users, cars, and address tables.",
      tables_created: ["users", "cars", "address"],
      triggers_created: [
        "update_users_updated_at",
        "update_cars_updated_at",
        "update_address_updated_at",
      ],
      indexes_created: [
        "idx_users_email",
        "idx_cars_user_id",
        "idx_cars_matricule",
        "idx_address_user_id",
        "idx_address_type",
      ],
    });
  } catch (error) {
    console.error("Error during setup:", error);
    res.status(500).json({
      message: "Error during database setup.",
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

    res.status(200).json({
      message: "Tables in database:",
      tables: result.rows.map((row) => row.table_name),
    });
  } catch (error) {
    console.error("Error checking tables:", error);
    res.status(500).json({
      message: "Error checking tables.",
      error: (error as Error).message,
    });
  }
});

// Routes
app.use("/api", userRouter);
app.use("/api", carRoutes);
app.use("/api", addressRoutes);
// app.use("/api", compaignRouter);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Setup database: GET http://localhost:${PORT}/setup`);
      console.log(`Check tables: GET http://localhost:${PORT}/check-tables`);
    });
  } catch (error) {
    console.log("there was an error :" + error);
  }
};

start();

export default app;
