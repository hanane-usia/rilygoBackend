/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB";
import { GaragisteType } from "../models/Garagiste";

// Ajouter un garagiste
const addGaragiste = async (req: Request, res: Response) => {
  try {
    const newGaragiste: GaragisteType = req.body;

    if (
      !newGaragiste ||
      !newGaragiste.name ||
      !newGaragiste.email ||
      !newGaragiste.password
    ) {
      return res.status(400).json({
        message: "Vous devez fournir au moins un nom, email et mot de passe",
      });
    }

    const query = `
      INSERT INTO garagiste (name, email, password, phone, profileImage, deplomeImage, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, name, email, phone, profileImage, deplomeImage, createdAt, updatedAt
    `;

    const values = [
      newGaragiste.name,
      newGaragiste.email,
      newGaragiste.password,
      newGaragiste.phone || null,
      newGaragiste.profileImage || null,
      newGaragiste.deplomeImage || null,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Garagiste créé avec succès",
      garagiste: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);

    // Gestion des erreurs spécifiques à PostgreSQL
    if (error.code === "23505") {
      // Violation de contrainte unique
      return res.status(409).json({
        message: "Un garagiste avec cet email existe déjà",
      });
    }

    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir tous les garagistes
const getAllGaragistes = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = "";
    let queryParams: any[] = [];
    let paramCount = 1;

    // Ajouter une recherche si fournie
    if (search) {
      whereClause = "WHERE name ILIKE $1 OR email ILIKE $1";
      queryParams.push(`%${search}%`);
      paramCount = 2;
    }

    // Requête pour compter le total de garagistes
    const countQuery = `SELECT COUNT(*) FROM garagiste ${whereClause}`;
    const countResult = await pool.query(
      countQuery,
      search ? [`%${search}%`] : [],
    );
    const totalGaragistes = parseInt(countResult.rows[0].count);

    // Requête pour obtenir les garagistes avec pagination
    const query = `
      SELECT id, name, email, phone, profileImage, deplomeImage, createdAt, updatedAt
      FROM garagiste 
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(Number(limit), offset);
    const result = await pool.query(query, queryParams);

    res.status(200).json({
      garagistes: result.rows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalGaragistes / Number(limit)),
        totalGaragistes,
        hasNext: offset + Number(limit) < totalGaragistes,
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir un garagiste par ID
const getGaragiste = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID du garagiste",
      });
    }

    const query = `
      SELECT id, name, email, phone, profileImage, deplomeImage, createdAt, updatedAt
      FROM garagiste 
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Aucun garagiste trouvé avec cet ID",
      });
    }

    res.status(200).json({ garagiste: result.rows[0] });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Mettre à jour un garagiste
const updateGaragiste = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID du garagiste",
      });
    }

    // Construire la requête dynamiquement en fonction des champs fournis
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (key !== "id" && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        message: "Aucun champ à mettre à jour fourni",
      });
    }

    updateFields.push(`updatedAt = NOW()`);
    values.push(id);

    const query = `
      UPDATE garagiste 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, email, phone, profileImage, deplomeImage, createdAt, updatedAt
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Aucun garagiste trouvé avec cet ID",
      });
    }

    res.status(200).json({
      message: "Le garagiste a été mis à jour avec succès",
      garagiste: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Un garagiste avec cet email existe déjà",
      });
    }

    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Supprimer un garagiste
const deleteGaragiste = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID du garagiste",
      });
    }

    const query = `
      DELETE FROM garagiste 
      WHERE id = $1 
      RETURNING id, name, email
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Aucun garagiste trouvé avec cet ID",
      });
    }

    res.status(200).json({
      message: "Le garagiste a été supprimé avec succès",
      deletedGaragiste: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Rechercher des garagistes
const searchGaragistes = async (req: Request, res: Response) => {
  try {
    const { query: searchQuery, field = "name" } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        message: "Vous devez fournir un terme de recherche",
      });
    }

    const allowedFields = ["name", "email", "phone"];
    if (!allowedFields.includes(field as string)) {
      return res.status(400).json({
        message: "Champ de recherche non valide",
      });
    }

    const query = `
      SELECT id, name, email, phone, profileImage, deplomeImage, createdAt, updatedAt
      FROM garagiste 
      WHERE ${field} ILIKE $1
      ORDER BY createdAt DESC
    `;

    const result = await pool.query(query, [`%${searchQuery}%`]);

    res.status(200).json({
      garagistes: result.rows,
      count: result.rows.length,
      searchTerm: searchQuery,
      searchField: field,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Login garagiste (fonction bonus)
const loginGaragiste = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email et mot de passe requis",
      });
    }

    const query = `
      SELECT id, name, email, phone, profileImage, deplomeImage, createdAt, updatedAt, password
      FROM garagiste 
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Email ou mot de passe incorrect",
      });
    }

    const garagiste = result.rows[0];

    // Note: En production, utilisez bcrypt pour comparer les mots de passe hachés
    if (garagiste.password !== password) {
      return res.status(401).json({
        message: "Email ou mot de passe incorrect",
      });
    }

    // Retourner les données sans le mot de passe
    const { password: _, ...garagisteData } = garagiste;

    res.status(200).json({
      message: "Connexion réussie",
      garagiste: garagisteData,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

export {
  addGaragiste,
  getAllGaragistes,
  getGaragiste,
  updateGaragiste,
  deleteGaragiste,
  searchGaragistes,
  loginGaragiste,
};
