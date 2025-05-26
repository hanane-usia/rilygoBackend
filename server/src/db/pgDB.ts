/** @format */
import dotenv from "dotenv";
dotenv.config(); // <<< Très important d'avoir ça tout en haut
import pkg from "pg";
const { Pool } = pkg;

// export const PG_HOST = "postgres-rilygo";
export const PG_HOST = "localhost";
export const PG_PORT = 5432;
export const PG_USER = "postgres";
export const PG_PASSWORD = "lamraniotman000";
export const PG_DATABASE = "Rilygo";
const pool = new Pool({
  host: PG_HOST,
  port: PG_PORT as unknown as number,
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
});
pool.connect((err) => {
  if (err) {
    console.error("Error connecting to PostgreSQL database:", err);
  } else {
    console.log("Connected to PostgreSQL database successfully.");
  }
});
export default pool;
