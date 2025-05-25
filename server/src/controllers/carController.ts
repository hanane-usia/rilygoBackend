/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB.js"; // Adjust path to your PostgreSQL pool
import { CarType } from "../models/Car.js";

const buildUpdateSetClauseForCar = (
  fields: Partial<Omit<CarType, "id" | "createdAt" | "updatedAt">>,
): { text: string; values: any[] } => {
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    throw new Error("No fields to update provided.");
  }
  const validKeys = keys.filter(
    (key) => key !== "id" && key !== "createdAt" && key !== "updatedAt",
  );
  if (validKeys.length === 0) {
    throw new Error(
      "No valid fields to update provided (id, createdAt, updatedAt cannot be set this way).",
    );
  }

  const setClauses = validKeys.map((key, index) => `${key} = $${index + 1}`);
  const values = validKeys.map((key) => (fields as any)[key]);
  return {
    text: setClauses.join(", "),
    values,
  };
};

// --- Create (Add a new car) ---
export const addCar = async (req: Request, res: Response) => {
  try {
    const { mark, matricule, model, year, user_id }: CarType = req.body;

    if (!mark || !matricule) {
      return res
        .status(400)
        .json({ message: "Mark and Matricule are required for a car." });
    }
    // Optional: Validate if user_id exists if provided
    if (user_id) {
      const userExists = await pool.query(
        "SELECT id FROM users WHERE id = $1",
        [user_id],
      );
      if (userExists.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "User with the provided user_id does not exist." });
      }
    }

    const newCarQuery = `
      INSERT INTO cars (mark, matricule, model, year, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, mark, matricule, model, year, user_id, createdAt, updatedAt;
    `;
    const values = [mark, matricule, model, year, user_id || null]; // Ensure user_id is null if not provided

    const result = await pool.query(newCarQuery, values);

    res
      .status(201)
      .json({ message: "Car added successfully", car: result.rows[0] });
  } catch (error: any) {
    console.error("Error adding car:", error);
    if (error.code === "23505" && error.constraint === "cars_matricule_key") {
      return res
        .status(409)
        .json({ message: "Matricule (license plate) already exists." });
    }
    // Foreign key violation (e.g. user_id doesn't exist)
    if (error.code === "23503" && error.constraint === "fk_user") {
      return res
        .status(400)
        .json({ message: "Invalid user_id: User does not exist." });
    }
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- Read (Get a car by ID) ---
// This function remains largely the same, but will now return user_id as well.
export const getCarById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ message: "You should provide a valid car ID." });
    }

    const carQuery = "SELECT * FROM cars WHERE id = $1;";
    const result = await pool.query(carQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "There is no car with this ID." });
    }

    res.status(200).json({ car: result.rows[0] });
  } catch (error: any) {
    console.error("Error fetching car by ID:", error);
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- Read (Get all cars) ---
// This function remains largely the same, but will now return user_id as well.
export const getCars = async (req: Request, res: Response) => {
  try {
    const carsQuery = "SELECT * FROM cars ORDER BY createdAt DESC;";
    const result = await pool.query(carsQuery);

    res.status(200).json({ cars: result.rows });
  } catch (error: any) {
    console.error("Error fetching all cars:", error);
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- NEW: Read (Get cars by User ID) ---
export const getCarsByUserId = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.user_id, 10); // Assuming user_id is a URL parameter

    if (isNaN(userId)) {
      return res
        .status(400)
        .json({ message: "You should provide a valid User ID." });
    }

    // Optional: Check if user exists
    // const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    // if (userExists.rows.length === 0) {
    //     return res.status(404).json({ message: "User with the provided ID does not exist." });
    // }

    const carsQuery =
      "SELECT * FROM cars WHERE user_id = $1 ORDER BY createdAt DESC;";
    const result = await pool.query(carsQuery, [userId]);

    // It's fine to return an empty array if a user has no cars
    res.status(200).json({ cars: result.rows });
  } catch (error: any) {
    console.error("Error fetching cars by User ID:", error);
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- Update (Update a car by ID) ---
// This function needs to handle potential updates to user_id.
export const updateCar = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Ensure user_id can be part of the updates
    const updates: Partial<Omit<CarType, "id" | "createdAt" | "updatedAt">> =
      req.body;

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ message: "You should provide a valid car ID for updating." });
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No update data provided for the car." });
    }

    // Optional: Validate if user_id exists if it's being updated and is not null
    if (updates.user_id !== undefined && updates.user_id !== null) {
      const userExists = await pool.query(
        "SELECT id FROM users WHERE id = $1",
        [updates.user_id],
      );
      if (userExists.rows.length === 0) {
        return res.status(404).json({
          message: "User with the provided user_id for update does not exist.",
        });
      }
    }

    const { text: setClause, values: updateValues } =
      buildUpdateSetClauseForCar(updates);

    const updateCarQuery = `
      UPDATE cars
      SET ${setClause}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = $${updateValues.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(updateCarQuery, [...updateValues, id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "There is no car with the provided ID to update." });
    }

    res
      .status(200)
      .json({ message: "Car updated successfully.", car: result.rows[0] });
  } catch (error: any) {
    console.error("Error updating car:", error);
    if (
      error.message &&
      error.message.includes("No fields to update provided")
    ) {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === "23505" && error.constraint === "cars_matricule_key") {
      return res.status(409).json({
        message: "Matricule (license plate) already exists for another car.",
      });
    }
    if (error.code === "23503" && error.constraint === "fk_user") {
      return res
        .status(400)
        .json({ message: "Invalid user_id for update: User does not exist." });
    }
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- Delete (Delete a car by ID) ---
// This function remains the same.
export const deleteCar = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ message: "You should provide a valid car ID for deletion." });
    }

    const deleteCarQuery = "DELETE FROM cars WHERE id = $1 RETURNING id;";
    const result = await pool.query(deleteCarQuery, [id]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "There is no car with this ID to delete." });
    }

    res.status(200).json({ message: "Car deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting car:", error);
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};
