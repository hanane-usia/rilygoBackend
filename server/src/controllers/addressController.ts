/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB.js";

type AddressType = {
  id?: string;
  user_id: string;
  place: string;
  type: string;
};

// Ajouter une adresse à un utilisateur
const addAddress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { place, type }: AddressType = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID de l'utilisateur",
      });
    }

    if (!place || !type) {
      return res.status(400).json({
        message: "Vous devez fournir le lieu et le type d'adresse",
      });
    }

    // Vérifier si l'utilisateur existe
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
      userId,
    ]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Utilisateur non trouvé",
      });
    }

    const query = `
      INSERT INTO address (user_id, place, type)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [userId, place, type]);

    res.status(201).json({
      message: "Adresse ajoutée avec succès",
      address: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir toutes les adresses d'un utilisateur
const getUserAddresses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID de l'utilisateur",
      });
    }

    const query = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM address a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.user_id = $1
      ORDER BY a.id
    `;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      addresses: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir une adresse spécifique
const getAddress = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;

    if (!userId || !addressId) {
      return res.status(400).json({
        message:
          "Vous devez fournir l'ID de l'utilisateur et l'ID de l'adresse",
      });
    }

    const query = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM address a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.user_id = $1 AND a.id = $2
    `;

    const result = await pool.query(query, [userId, addressId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Adresse non trouvée pour cet utilisateur",
      });
    }

    res.status(200).json({
      address: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Mettre à jour une adresse
const updateAddress = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;
    const { place, type } = req.body;

    if (!userId || !addressId) {
      return res.status(400).json({
        message:
          "Vous devez fournir l'ID de l'utilisateur et l'ID de l'adresse",
      });
    }

    // Vérifier si l'adresse appartient à l'utilisateur
    const checkQuery = "SELECT id FROM address WHERE user_id = $1 AND id = $2";
    const checkResult = await pool.query(checkQuery, [userId, addressId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        message: "Adresse non trouvée pour cet utilisateur",
      });
    }

    // Construire la requête dynamiquement
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (place !== undefined) {
      updateFields.push(`place = $${paramCount}`);
      values.push(place);
      paramCount++;
    }

    if (type !== undefined) {
      updateFields.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        message: "Aucun champ à mettre à jour fourni",
      });
    }

    values.push(addressId, userId);

    const query = `
      UPDATE address 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.status(200).json({
      message: "Adresse mise à jour avec succès",
      address: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Supprimer une adresse
const deleteAddress = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;

    if (!userId || !addressId) {
      return res.status(400).json({
        message:
          "Vous devez fournir l'ID de l'utilisateur et l'ID de l'adresse",
      });
    }

    const query = `
      DELETE FROM address 
      WHERE user_id = $1 AND id = $2 
      RETURNING id, place, type
    `;

    const result = await pool.query(query, [userId, addressId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Adresse non trouvée pour cet utilisateur",
      });
    }

    res.status(200).json({
      message: "Adresse supprimée avec succès",
      deletedAddress: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir un utilisateur avec toutes ses adresses
const getUserWithAddresses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
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
        u.city,
        u.state,
        u.country,
        a.id as address_id,
        a.place,
        a.type
      FROM users u
      LEFT JOIN address a ON u.id = a.user_id
      WHERE u.id = $1
      ORDER BY a.id
    `;

    const result = await pool.query(query, [userId]);

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
      phone: result.rows[0].phone,
      city: result.rows[0].city,
      state: result.rows[0].state,
      country: result.rows[0].country,
      addresses: result.rows
        .filter((row: any) => row.address_id !== null)
        .map((row: any) => ({
          id: row.address_id,
          place: row.place,
          type: row.type,
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
  addAddress,
  getUserAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
  getUserWithAddresses,
};
