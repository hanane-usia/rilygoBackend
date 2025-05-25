/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB.js";
import { UserType } from "../models/User.js";

// --- Helper function to dynamically build SET clause for updates ---
const buildUpdateSetClause = (
  fields: Partial<UserType>,
): { text: string; values: any[] } => {
  const keys = Object.keys(fields).filter((key) => key !== "id"); // Exclude 'id' from SET clause
  if (keys.length === 0) {
    throw new Error("No fields to update provided.");
  }
  const setClauses = keys.map((key, index) => `${key} = $${index + 1}`);
  const values = keys.map((key) => (fields as any)[key]);
  return {
    text: setClauses.join(", "),
    values,
  };
};

// --- Create (add a user to the database) ---
const addUser = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password, // Ensure this is hashed before sending to the DB in a real app
      phone,
      address,
      city,
      state,
      zip,
      country,
    }: UserType = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    const newUserQuery = `
      INSERT INTO users (name, email, password, phone, address, city, state, zip, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, email, phone, address, city, state, zip, country, createdAt, updatedAt;
    `;
    const values = [
      name,
      email,
      password,
      phone,
      address,
      city,
      state,
      zip,
      country,
    ];

    const result = await pool.query(newUserQuery, values);

    res
      .status(201)
      .json({ message: "User created successfully", user: result.rows[0] });
  } catch (error: any) {
    console.error(error);
    if (error.code === "23505" && error.constraint === "users_email_key") {
      // Unique violation for email
      return res.status(409).json({ message: "Email already exists." });
    }
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- Read (get a user by ID) ---
const getUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); // Assuming ID comes from URL parameter e.g., /users/:id

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ message: "You should provide a valid user ID." });
    }

    const userQuery =
      "SELECT id, name, email, phone, address, city, state, zip, country, createdAt, updatedAt FROM users WHERE id = $1;";
    const result = await pool.query(userQuery, [id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "There is no user with this ID." });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- Read (get all users) ---
const getAllUser = async (req: Request, res: Response) => {
  try {
    const usersQuery =
      "SELECT id, name, email, phone, address, city, state, zip, country, createdAt, updatedAt FROM users ORDER BY createdAt DESC;";
    const result = await pool.query(usersQuery);

    // It's okay if there are no users, an empty array is a valid response.
    // The original check for '!users' is more for cases where the query itself might fail in a way that returns null/undefined,
    // but pool.query would typically throw an error in such cases or return an empty rows array.
    res.status(200).json({ users: result.rows });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- Update (updating a user) ---
const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); // Assuming ID from URL parameter
    const updates: Partial<UserType> = req.body;

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ message: "You should provide a valid user ID." });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update data provided." });
    }

    // Remove id from updates if present, as we don't update the primary key
    delete updates.id;
    // Remove createdAt if present, as it shouldn't be manually updated
    delete updates.createdAt;
    // updatedAt will be handled by the database trigger or explicitly set to NOW()

    const { text: setClause, values: updateValues } =
      buildUpdateSetClause(updates);

    const updateUserQuery = `
      UPDATE users
      SET ${setClause}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = $${updateValues.length + 1}
      RETURNING id, name, email, phone, address, city, state, zip, country, createdAt, updatedAt;
    `;

    const result = await pool.query(updateUserQuery, [...updateValues, id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "There is no user with the provided ID to update." });
    }

    res
      .status(200) // 200 OK is more common for successful updates that return content
      .json({
        message: "The user has been updated successfully.",
        user: result.rows[0],
      });
  } catch (error: any) {
    console.error(error);
    if (error.message === "No fields to update provided.") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === "23505" && error.constraint === "users_email_key") {
      // Unique violation for email
      return res
        .status(409)
        .json({ message: "Email already exists for another user." });
    }
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};

// --- Delete (delete a user) ---
const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); // Assuming ID from URL parameter

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ message: "You should provide a valid user ID." });
    }

    const deleteUserQuery = "DELETE FROM users WHERE id = $1 RETURNING id;"; // RETURNING id can confirm deletion
    const result = await pool.query(deleteUserQuery, [id]);

    if (result.rowCount === 0) {
      // rowCount indicates how many rows were affected. If 0, no user was found with that ID.
      return res
        .status(404)
        .json({ message: "There is no user with this ID in the DB." });
    }

    res
      .status(200)
      .json({ message: "The user has been deleted successfully." });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `There was an error: ${error.message || error}` });
  }
};
const getUserWithCars = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID de l'utilisateur",
      });
    }

    const query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.address,
        u.city,
        u.state,
        u.country,
        u.createdAt as user_created_at,
        c.id as car_id,
        c.mark,
        c.matricule,
        c.model,
        c.year,
        c.updatedAt as car_updated_at
      FROM users u
      LEFT JOIN cars c ON u.id = c.user_id
      WHERE u.id = $1
      ORDER BY c.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Utilisateur non trouvé",
      });
    }

    // Structurer la réponse
    const user = {
      id: result.rows[0].user_id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      address: result.rows[0].address,
      phone: result.rows[0].phone,
      city: result.rows[0].city,
      state: result.rows[0].state,
      country: result.rows[0].country,
      createdAt: result.rows[0].user_created_at,
      updatedAt: result.rows[0].user_updated_at,
      cars: result.rows
        .filter((row) => row.car_id !== null)
        .map((row) => ({
          id: row.car_id,
          mark: row.mark,
          matricule: row.matricule,
          model: row.model,
          year: row.year,
        })),
    };

    res.status(200).json({ user });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

export {
  addUser,
  getAllUser,
  getUser,
  updateUser,
  deleteUser,
  getUserWithCars,
};
