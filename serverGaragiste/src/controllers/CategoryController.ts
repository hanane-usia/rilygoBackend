/** @format */
import { Request, Response } from "express";
import pool from "../db/pgDB";


// ===== Statistiques des catégories =====
export const getCategoryStats = async (req: Request, res: Response) => {
  try {
    console.log("📊 Récupération des statistiques des catégories...");

    // Statistiques générales
    const generalStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM subcategories) as total_subcategories,
        (SELECT COUNT(DISTINCT garage_id) FROM garage_subcategories) as total_garages_with_services,
        (SELECT COUNT(*) FROM garages WHERE isdisponible = true) as total_available_garages,
        (SELECT COUNT(*) FROM garage_subcategories) as total_garage_service_relations
    `);

    // Statistiques par catégorie
    const categoryStats = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(DISTINCT s.id) as subcategories_count,
        COUNT(DISTINCT gs.garage_id) as garages_count,
        COUNT(DISTINCT CASE WHEN g.isdisponible = true THEN gs.garage_id END) as available_garages_count,
        COUNT(gs.id) as total_services_offered,
        ROUND(
          COUNT(DISTINCT gs.garage_id) * 100.0 / NULLIF((SELECT COUNT(*) FROM garages WHERE isdisponible = true), 0), 
          2
        ) as market_coverage_percentage
      FROM categories c
      LEFT JOIN subcategories s ON c.id = s.category_id
      LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id
      LEFT JOIN garages g ON gs.garage_id = g.id
      GROUP BY c.id, c.name, c.description
      ORDER BY garages_count DESC, subcategories_count DESC
    `);

    // Sous-catégories les plus populaires (basé sur le nombre de garages qui les proposent)
    const popularSubcategories = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        c.name as category_name,
        c.id as category_id,
        COUNT(gs.garage_id) as garages_offering_count,
        ROUND(
          COUNT(gs.garage_id) * 100.0 / NULLIF((SELECT COUNT(*) FROM garages WHERE isdisponible = true), 0), 
          2
        ) as availability_percentage
      FROM subcategories s
      JOIN categories c ON s.category_id = c.id
      LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id
      LEFT JOIN garages g ON gs.garage_id = g.id AND g.isdisponible = true
      GROUP BY s.id, s.name, s.description, c.name, c.id
      HAVING COUNT(gs.garage_id) > 0
      ORDER BY garages_offering_count DESC, availability_percentage DESC
      LIMIT 10
    `);

    // Sous-catégories les moins desservies (nécessitent plus de garages)
    const underservedSubcategories = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        c.name as category_name,
        c.id as category_id,
        COUNT(gs.garage_id) as garages_offering_count,
        ROUND(
          COUNT(gs.garage_id) * 100.0 / NULLIF((SELECT COUNT(*) FROM garages WHERE isdisponible = true), 0), 
          2
        ) as availability_percentage
      FROM subcategories s
      JOIN categories c ON s.category_id = c.id
      LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id
      LEFT JOIN garages g ON gs.garage_id = g.id AND g.isdisponible = true
      GROUP BY s.id, s.name, s.description, c.name, c.id
      ORDER BY garages_offering_count ASC, availability_percentage ASC
      LIMIT 10
    `);

    // Distribution des garages par catégorie (pour créer des graphiques circulaires)
    const categoryDistribution = await pool.query(`
      SELECT 
        c.name as category_name,
        c.id as category_id,
        COUNT(DISTINCT g.id) as garage_count,
        ROUND(
          COUNT(DISTINCT g.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM garages WHERE isdisponible = true), 0), 
          2
        ) as percentage
      FROM categories c
      LEFT JOIN garages g ON c.id = g.category_id AND g.isdisponible = true
      GROUP BY c.id, c.name
      ORDER BY garage_count DESC
    `);

    // Nombre moyen de services par garage par catégorie
    const avgServicesPerGarage = await pool.query(`
      SELECT 
        c.name as category_name,
        c.id as category_id,
        COUNT(DISTINCT g.id) as total_garages,
        COUNT(gs.id) as total_services,
        ROUND(
          CASE 
            WHEN COUNT(DISTINCT g.id) > 0 
            THEN COUNT(gs.id) * 1.0 / COUNT(DISTINCT g.id)
            ELSE 0 
          END, 2
        ) as avg_services_per_garage
      FROM categories c
      LEFT JOIN garages g ON c.id = g.category_id AND g.isdisponible = true
      LEFT JOIN garage_subcategories gs ON g.id = gs.garage_id
      GROUP BY c.id, c.name
      HAVING COUNT(DISTINCT g.id) > 0
      ORDER BY avg_services_per_garage DESC
    `);

    console.log("✅ Statistiques calculées avec succès");

    res.status(200).json({
      success: true,
      message: "Statistiques des catégories récupérées avec succès",
      timestamp: new Date().toISOString(),
      data: {
        general_statistics: {
          total_categories: parseInt(generalStats.rows[0].total_categories),
          total_subcategories: parseInt(generalStats.rows[0].total_subcategories),
          total_garages_with_services: parseInt(generalStats.rows[0].total_garages_with_services),
          total_available_garages: parseInt(generalStats.rows[0].total_available_garages),
          total_garage_service_relations: parseInt(generalStats.rows[0].total_garage_service_relations),
          avg_subcategories_per_category: Math.round((parseInt(generalStats.rows[0].total_subcategories) / parseInt(generalStats.rows[0].total_categories)) * 100) / 100,
          service_coverage_rate: Math.round((parseInt(generalStats.rows[0].total_garages_with_services) / parseInt(generalStats.rows[0].total_available_garages)) * 10000) / 100
        },
        category_breakdown: categoryStats.rows.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          subcategories_count: parseInt(cat.subcategories_count),
          garages_count: parseInt(cat.garages_count),
          available_garages_count: parseInt(cat.available_garages_count),
          total_services_offered: parseInt(cat.total_services_offered),
          market_coverage_percentage: parseFloat(cat.market_coverage_percentage) || 0
        })),
        popular_subcategories: popularSubcategories.rows.map(sub => ({
          id: sub.id,
          name: sub.name,
          description: sub.description,
          category: {
            id: sub.category_id,
            name: sub.category_name
          },
          garages_offering_count: parseInt(sub.garages_offering_count),
          availability_percentage: parseFloat(sub.availability_percentage) || 0
        })),
        underserved_subcategories: underservedSubcategories.rows.map(sub => ({
          id: sub.id,
          name: sub.name,
          description: sub.description,
          category: {
            id: sub.category_id,
            name: sub.category_name
          },
          garages_offering_count: parseInt(sub.garages_offering_count),
          availability_percentage: parseFloat(sub.availability_percentage) || 0,
          improvement_needed: true
        })),
        category_distribution: categoryDistribution.rows.map(dist => ({
          category_id: dist.category_id,
          category_name: dist.category_name,
          garage_count: parseInt(dist.garage_count),
          percentage: parseFloat(dist.percentage) || 0
        })),
        avg_services_per_garage: avgServicesPerGarage.rows.map(avg => ({
          category_id: avg.category_id,
          category_name: avg.category_name,
          total_garages: parseInt(avg.total_garages),
          total_services: parseInt(avg.total_services),
          avg_services_per_garage: parseFloat(avg.avg_services_per_garage)
        })),
        insights: {
          most_popular_category: categoryStats.rows[0]?.name || null,
          least_served_category: categoryStats.rows[categoryStats.rows.length - 1]?.name || null,
          highest_coverage_category: categoryStats.rows.reduce((max, cat) =>
            parseFloat(cat.market_coverage_percentage) > parseFloat(max.market_coverage_percentage || 0) ? cat : max, {}
          )?.name || null,
          recommendations: {
            expand_services: underservedSubcategories.rows.slice(0, 3).map(sub => sub.name),
            popular_services: popularSubcategories.rows.slice(0, 3).map(sub => sub.name)
          }
        }
      }
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération des statistiques des catégories:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques des catégories",
      error: error.message
    });
  }
};

// ===== Récupérer toutes les catégories avec sous-catégories =====
const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { include_subcategories = 'true' } = req.query;

    console.log("📋 Récupération de toutes les catégories...");

    if (include_subcategories === 'true') {
      // Récupérer les catégories avec sous-catégories
      const result = await pool.query(`
        SELECT 
          c.id,
          c.name,
          c.description,
          c.created_at,
          c.updated_at,
          json_agg(
            CASE 
              WHEN s.id IS NOT NULL THEN
                json_build_object(
                  'id', s.id,
                  'name', s.name,
                  'description', s.description,
                  'created_at', s.created_at,
                  'updated_at', s.updated_at
                )
              ELSE NULL
            END
            ORDER BY s.name
          ) FILTER (WHERE s.id IS NOT NULL) as subcategories,
          COUNT(s.id) as subcategories_count
        FROM categories c
        LEFT JOIN subcategories s ON c.id = s.category_id
        GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at
        ORDER BY c.name
      `);

      console.log(`✅ ${result.rows.length} catégories récupérées avec sous-catégories`);

      res.status(200).json({
        success: true,
        message: "Catégories et sous-catégories récupérées avec succès",
        data: {
          categories: result.rows.map(category => ({
            id: category.id,
            name: category.name,
            description: category.description,
            subcategories_count: parseInt(category.subcategories_count),
            subcategories: category.subcategories || [],
            created_at: category.created_at,
            updated_at: category.updated_at
          })),
          total_categories: result.rows.length,
          total_subcategories: result.rows.reduce((sum, cat) => sum + parseInt(cat.subcategories_count), 0)
        }
      });
    } else {
      // Récupérer uniquement les catégories
      const result = await pool.query(`
        SELECT 
          c.id,
          c.name,
          c.description,
          c.created_at,
          c.updated_at,
          COUNT(s.id) as subcategories_count
        FROM categories c
        LEFT JOIN subcategories s ON c.id = s.category_id
        GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at
        ORDER BY c.name
      `);

      console.log(`✅ ${result.rows.length} catégories récupérées`);

      res.status(200).json({
        success: true,
        message: "Catégories récupérées avec succès",
        data: {
          categories: result.rows.map(category => ({
            id: category.id,
            name: category.name,
            description: category.description,
            subcategories_count: parseInt(category.subcategories_count),
            created_at: category.created_at,
            updated_at: category.updated_at
          })),
          total_categories: result.rows.length
        }
      });
    }

  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération des catégories:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des catégories",
      error: error.message
    });
  }
};

// ===== Récupérer une catégorie spécifique avec sous-catégories =====
const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { include_subcategories = 'true', include_garages = 'false' } = req.query;

    console.log(`🔍 Récupération de la catégorie numéro: ${id}`);

    // Vérifier la validité de l'identifiant
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de catégorie invalide"
      });
    }

    // Récupérer les informations de la catégorie
    const categoryResult = await pool.query(`
      SELECT id, name, description, created_at, updated_at
      FROM categories 
      WHERE id = $1
    `, [id]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }

    const category = categoryResult.rows[0];
    let responseData: any = {
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        created_at: category.created_at,
        updated_at: category.updated_at
      }
    };

    // Récupérer les sous-catégories si demandé
    if (include_subcategories === 'true') {
      const subcategoriesResult = await pool.query(`
        SELECT 
          s.id,
          s.name,
          s.description,
          s.created_at,
          s.updated_at,
          COUNT(gs.garage_id) as garages_count
        FROM subcategories s
        LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id
        WHERE s.category_id = $1
        GROUP BY s.id, s.name, s.description, s.created_at, s.updated_at
        ORDER BY s.name
      `, [id]);

      responseData.category.subcategories = subcategoriesResult.rows.map(sub => ({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        garages_count: parseInt(sub.garages_count),
        created_at: sub.created_at,
        updated_at: sub.updated_at
      }));
      responseData.category.subcategories_count = subcategoriesResult.rows.length;
    }

    // Récupérer les garages si demandé
    if (include_garages === 'true') {
      const garagesResult = await pool.query(`
        SELECT 
          g.id,
          g.name,
          g.address,
          g.phone,
          g.capacity,
          g.isdisponible,
          g.latitude,
          g.longitude,
          g.main_image
        FROM garages g
        WHERE g.category_id = $1 AND g.isdisponible = true
        ORDER BY g.name
      `, [id]);

      responseData.category.garages = garagesResult.rows;
      responseData.category.garages_count = garagesResult.rows.length;
    }

    console.log(`✅ Catégorie récupérée: ${category.name}`);

    res.status(200).json({
      success: true,
      message: "Catégorie récupérée avec succès",
      data: responseData
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération de la catégorie:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la catégorie",
      error: error.message
    });
  }
};

// ===== Récupérer toutes les sous-catégories =====
const getAllSubcategories = async (req: Request, res: Response) => {
  try {
    const {
      category_id,
      include_category = 'true',
      include_garages_count = 'true',
      limit = 100,
      offset = 0
    } = req.query;

    console.log("📋 Récupération des sous-catégories...");

    let whereCondition = "";
    let queryParams: any[] = [];
    let paramCount = 1;

    // Filtrer par catégorie si spécifiée
    if (category_id) {
      whereCondition = "WHERE s.category_id = $1";
      queryParams.push(Number(category_id));
      paramCount = 2;
    }

    let query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.category_id,
        s.created_at,
        s.updated_at
    `;

    // Ajouter les informations de la catégorie si demandé
    if (include_category === 'true') {
      query += `,
        c.name as category_name,
        c.description as category_description
      `;
    }

    // Ajouter le nombre de garages si demandé
    if (include_garages_count === 'true') {
      query += `,
        COUNT(gs.garage_id) as garages_count
      `;
    }

    query += `
      FROM subcategories s
    `;

    if (include_category === 'true') {
      query += `LEFT JOIN categories c ON s.category_id = c.id `;
    }

    if (include_garages_count === 'true') {
      query += `LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id `;
    }

    query += whereCondition;

    if (include_garages_count === 'true') {
      query += ` GROUP BY s.id, s.name, s.description, s.category_id, s.created_at, s.updated_at`;
      if (include_category === 'true') {
        query += `, c.name, c.description`;
      }
    }

    query += ` ORDER BY s.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(Number(limit), Number(offset));

    const result = await pool.query(query, queryParams);

    // Calculer le nombre total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM subcategories s
      ${whereCondition}
    `;
    const countParams = category_id ? [Number(category_id)] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    console.log(`✅ ${result.rows.length} sous-catégories récupérées sur ${total}`);

    res.status(200).json({
      success: true,
      message: "Sous-catégories récupérées avec succès",
      data: {
        subcategories: result.rows.map(sub => {
          const subcategory: any = {
            id: sub.id,
            name: sub.name,
            description: sub.description,
            category_id: sub.category_id,
            created_at: sub.created_at,
            updated_at: sub.updated_at
          };

          if (include_category === 'true') {
            subcategory.category = {
              name: sub.category_name,
              description: sub.category_description
            };
          }

          if (include_garages_count === 'true') {
            subcategory.garages_count = parseInt(sub.garages_count || 0);
          }

          return subcategory;
        }),
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          has_more: (Number(offset) + Number(limit)) < total
        }
      }
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération des sous-catégories:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des sous-catégories",
      error: error.message
    });
  }
};

// ===== Récupérer une sous-catégorie spécifique =====
const getSubcategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { include_category = 'true', include_garages = 'false' } = req.query;

    console.log(`🔍 Récupération de la sous-catégorie n°: ${id}`);

    // Vérifier la validité de l'identifiant
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de sous-catégorie invalide"
      });
    }

    let query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.category_id,
        s.created_at,
        s.updated_at
    `;

    if (include_category === 'true') {
      query += `,
        c.name as category_name,
        c.description as category_description
      `;
    }

    query += `
      FROM subcategories s
    `;

    if (include_category === 'true') {
      query += `LEFT JOIN categories c ON s.category_id = c.id `;
    }

    query += `WHERE s.id = $1`;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sous-catégorie non trouvée"
      });
    }

    const subcategory = result.rows[0];
    let responseData: any = {
      subcategory: {
        id: subcategory.id,
        name: subcategory.name,
        description: subcategory.description,
        category_id: subcategory.category_id,
        created_at: subcategory.created_at,
        updated_at: subcategory.updated_at
      }
    };

    if (include_category === 'true') {
      responseData.subcategory.category = {
        name: subcategory.category_name,
        description: subcategory.category_description
      };
    }

    // Récupérer les garages qui proposent ce service si demandé
    if (include_garages === 'true') {
      const garagesResult = await pool.query(`
        SELECT DISTINCT
          g.id,
          g.name,
          g.address,
          g.phone,
          g.capacity,
          g.isdisponible,
          g.latitude,
          g.longitude,
          g.main_image
        FROM garages g
        INNER JOIN garage_subcategories gs ON g.id = gs.garage_id
        WHERE gs.subcategory_id = $1 AND g.isdisponible = true
        ORDER BY g.name
      `, [id]);

      responseData.subcategory.garages = garagesResult.rows;
      responseData.subcategory.garages_count = garagesResult.rows.length;
    }

    console.log(`✅ Sous-catégorie récupérée: ${subcategory.name}`);

    res.status(200).json({
      success: true,
      message: "Sous-catégorie récupérée avec succès",
      data: responseData
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération de la sous-catégorie:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la sous-catégorie",
      error: error.message
    });
  }
};

// ===== Récupérer les sous-catégories d'une catégorie spécifique =====
const getSubcategoriesByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { include_garages_count = 'true' } = req.query;

    console.log(`🔍 Récupération des sous-catégories de la catégorie n°: ${categoryId}`);

    // Vérifier la validité de l'identifiant
    if (!categoryId || isNaN(Number(categoryId))) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de catégorie invalide"
      });
    }

    // Vérifier l'existence de la catégorie
    const categoryCheck = await pool.query(`
      SELECT id, name, description
      FROM categories 
      WHERE id = $1
    `, [categoryId]);

    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }

    const category = categoryCheck.rows[0];

    let query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at
    `;

    if (include_garages_count === 'true') {
      query += `,
        COUNT(gs.garage_id) as garages_count
      `;
    }

    query += `
      FROM subcategories s
    `;

    if (include_garages_count === 'true') {
      query += `LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id `;
    }

    query += `
      WHERE s.category_id = $1
    `;

    if (include_garages_count === 'true') {
      query += `GROUP BY s.id, s.name, s.description, s.created_at, s.updated_at `;
    }

    query += `ORDER BY s.name`;

    const result = await pool.query(query, [categoryId]);

    console.log(`✅ ${result.rows.length} sous-catégories récupérées pour la catégorie: ${category.name}`);

    res.status(200).json({
      success: true,
      message: "Sous-catégories récupérées avec succès",
      data: {
        category: {
          id: category.id,
          name: category.name,
          description: category.description
        },
        subcategories: result.rows.map(sub => {
          const subcategory: any = {
            id: sub.id,
            name: sub.name,
            description: sub.description,
            created_at: sub.created_at,
            updated_at: sub.updated_at
          };

          if (include_garages_count === 'true') {
            subcategory.garages_count = parseInt(sub.garages_count || 0);
          }

          return subcategory;
        }),
        total_subcategories: result.rows.length
      }
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération des sous-catégories de la catégorie:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des sous-catégories de la catégorie",
      error: error.message
    });
  }
};

// ===== Rechercher dans les catégories et sous-catégories =====
const searchCategories = async (req: Request, res: Response) => {
  try {
    const {
      q, // Recherche
      type = 'both', // both, categories, subcategories
      limit = 20
    } = req.query;

    if (!q || (q as string).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Terme de recherche requis"
      });
    }

    const searchTerm = `%${(q as string).trim()}%`;
    let results: any = {};

    // Rechercher dans les catégories
    if (type === 'both' || type === 'categories') {
      const categoriesResult = await pool.query(`
        SELECT 
          c.id,
          c.name,
          c.description,
          c.created_at,
          COUNT(s.id) as subcategories_count
        FROM categories c
        LEFT JOIN subcategories s ON c.id = s.category_id
        WHERE c.name ILIKE $1 OR c.description ILIKE $1
        GROUP BY c.id, c.name, c.description, c.created_at
        ORDER BY c.name
        LIMIT $2
      `, [searchTerm, limit]);

      results.categories = categoriesResult.rows.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        subcategories_count: parseInt(cat.subcategories_count),
        created_at: cat.created_at
      }));
    }

    // Rechercher dans les sous-catégories
    if (type === 'both' || type === 'subcategories') {
      const subcategoriesResult = await pool.query(`
        SELECT 
          s.id,
          s.name,
          s.description,
          s.category_id,
          s.created_at,
          c.name as category_name,
          COUNT(gs.garage_id) as garages_count
        FROM subcategories s
        LEFT JOIN categories c ON s.category_id = c.id
        LEFT JOIN garage_subcategories gs ON s.id = gs.subcategory_id
        WHERE s.name ILIKE $1 OR s.description ILIKE $1
        GROUP BY s.id, s.name, s.description, s.category_id, s.created_at, c.name
        ORDER BY s.name
        LIMIT $2
      `, [searchTerm, limit]);

      results.subcategories = subcategoriesResult.rows.map(sub => ({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        category_id: sub.category_id,
        category_name: sub.category_name,
        garages_count: parseInt(sub.garages_count || 0),
        created_at: sub.created_at
      }));
    }

    const totalResults = (results.categories?.length || 0) + (results.subcategories?.length || 0);

    console.log(`🔍 Recherche pour "${q}" - Résultats: ${totalResults}`);

    res.status(200).json({
      success: true,
      message: `${totalResults} résultats trouvés`,
      search_query: q,
      data: {
        ...results,
        total_results: totalResults
      }
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de la recherche:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la recherche",
      error: error.message
    });
  }
};

export {
  getAllCategories,
  getCategoryById,
  getAllSubcategories,
  getSubcategoryById,
  getSubcategoriesByCategory,
  searchCategories
};