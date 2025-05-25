/** @format */
import express from "express";
import pool from "../db/pgDB";

const router = express.Router();

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Récupérer toutes les catégories
 *     description: Retourne la liste de toutes les catégories avec leurs sous-catégories associées
 *     tags: [Catégories]
 *     responses:
 *       200:
 *         description: Liste des catégories récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Catégories récupérées avec succès"
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Visite Technique"
 *                       description:
 *                         type: string
 *                         example: "Services de réparation et maintenance mécanique"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       subcategories:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: "Test de suspension"
 *                             description:
 *                               type: string
 *                               example: "Test de suspension"
 *                 count:
 *                   type: integer
 *                   example: 6
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Récupérer une catégorie spécifique
 *     description: Retourne les détails d'une catégorie spécifique avec ses sous-catégories
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la catégorie
 *     responses:
 *       200:
 *         description: Catégorie récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Catégorie récupérée avec succès"
 *                 category:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Visite Technique"
 *                     description:
 *                       type: string
 *                       example: "Services de réparation et maintenance mécanique"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     subcategories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Test de suspension"
 *                           description:
 *                             type: string
 *                             example: "Test de suspension"
 *       404:
 *         description: Catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Catégorie non trouvée"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /categories/{id}/subcategories:
 *   get:
 *     summary: Récupérer les sous-catégories d'une catégorie
 *     description: Retourne la liste des sous-catégories appartenant à une catégorie spécifique
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la catégorie
 *     responses:
 *       200:
 *         description: Sous-catégories récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sous-catégories récupérées avec succès"
 *                 category:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Visite Technique"
 *                 subcategories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Test de suspension"
 *                       description:
 *                         type: string
 *                         example: "Test de suspension"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   example: 5
 *       404:
 *         description: Catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Catégorie non trouvée"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /subcategories:
 *   get:
 *     summary: Récupérer toutes les sous-catégories
 *     description: Retourne la liste de toutes les sous-catégories avec les informations de leur catégorie parente
 *     tags: [Catégories]
 *     responses:
 *       200:
 *         description: Sous-catégories récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sous-catégories récupérées avec succès"
 *                 subcategories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Test de suspension"
 *                       description:
 *                         type: string
 *                         example: "Test de suspension"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       category_id:
 *                         type: integer
 *                         example: 1
 *                       category_name:
 *                         type: string
 *                         example: "Visite Technique"
 *                 count:
 *                   type: integer
 *                   example: 30
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /subcategories/{id}:
 *   get:
 *     summary: Récupérer une sous-catégorie spécifique
 *     description: Retourne les détails d'une sous-catégorie spécifique avec les informations de sa catégorie parente
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sous-catégorie
 *     responses:
 *       200:
 *         description: Sous-catégorie récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sous-catégorie récupérée avec succès"
 *                 subcategory:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Test de suspension"
 *                     description:
 *                       type: string
 *                       example: "Test de suspension"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     category_id:
 *                       type: integer
 *                       example: 1
 *                     category_name:
 *                       type: string
 *                       example: "Visite Technique"
 *                     category_description:
 *                       type: string
 *                       example: "Services de réparation et maintenance mécanique"
 *       404:
 *         description: Sous-catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sous-catégorie non trouvée"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /categories/stats/overview:
 *   get:
 *     summary: Obtenir les statistiques des catégories
 *     description: Retourne des statistiques détaillées sur les catégories, les garages associés et les sous-catégories
 *     tags: [Statistiques]
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Statistiques récupérées avec succès"
 *                 global_stats:
 *                   type: object
 *                   properties:
 *                     total_categories:
 *                       type: integer
 *                       example: 6
 *                     total_subcategories:
 *                       type: integer
 *                       example: 30
 *                     total_garages:
 *                       type: integer
 *                       example: 5
 *                     available_garages:
 *                       type: integer
 *                       example: 4
 *                     total_capacity:
 *                       type: integer
 *                       example: 26
 *                 category_stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Visite Technique"
 *                       description:
 *                         type: string
 *                         example: "Services de réparation et maintenance mécanique"
 *                       total_garages:
 *                         type: integer
 *                         example: 1
 *                       available_garages:
 *                         type: integer
 *                         example: 1
 *                       total_capacity:
 *                         type: integer
 *                         example: 5
 *                       average_capacity:
 *                         type: number
 *                         format: float
 *                         example: 5.0
 *                       total_subcategories:
 *                         type: integer
 *                         example: 6
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /search/garages:
 *   get:
 *     summary: Rechercher des garages par nom de catégorie ou sous-catégorie
 *     description: Permet de rechercher des garages en filtrant par nom de catégorie, sous-catégorie, nom de garage, disponibilité et capacité
 *     tags: [Recherche]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Nom de la catégorie (recherche partielle)
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *         description: Nom de la sous-catégorie (recherche partielle)
 *       - in: query
 *         name: garage_name
 *         schema:
 *           type: string
 *         description: Nom du garage (recherche partielle)
 *       - in: query
 *         name: isDisponible
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Disponibilité du garage
 *       - in: query
 *         name: min_capacity
 *         schema:
 *           type: integer
 *         description: Capacité minimale
 *       - in: query
 *         name: max_capacity
 *         schema:
 *           type: integer
 *         description: Capacité maximale
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre de résultats par page
 *     responses:
 *       200:
 *         description: Recherche effectuée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recherche effectuée avec succès"
 *                 search_params:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       example: "Visite"
 *                     subcategory:
 *                       type: string
 *                       example: "Test"
 *                     garage_name:
 *                       type: string
 *                       example: "Mécanique"
 *                     isDisponible:
 *                       type: string
 *                       example: "true"
 *                     min_capacity:
 *                       type: integer
 *                       example: 3
 *                     max_capacity:
 *                       type: integer
 *                       example: 10
 *                 garages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Garage Mécanique Pro"
 *                       category_id:
 *                         type: integer
 *                         example: 1
 *                       capacity:
 *                         type: integer
 *                         example: 5
 *                       isDisponible:
 *                         type: boolean
 *                         example: true
 *                       address:
 *                         type: string
 *                         example: "123 Rue de la Mécanique, Casablanca"
 *                       phone:
 *                         type: string
 *                         example: "+212522123456"
 *                       latitude:
 *                         type: number
 *                         format: double
 *                         example: 33.5731
 *                       longitude:
 *                         type: number
 *                         format: double
 *                         example: -7.5898
 *                       main_image:
 *                         type: string
 *                         example: "https://example.com/images/garage1_main.jpg"
 *                       description:
 *                         type: string
 *                         example: "Centre technique spécialisé dans les contrôles mécaniques"
 *                       category_name:
 *                         type: string
 *                         example: "Visite Technique"
 *                       subcategories:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: "Test de suspension"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalGarages:
 *                       type: integer
 *                       example: 1
 *                     hasNext:
 *                       type: boolean
 *                       example: false
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
      ORDER BY g.createdAt DESC
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
