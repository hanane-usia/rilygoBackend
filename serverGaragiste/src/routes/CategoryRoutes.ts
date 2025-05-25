/** @format */
import express from "express";
import pool from "../db/pgDB";

const router = express.Router();

// Obtenir toutes les catégories avec leurs sous-catégories
router.get("/categories", async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        c.updated_at,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'id', s.id,
            'name', s.name,
            'description', s.description
          )
        ) FILTER (WHERE s.id IS NOT NULL) as subcategories
      FROM categories c
      LEFT JOIN subcategories s ON c.id = s.category_id
      GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at
      ORDER BY c.name
    `;

    const result = await pool.query(query);

    res.status(200).json({
      message: "Catégories récupérées avec succès",
      categories: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
});

// Obtenir une catégorie spécifique avec ses sous-catégories
router.get("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        c.updated_at,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'id', s.id,
            'name', s.name,
            'description', s.description
          )
        ) FILTER (WHERE s.id IS NOT NULL) as subcategories
      FROM categories c
      LEFT JOIN subcategories s ON c.id = s.category_id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Catégorie non trouvée",
      });
    }

    res.status(200).json({
      message: "Catégorie récupérée avec succès",
      category: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
});

// Obtenir les sous-catégories d'une catégorie
router.get("/categories/:id/subcategories", async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que la catégorie existe
    const categoryCheck = await pool.query(
      "SELECT id, name FROM categories WHERE id = $1",
      [id],
    );
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Catégorie non trouvée",
      });
    }

    const query = `
      SELECT id, name, description, created_at, updated_at
      FROM subcategories 
      WHERE category_id = $1
      ORDER BY name
    `;

    const result = await pool.query(query, [id]);

    res.status(200).json({
      message: "Sous-catégories récupérées avec succès",
      category: categoryCheck.rows[0],
      subcategories: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
});

// Obtenir toutes les sous-catégories
router.get("/subcategories", async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        c.id as category_id,
        c.name as category_name
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      ORDER BY c.name, s.name
    `;

    const result = await pool.query(query);

    res.status(200).json({
      message: "Sous-catégories récupérées avec succès",
      subcategories: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
});

// Obtenir une sous-catégorie spécifique
router.get("/subcategories/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.description as category_description
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Sous-catégorie non trouvée",
      });
    }

    res.status(200).json({
      message: "Sous-catégorie récupérée avec succès",
      subcategory: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
});

// Obtenir les statistiques des catégories
router.get("/categories/stats/overview", async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(DISTINCT g.id) as total_garages,
        COUNT(CASE WHEN g.isDisponible = true THEN 1 END) as available_garages,
        COALESCE(SUM(g.capacity), 0) as total_capacity,
        COALESCE(AVG(g.capacity), 0) as average_capacity,
        COUNT(DISTINCT s.id) as total_subcategories
      FROM categories c
      LEFT JOIN garages g ON c.id = g.category_id
      LEFT JOIN subcategories s ON c.id = s.category_id
      GROUP BY c.id, c.name, c.description
      ORDER BY total_garages DESC, c.name
    `;

    const result = await pool.query(query);

    // Statistiques globales
    const globalStatsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_categories,
        COUNT(DISTINCT s.id) as total_subcategories,
        COUNT(DISTINCT g.id) as total_garages,
        COUNT(CASE WHEN g.isDisponible = true THEN 1 END) as available_garages,
        COALESCE(SUM(g.capacity), 0) as total_capacity
      FROM categories c
      LEFT JOIN subcategories s ON c.id = s.category_id
      LEFT JOIN garages g ON c.id = g.category_id
    `;

    const globalStats = await pool.query(globalStatsQuery);

    res.status(200).json({
      message: "Statistiques récupérées avec succès",
      global_stats: globalStats.rows[0],
      category_stats: result.rows,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
});

// Rechercher des garages par nom de catégorie ou sous-catégorie
router.get("/search/garages", async (req, res) => {
  try {
    const {
      category,
      subcategory,
      garage_name,
      isDisponible,
      min_capacity,
      max_capacity,
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 1;

    // Filtrer par nom de catégorie
    if (category) {
      whereConditions.push(`c.name ILIKE $${paramCount}`);
      queryParams.push(`%${category}%`);
      paramCount++;
    }

    // Filtrer par nom de sous-catégorie
    if (subcategory) {
      whereConditions.push(`s.name ILIKE $${paramCount}`);
      queryParams.push(`%${subcategory}%`);
      paramCount++;
    }

    // Filtrer par nom de garage
    if (garage_name) {
      whereConditions.push(`g.name ILIKE $${paramCount}`);
      queryParams.push(`%${garage_name}%`);
      paramCount++;
    }

    // Filtrer par disponibilité
    if (isDisponible !== undefined) {
      whereConditions.push(`g.isDisponible = $${paramCount}`);
      queryParams.push(isDisponible === "true");
      paramCount++;
    }

    // Filtrer par capacité minimale
    if (min_capacity) {
      whereConditions.push(`g.capacity >= $${paramCount}`);
      queryParams.push(Number(min_capacity));
      paramCount++;
    }

    // Filtrer par capacité maximale
    if (max_capacity) {
      whereConditions.push(`g.capacity <= $${paramCount}`);
      queryParams.push(Number(max_capacity));
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Compter le total
    const countQuery = `
      SELECT COUNT(DISTINCT g.id) 
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      LEFT JOIN garage_subcategories gs ON g.id = gs.garage_id
      LEFT JOIN subcategories s ON gs.subcategory_id = s.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const totalGarages = parseInt(countResult.rows[0].count);

    // Récupérer les garages
    const query = `
      SELECT DISTINCT
        g.*,
        c.name as category_name,
        ARRAY_AGG(
          DISTINCT JSON_BUILD_OBJECT(
            'id', s.id,
            'name', s.name
          )
        ) FILTER (WHERE s.id IS NOT NULL) as subcategories
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      LEFT JOIN garage_subcategories gs ON g.id = gs.garage_id
      LEFT JOIN subcategories s ON gs.subcategory_id = s.id
      ${whereClause}
      GROUP BY g.id, c.id, c.name
      ORDER BY g.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(Number(limit), offset);
    const result = await pool.query(query, queryParams);

    res.status(200).json({
      message: "Recherche effectuée avec succès",
      search_params: {
        category,
        subcategory,
        garage_name,
        isDisponible,
        min_capacity,
        max_capacity,
      },
      garages: result.rows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalGarages / Number(limit)),
        totalGarages,
        hasNext: offset + Number(limit) < totalGarages,
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
});

export default router;
