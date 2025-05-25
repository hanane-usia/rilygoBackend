/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB";

// Fonction pour rechercher les garages par géolocalisation avec path params
const searchGaragesByLocation = async (req: Request, res: Response) => {
  try {
    const { subcategoryId, latitude, longitude, radiusZone } = req.params;
    const { category_id, limit = 20 } = req.query;

    // Validation des paramètres
    if (!subcategoryId || !latitude || !longitude || !radiusZone) {
      return res.status(400).json({
        message:
          "Tous les paramètres sont requis: subcategoryId, latitude, longitude, radiusZone",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = parseFloat(radiusZone);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return res.status(400).json({
        message: "Les coordonnées et le rayon doivent être des nombres valides",
      });
    }

    // Vérifier que la sous-catégorie existe
    const subcategoryCheck = await pool.query(
      "SELECT s.id, s.name, c.id as category_id, c.name as category_name FROM subcategories s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = $1",
      [subcategoryId],
    );

    if (subcategoryCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Sous-catégorie non trouvée",
      });
    }

    let whereConditions = [
      "g.isDisponible = true",
      "g.capacity > 0",
      "gs.subcategory_id = $1",
    ];
    let queryParams: any[] = [subcategoryId];
    let paramCount = 2;

    // Filtrer par catégorie si fournie
    if (category_id) {
      whereConditions.push(`g.category_id = $${paramCount}`);
      queryParams.push(Number(category_id));
      paramCount++;
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // Requête avec calcul de distance (formule Haversine)
    const query = `
      SELECT 
        g.id,
        g.category_id,
        g.capacity,
        g.isDisponible,
        g.name,
        g.address,
        g.phone,
        g.latitude,
        g.longitude,
        g.createdAt,
        c.name as category_name,
        s.name as subcategory_name,
        -- Calcul de la distance en km (formule Haversine approximative)
        (
          6371 * acos(
            cos(radians($${paramCount})) * 
            cos(radians(COALESCE(g.latitude, 0))) * 
            cos(radians(COALESCE(g.longitude, 0)) - radians($${
              paramCount + 1
            })) + 
            sin(radians($${paramCount})) * 
            sin(radians(COALESCE(g.latitude, 0)))
          )
        ) as distance_km,
        -- Récupérer toutes les sous-catégories du garage
        (
          SELECT ARRAY_AGG(s2.name)
          FROM garage_subcategories gs2
          JOIN subcategories s2 ON gs2.subcategory_id = s2.id
          WHERE gs2.garage_id = g.id
        ) as all_subcategories
      FROM garages g
      INNER JOIN garage_subcategories gs ON g.id = gs.garage_id
      INNER JOIN subcategories s ON gs.subcategory_id = s.id
      LEFT JOIN categories c ON g.category_id = c.id
      ${whereClause}
      AND g.latitude IS NOT NULL 
      AND g.longitude IS NOT NULL
      -- Filtrer par rayon (calcul approximatif)
      AND (
        6371 * acos(
          cos(radians($${paramCount})) * 
          cos(radians(g.latitude)) * 
          cos(radians(g.longitude) - radians($${paramCount + 1})) + 
          sin(radians($${paramCount})) * 
          sin(radians(g.latitude))
        )
      ) <= $${paramCount + 2}
      GROUP BY g.id, c.id, c.name, s.id, s.name
      ORDER BY distance_km ASC
      LIMIT $${paramCount + 3}
    `;

    queryParams.push(lat, lng, radius, Number(limit));
    const result = await pool.query(query, queryParams);

    // Compter le total dans le rayon
    const countQuery = `
      SELECT COUNT(DISTINCT g.id) as total
      FROM garages g
      INNER JOIN garage_subcategories gs ON g.id = gs.garage_id
      LEFT JOIN categories c ON g.category_id = c.id
      ${whereClause}
      AND g.latitude IS NOT NULL 
      AND g.longitude IS NOT NULL
      AND (
        6371 * acos(
          cos(radians($${paramCount})) * 
          cos(radians(g.latitude)) * 
          cos(radians(g.longitude) - radians($${paramCount + 1})) + 
          sin(radians($${paramCount})) * 
          sin(radians(g.latitude))
        )
      ) <= $${paramCount + 2}
    `;

    const countParams = queryParams.slice(0, -1); // Enlever le LIMIT
    const countResult = await pool.query(countQuery, countParams);

    res.status(200).json({
      message: "Garages trouvés dans le rayon spécifié",
      search_location: {
        latitude: lat,
        longitude: lng,
        radius_km: radius,
      },
      subcategory: subcategoryCheck.rows[0],
      total_found: parseInt(countResult.rows[0].total),
      garages: result.rows.map((garage) => ({
        id: garage.id,
        name: garage.name,
        address: garage.address,
        phone: garage.phone,
        capacity: garage.capacity,
        location: {
          latitude: garage.latitude,
          longitude: garage.longitude,
        },
        distance_km: parseFloat(garage.distance_km).toFixed(2),
        category: {
          id: garage.category_id,
          name: garage.category_name,
        },
        target_subcategory: garage.subcategory_name,
        all_subcategories: garage.all_subcategories || [],
        isAvailable: garage.isdisponible,
      })),
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
};

// Fonction pour rechercher par catégorie et géolocalisation
const searchGaragesByCategoryLocation = async (req: Request, res: Response) => {
  try {
    const { category_id, latitude, longitude, radiusZone } = req.params;
    const { limit = 20, subcategoryId } = req.query;

    // Validation des paramètres
    if (!category_id || !latitude || !longitude || !radiusZone) {
      return res.status(400).json({
        message:
          "Tous les paramètres sont requis: category_id, latitude, longitude, radiusZone",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = parseFloat(radiusZone);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return res.status(400).json({
        message: "Les coordonnées et le rayon doivent être des nombres valides",
      });
    }

    // Vérifier que la catégorie existe
    const categoryCheck = await pool.query(
      "SELECT id, name, description FROM categories WHERE id = $1",
      [category_id],
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Catégorie non trouvée",
      });
    }

    let whereConditions = [
      "g.isDisponible = true",
      "g.capacity > 0",
      "g.category_id = $1",
    ];
    let queryParams: any[] = [category_id];
    let paramCount = 2;

    // Filtrer par sous-catégorie si fournie
    if (subcategoryId) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM garage_subcategories gs2
        WHERE gs2.garage_id = g.id 
        AND gs2.subcategory_id = $${paramCount}
      )`);
      queryParams.push(Number(subcategoryId));
      paramCount++;
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // Requête avec calcul de distance
    const query = `
      SELECT DISTINCT
        g.id,
        g.category_id,
        g.capacity,
        g.isDisponible,
        g.name,
        g.address,
        g.phone,
        g.latitude,
        g.longitude,
        g.createdAt,
        c.name as category_name,
        -- Calcul de la distance en km
        (
          6371 * acos(
            cos(radians($${paramCount})) * 
            cos(radians(COALESCE(g.latitude, 0))) * 
            cos(radians(COALESCE(g.longitude, 0)) - radians($${
              paramCount + 1
            })) + 
            sin(radians($${paramCount})) * 
            sin(radians(COALESCE(g.latitude, 0)))
          )
        ) as distance_km,
        -- Récupérer toutes les sous-catégories
        (
          SELECT ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'id', s.id,
              'name', s.name
            )
          )
          FROM garage_subcategories gs
          JOIN subcategories s ON gs.subcategory_id = s.id
          WHERE gs.garage_id = g.id
        ) as subcategories
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      ${whereClause}
      AND g.latitude IS NOT NULL 
      AND g.longitude IS NOT NULL
      -- Filtrer par rayon
      AND (
        6371 * acos(
          cos(radians($${paramCount})) * 
          cos(radians(g.latitude)) * 
          cos(radians(g.longitude) - radians($${paramCount + 1})) + 
          sin(radians($${paramCount})) * 
          sin(radians(g.latitude))
        )
      ) <= $${paramCount + 2}
      ORDER BY distance_km ASC
      LIMIT $${paramCount + 3}
    `;

    queryParams.push(lat, lng, radius, Number(limit));
    const result = await pool.query(query, queryParams);

    res.status(200).json({
      message: "Garages trouvés par catégorie dans le rayon spécifié",
      search_location: {
        latitude: lat,
        longitude: lng,
        radius_km: radius,
      },
      category: categoryCheck.rows[0],
      total_found: result.rows.length,
      garages: result.rows.map((garage) => ({
        id: garage.id,
        name: garage.name,
        address: garage.address,
        phone: garage.phone,
        capacity: garage.capacity,
        location: {
          latitude: garage.latitude,
          longitude: garage.longitude,
        },
        distance_km: parseFloat(garage.distance_km).toFixed(2),
        category: {
          id: garage.category_id,
          name: garage.category_name,
        },
        subcategories: garage.subcategories || [],
        isAvailable: garage.isdisponible,
      })),
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Erreur : ${error.message}`,
    });
  }
};

export { searchGaragesByLocation, searchGaragesByCategoryLocation };
