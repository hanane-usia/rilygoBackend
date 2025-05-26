/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB.js";

export type FavoriteType = {
  id?: number;
  garageId: number; // ID du garage (récupéré via API)
  automobileId: number; // FK vers cars table (même DB)
  userId?: number; // Calculé depuis automobileId
  likedAt: Date; // Date d'ajout aux favoris
  createdAt?: Date;
  updatedAt?: Date;
};

// Configuration de l'API Gateway/Server Garagiste
const GARAGE_API_BASE_URL =
  process.env.GARAGE_API_URL || "http://localhost:5001/api";

const callGarageAPI = async (endpoint: string) => {
  try {
    const response = await fetch(`${GARAGE_API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Garage API Error:", error);
    return null;
  }
};

const addFavorite = async (req: Request, res: Response) => {
  try {
    const { garageId, automobileId } = req.body;

    if (!garageId || !automobileId) {
      return res.status(400).json({
        message: "garageId et automobileId (userId) sont requis",
      });
    }

    // 1. Vérifier que l'utilisateur existe
    const userCheck = await pool.query(
      `SELECT id, name, email FROM users WHERE id = $1`,
      [automobileId],
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Utilisateur non trouvé",
      });
    }

    // 2. Appeler l'API pour vérifier le garage
    const garageData = await callGarageAPI(`/garages/${garageId}`);
    if (!garageData || !garageData.garage) {
      return res.status(404).json({
        message: "Garage non trouvé ou service garage indisponible",
      });
    }

    // 3. Vérifier si déjà en favoris
    const existingFavorite = await pool.query(
      `SELECT id FROM favorites WHERE garageId = $1 AND automobileId = $2`,
      [garageId, automobileId],
    );

    if (existingFavorite.rows.length > 0) {
      return res.status(409).json({
        message: "Ce garage est déjà dans vos favoris",
      });
    }

    // 4. Ajouter aux favoris
    const query = `
      INSERT INTO favorites (garageId, automobileId, likedAt, createdAt, updatedAt)
      VALUES ($1, $2, NOW(), NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [garageId, automobileId]);

    res.status(201).json({
      message: "Garage ajouté aux favoris avec succès",
      favorite: {
        ...result.rows[0],
        user: userCheck.rows[0],
        garage: garageData.garage,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};
// Obtenir les favoris d'un utilisateur
const getFavoritesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "ID utilisateur requis",
      });
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Requête simple - automobileId = userId
    const query = `
      SELECT 
        f.*,
        u.name as user_name,
        u.email as user_email
      FROM favorites f
      LEFT JOIN users u ON f.automobileId = u.id
      WHERE f.automobileId = $1
      ORDER BY f.likedAt DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, Number(limit), offset]);

    // Enrichir avec les données des garages (API calls)
    const enrichedFavorites = await Promise.all(
      result.rows.map(async (favorite) => {
        const garageData = await callGarageAPI(`/garages/${favorite.garageid}`);

        return {
          id: favorite.id,
          garageId: favorite.garageid,
          userId: favorite.automobileid, // automobileId = userId
          likedAt: favorite.likedat,
          createdAt: favorite.createdat,
          updatedAt: favorite.updatedat,
          user: {
            id: favorite.automobileid,
            name: favorite.user_name,
            email: favorite.user_email,
          },
          garage: garageData?.garage || {
            id: favorite.garageid,
            name: "Garage indisponible",
            address: "N/A",
          },
        };
      }),
    );

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM favorites WHERE automobileId = $1`;
    const countResult = await pool.query(countQuery, [userId]);
    const totalFavorites = parseInt(countResult.rows[0].count);

    res.status(200).json({
      message: "Favoris de l'utilisateur récupérés",
      userId: Number(userId),
      favorites: enrichedFavorites,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalFavorites / Number(limit)),
        totalFavorites,
        hasNext: offset + Number(limit) < totalFavorites,
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

// Obtenir tous les favoris (admin)
const getAllFavorites = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, garageId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 1;

    if (garageId) {
      whereConditions.push(`f.garageId = $${paramCount}`);
      queryParams.push(Number(garageId));
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const query = `
      SELECT 
        f.*,
        u.name as user_name,
        u.email as user_email,
        c.mark as car_mark,
        c.model as car_model,
        c.matricule as car_matricule
      FROM favorites f
      LEFT JOIN users u ON f.userId = u.id
      LEFT JOIN cars c ON f.automobileId = c.id
      ${whereClause}
      ORDER BY f.likedAt DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(Number(limit), offset);
    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM favorites f ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalFavorites = parseInt(countResult.rows[0].count);

    res.status(200).json({
      message: "Tous les favoris récupérés",
      favorites: result.rows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalFavorites / Number(limit)),
        totalFavorites,
        hasNext: offset + Number(limit) < totalFavorites,
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

// Supprimer un favori
const deleteFavorite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!id) {
      return res.status(400).json({
        message: "ID du favori requis",
      });
    }

    let query = `DELETE FROM favorites WHERE id = $1`;
    let queryParams = [id];

    // Si userId fourni, vérifier que le favori appartient à l'utilisateur
    if (userId) {
      query += ` AND automobileId = $2`; // automobileId = userId
      queryParams.push(userId as any);
    }

    query += ` RETURNING *`;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Favori non trouvé ou ne vous appartient pas",
      });
    }

    res.status(200).json({
      message: "Favori supprimé avec succès",
      deletedFavorite: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Vérifier si un garage est en favori
const checkFavorite = async (req: Request, res: Response) => {
  try {
    const { garageId, automobileId } = req.params;

    if (!garageId || !automobileId) {
      return res.status(400).json({
        message: "garageId et automobileId requis",
      });
    }

    const query = `
      SELECT f.*, u.name as user_name, c.mark as car_mark, c.model as car_model
      FROM favorites f
      LEFT JOIN users u ON f.userId = u.id
      LEFT JOIN cars c ON f.automobileId = c.id
      WHERE f.garageId = $1 AND f.automobileId = $2
    `;

    const result = await pool.query(query, [garageId, automobileId]);

    res.status(200).json({
      message: "Vérification du favori",
      isFavorite: result.rows.length > 0,
      favorite: result.rows.length > 0 ? result.rows[0] : null,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Toggle favori (ajouter si pas présent, supprimer si présent)
const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const { garageId, automobileId } = req.body; // automobileId = userId

    if (!garageId || !automobileId) {
      return res.status(400).json({
        message: "garageId et automobileId (userId) requis",
      });
    }

    // Vérifier si existe déjà
    const existingQuery = `SELECT id FROM favorites WHERE garageId = $1 AND automobileId = $2`;
    const existingResult = await pool.query(existingQuery, [
      garageId,
      automobileId,
    ]);

    if (existingResult.rows.length > 0) {
      // Supprimer si existe
      const deleteQuery = `DELETE FROM favorites WHERE id = $1 RETURNING *`;
      const deleteResult = await pool.query(deleteQuery, [
        existingResult.rows[0].id,
      ]);

      res.status(200).json({
        message: "Garage retiré des favoris",
        action: "removed",
        favorite: deleteResult.rows[0],
      });
    } else {
      // Vérifier que l'utilisateur existe
      const userCheck = await pool.query(`SELECT id FROM users WHERE id = $1`, [
        automobileId,
      ]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      // Vérifier le garage via API
      const garageData = await callGarageAPI(`/garages/${garageId}`);
      if (!garageData?.garage) {
        return res.status(404).json({ message: "Garage non trouvé" });
      }

      // Ajouter aux favoris
      const insertQuery = `
        INSERT INTO favorites (garageId, automobileId, likedAt, createdAt, updatedAt)
        VALUES ($1, $2, NOW(), NOW(), NOW())
        RETURNING *
      `;
      const insertResult = await pool.query(insertQuery, [
        garageId,
        automobileId,
      ]);

      res.status(201).json({
        message: "Garage ajouté aux favoris",
        action: "added",
        favorite: insertResult.rows[0],
      });
    }
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

export {
  addFavorite,
  getFavoritesByUser,
  getAllFavorites,
  deleteFavorite,
  checkFavorite,
  toggleFavorite,
};
