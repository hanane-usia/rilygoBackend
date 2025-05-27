/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB";

// Calcul de la distance entre deux points (formule de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Validation des coordonnées
function validateCoordinates(lat: any, lng: any, radius?: any) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
        return { valid: false, error: "Les coordonnées doivent être des nombres valides" };
    }

    if (latitude < -90 || latitude > 90) {
        return { valid: false, error: "La latitude doit être comprise entre -90 et 90" };
    }

    if (longitude < -180 || longitude > 180) {
        return { valid: false, error: "La longitude doit être comprise entre -180 et 180" };
    }

    let radiusNum = null;
    if (radius !== undefined) {
        radiusNum = parseFloat(radius);
        if (isNaN(radiusNum) || radiusNum <= 0) {
            return { valid: false, error: "Le rayon doit être un nombre positif" };
        }
    }

    return {
        valid: true,
        latitude,
        longitude,
        radius: radiusNum
    };
}

// ===== Recherche par emplacement et sous-catégorie =====
const searchGaragesByLocation = async (req: Request, res: Response) => {
    try {
        const { subcategoryId, latitude, longitude, radiusZone } = req.params;
        const { category_id, limit = 20 } = req.query;

        console.log("🔍 Recherche avec critères:", { subcategoryId, latitude, longitude, radiusZone, category_id, limit });

        // Vérification des paramètres requis
        if (!subcategoryId || !latitude || !longitude || !radiusZone) {
            return res.status(400).json({
                success: false,
                message: "Tous les paramètres sont requis: subcategoryId, latitude, longitude, radiusZone"
            });
        }

        // Validation des coordonnées
        const validation = validateCoordinates(latitude, longitude, radiusZone);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        const { latitude: lat, longitude: lng, radius } = validation;

        // Vérification de l'existence de la sous-catégorie
        const subcategoryCheck = await pool.query(
            `SELECT s.id, s.name, c.id as category_id, c.name as category_name 
       FROM subcategories s 
       LEFT JOIN categories c ON s.category_id = c.id 
       WHERE s.id = $1`,
            [subcategoryId]
        );

        if (subcategoryCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Sous-catégorie non trouvée"
            });
        }

        // Construction de la requête
        let whereConditions = [
            "g.isDisponible = true",
            "g.capacity > 0",
            "gs.subcategory_id = $1"
        ];
        let queryParams: any[] = [subcategoryId];
        let paramCount = 2;

        // Ajout du filtre de catégorie si fourni
        if (category_id) {
            whereConditions.push(`c.id = $${paramCount}`);
            queryParams.push(Number(category_id));
            paramCount++;
        }

        const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

        // Requête principale avec calcul de distance
        const query = `
      SELECT DISTINCT
        g.id,
        g.name,
        g.address,
        g.phone,
        g.latitude,
        g.longitude,
        g.capacity,
        g.isDisponible,
        g.category_id,
        c.name as category_name,
        s.name as subcategory_name,
        -- Calcul de la distance avec la formule de Haversine
        (
          6371 * acos(
            LEAST(1.0, 
              cos(radians($${paramCount})) * 
              cos(radians(g.latitude)) * 
              cos(radians(g.longitude) - radians($${paramCount + 1})) + 
              sin(radians($${paramCount})) * 
              sin(radians(g.latitude))
            )
          )
        ) as distance_km,
        -- Récupération de toutes les sous-catégories du garage
        (
          SELECT json_agg(
            json_build_object(
              'id', s2.id,
              'name', s2.name
            )
          )
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
      -- Filtre de distance
      AND (
        6371 * acos(
          LEAST(1.0,
            cos(radians($${paramCount})) * 
            cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians($${paramCount + 1})) + 
            sin(radians($${paramCount})) * 
            sin(radians(g.latitude))
          )
        )
      ) <= $${paramCount + 2}
      ORDER BY distance_km ASC
      LIMIT $${paramCount + 3}
    `;

        queryParams.push(lat, lng, radius, Number(limit));

        console.log("📝 Exécution de la requête:", query);
        console.log("📊 Paramètres:", queryParams);

        const result = await pool.query(query, queryParams);

        // Calcul du nombre total
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
          LEAST(1.0,
            cos(radians($${paramCount})) * 
            cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians($${paramCount + 1})) + 
            sin(radians($${paramCount})) * 
            sin(radians(g.latitude))
          )
        )
      ) <= $${paramCount + 2}
    `;

        const countParams = queryParams.slice(0, -1); // Suppression de LIMIT
        const countResult = await pool.query(countQuery, countParams);

        console.log(`✅ ${result.rows.length} garages trouvés`);

        res.status(200).json({
            success: true,
            message: "Garages trouvés avec succès",
            search_criteria: {
                location: {
                    latitude: lat,
                    longitude: lng
                },
                radius_km: radius,
                subcategory_id: subcategoryId,
                category_id: category_id || null
            },
            subcategory_info: subcategoryCheck.rows[0],
            total_found: parseInt(countResult.rows[0].total),
            returned_count: result.rows.length,
            data: result.rows.map((garage) => ({
                id: garage.id,
                name: garage.name,
                address: garage.address,
                phone: garage.phone,
                capacity: garage.capacity,
                location: {
                    latitude: parseFloat(garage.latitude),
                    longitude: parseFloat(garage.longitude)
                },
                distance_km: parseFloat(garage.distance_km).toFixed(2),
                category: {
                    id: garage.category_id,
                    name: garage.category_name
                },
                target_subcategory: garage.subcategory_name,
                all_subcategories: garage.all_subcategories || [],
                isAvailable: garage.isdisponible
            }))
        });

    } catch (error: any) {
        console.error("❌ Erreur lors de la recherche:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message,
            details: error.stack
        });
    }
};

// ===== Recherche par catégorie et localisation =====
const searchGaragesByCategoryLocation = async (req: Request, res: Response) => {
    try {
        const { category_id, latitude, longitude, radiusZone } = req.params;
        const { limit = 20, subcategoryId } = req.query;

        console.log("🔍 Recherche par catégorie:", { category_id, latitude, longitude, radiusZone, subcategoryId, limit });

        // Vérification des paramètres
        if (!category_id || !latitude || !longitude || !radiusZone) {
            return res.status(400).json({
                success: false,
                message: "Tous les paramètres sont requis: category_id, latitude, longitude, radiusZone"
            });
        }

        // Validation des coordonnées
        const validation = validateCoordinates(latitude, longitude, radiusZone);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        const { latitude: lat, longitude: lng, radius } = validation;

        // Vérification de l'existence de la catégorie
        const categoryCheck = await pool.query(
            "SELECT id, name, description FROM categories WHERE id = $1",
            [category_id]
        );

        if (categoryCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Catégorie non trouvée"
            });
        }

        // Construction de la requête
        let whereConditions = [
            "g.isDisponible = true",
            "g.capacity > 0",
            "g.category_id = $1"
        ];
        let queryParams: any[] = [category_id];
        let paramCount = 2;

        // Ajout du filtre sous-catégorie si fourni
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

        // Requête principale
        const query = `
      SELECT DISTINCT
        g.id,
        g.name,
        g.address,
        g.phone,
        g.latitude,
        g.longitude,
        g.capacity,
        g.isDisponible,
        g.category_id,
        c.name as category_name,
        -- Calcul de la distance
        (
          6371 * acos(
            LEAST(1.0,
              cos(radians($${paramCount})) * 
              cos(radians(g.latitude)) * 
              cos(radians(g.longitude) - radians($${paramCount + 1})) + 
              sin(radians($${paramCount})) * 
              sin(radians(g.latitude))
            )
          )
        ) as distance_km,
        -- Récupération des sous-catégories
        (
          SELECT json_agg(
            json_build_object(
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
      -- Filtre de distance
      AND (
        6371 * acos(
          LEAST(1.0,
            cos(radians($${paramCount})) * 
            cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians($${paramCount + 1})) + 
            sin(radians($${paramCount})) * 
            sin(radians(g.latitude))
          )
        )
      ) <= $${paramCount + 2}
      ORDER BY distance_km ASC
      LIMIT $${paramCount + 3}
    `;

        queryParams.push(lat, lng, radius, Number(limit));

        console.log("📝 Exécution de la requête catégorie:", query);
        const result = await pool.query(query, queryParams);

        console.log(`✅ ${result.rows.length} garages trouvés pour la catégorie`);

        res.status(200).json({
            success: true,
            message: "Garages trouvés avec succès par catégorie",
            search_criteria: {
                location: {
                    latitude: lat,
                    longitude: lng
                },
                radius_km: radius,
                category_id: category_id,
                subcategoryId: subcategoryId || null
            },
            category_info: categoryCheck.rows[0],
            total_found: result.rows.length,
            data: result.rows.map((garage) => ({
                id: garage.id,
                name: garage.name,
                address: garage.address,
                phone: garage.phone,
                capacity: garage.capacity,
                location: {
                    latitude: parseFloat(garage.latitude),
                    longitude: parseFloat(garage.longitude)
                },
                distance_km: parseFloat(garage.distance_km).toFixed(2),
                category: {
                    id: garage.category_id,
                    name: garage.category_name
                },
                subcategories: garage.subcategories || [],
                isAvailable: garage.isdisponible
            }))
        });

    } catch (error: any) {
        console.error("❌ Erreur lors de la recherche par catégorie:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message,
            details: error.stack
        });
    }
};

// ===== Recherche des garages à proximité (Query params) =====
const searchNearbyGarages = async (req: Request, res: Response) => {
    try {
        const {
            latitude,
            longitude,
            radius = 10,
            subcategory_id,
            category_id,
            limit = 20
        } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "Latitude et longitude requises",
                example: "?latitude=33.5731&longitude=-7.5898&radius=10"
            });
        }

        const validation = validateCoordinates(latitude, longitude, radius);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        const { latitude: lat, longitude: lng, radius: rad } = validation;

        // Construction de la requête dynamique
        let whereConditions = [
            "g.isDisponible = true",
            "g.capacity > 0"
        ];
        let queryParams: any[] = [];
        let paramCount = 1;

        if (category_id) {
            whereConditions.push(`g.category_id = $${paramCount}`);
            queryParams.push(Number(category_id));
            paramCount++;
        }

        if (subcategory_id) {
            whereConditions.push(`EXISTS (
        SELECT 1 FROM garage_subcategories gs
        WHERE gs.garage_id = g.id 
        AND gs.subcategory_id = $${paramCount}
      )`);
            queryParams.push(Number(subcategory_id));
            paramCount++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

        const query = `
      SELECT 
        g.id,
        g.name,
        g.address,
        g.phone,
        g.latitude,
        g.longitude,
        g.capacity,
        g.isDisponible,
        g.category_id,
        c.name as category_name,
        (
          6371 * acos(
            LEAST(1.0,
              cos(radians($${paramCount})) * 
              cos(radians(g.latitude)) * 
              cos(radians(g.longitude) - radians($${paramCount + 1})) + 
              sin(radians($${paramCount})) * 
              sin(radians(g.latitude))
            )
          )
        ) as distance_km,
        (
          SELECT json_agg(
            json_build_object(
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
      AND (
        6371 * acos(
          LEAST(1.0,
            cos(radians($${paramCount})) * 
            cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians($${paramCount + 1})) + 
            sin(radians($${paramCount})) * 
            sin(radians(g.latitude))
          )
        )
      ) <= $${paramCount + 2}
      ORDER BY distance_km ASC
      LIMIT $${paramCount + 3}
    `;

        queryParams.push(lat, lng, rad, Number(limit));

        const result = await pool.query(query, queryParams);

        res.status(200).json({
            success: true,
            message: "Garages à proximité trouvés",
            search_criteria: {
                location: { latitude: lat, longitude: lng },
                radius_km: rad,
                filters: { subcategory_id, category_id }
            },
            data: {
                total: result.rows.length,
                garages: result.rows.map((garage) => ({
                    id: garage.id,
                    name: garage.name,
                    address: garage.address,
                    phone: garage.phone,
                    capacity: garage.capacity,
                    location: {
                        latitude: parseFloat(garage.latitude),
                        longitude: parseFloat(garage.longitude)
                    },
                    distance_km: parseFloat(garage.distance_km).toFixed(2),
                    category: {
                        id: garage.category_id,
                        name: garage.category_name
                    },
                    subcategories: garage.subcategories || [],
                    isAvailable: garage.isdisponible
                }))
            }
        });

    } catch (error: any) {
        console.error("Erreur lors de la recherche des garages à proximité:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};

// ===== Recherche des garages les plus proches =====
const findNearestGarages = async (req: Request, res: Response) => {
    try {
        const {
            latitude,
            longitude,
            subcategory_id,
            limit = 5
        } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "La latitude et la longitude sont requises"
            });
        }

        const validation = validateCoordinates(latitude, longitude);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        const { latitude: lat, longitude: lng } = validation;

        let whereConditions = [
            "g.isDisponible = true",
            "g.capacity > 0"
        ];
        let queryParams: any[] = [];
        let paramCount = 1;

        if (subcategory_id) {
            whereConditions.push(`EXISTS (
        SELECT 1 FROM garage_subcategories gs
        WHERE gs.garage_id = g.id 
        AND gs.subcategory_id = $${paramCount}
      )`);
            queryParams.push(Number(subcategory_id));
            paramCount++;
        }

        const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

        const query = `
      SELECT 
        g.id,
        g.name,
        g.address,
        g.phone,
        g.latitude,
        g.longitude,
        g.capacity,
        g.isDisponible,
        g.category_id,
        c.name as category_name,
        (
          6371 * acos(
            LEAST(1.0,
              cos(radians($${paramCount})) * 
              cos(radians(g.latitude)) * 
              cos(radians(g.longitude) - radians($${paramCount + 1})) + 
              sin(radians($${paramCount})) * 
              sin(radians(g.latitude))
            )
          )
        ) as distance_km
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      ${whereClause}
      AND g.latitude IS NOT NULL 
      AND g.longitude IS NOT NULL
      ORDER BY distance_km ASC
      LIMIT $${paramCount + 2}
    `;

        queryParams.push(lat, lng, Number(limit));

        const result = await pool.query(query, queryParams);

        res.status(200).json({
            success: true,
            message: "Garages les plus proches trouvés",
            user_location: { latitude: lat, longitude: lng },
            data: {
                garages: result.rows.map((garage) => ({
                    id: garage.id,
                    name: garage.name,
                    address: garage.address,
                    phone: garage.phone,
                    capacity: garage.capacity,
                    location: {
                        latitude: parseFloat(garage.latitude),
                        longitude: parseFloat(garage.longitude)
                    },
                    distance_km: parseFloat(garage.distance_km).toFixed(2),
                    category: {
                        id: garage.category_id,
                        name: garage.category_name
                    },
                    isAvailable: garage.isdisponible
                }))
            }
        });

    } catch (error: any) {
        console.error("Erreur lors de la recherche des garages les plus proches:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};

// ===== Recherche par limites géographiques =====
const searchGaragesInBounds = async (req: Request, res: Response) => {
    try {
        const {
            north_lat,
            south_lat,
            east_lng,
            west_lng,
            subcategory_id,
            category_id,
            limit = 50
        } = req.query;

        if (!north_lat || !south_lat || !east_lng || !west_lng) {
            return res.status(400).json({
                success: false,
                message: "Toutes les limites géographiques sont requises: north_lat, south_lat, east_lng, west_lng"
            });
        }

        const nLat = parseFloat(north_lat as string);
        const sLat = parseFloat(south_lat as string);
        const eLng = parseFloat(east_lng as string);
        const wLng = parseFloat(west_lng as string);

        if (isNaN(nLat) || isNaN(sLat) || isNaN(eLng) || isNaN(wLng)) {
            return res.status(400).json({
                success: false,
                message: "Toutes les limites doivent être des nombres valides"
            });
        }

        let whereConditions = [
            "g.isDisponible = true",
            "g.capacity > 0",
            "g.latitude BETWEEN $1 AND $2",
            "g.longitude BETWEEN $3 AND $4"
        ];
        let queryParams: any[] = [sLat, nLat, wLng, eLng];
        let paramCount = 5;

        if (category_id) {
            whereConditions.push(`g.category_id = $${paramCount}`);
            queryParams.push(Number(category_id));
            paramCount++;
        }

        if (subcategory_id) {
            whereConditions.push(`EXISTS (
        SELECT 1 FROM garage_subcategories gs
        WHERE gs.garage_id = g.id 
        AND gs.subcategory_id = $${paramCount}
      )`);
            queryParams.push(Number(subcategory_id));
            paramCount++;
        }

        const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

        const query = `
      SELECT 
        g.id,
        g.name,
        g.address,
        g.phone,
        g.latitude,
        g.longitude,
        g.capacity,
        g.isDisponible,
        g.category_id,
        c.name as category_name,
        (
          SELECT json_agg(
            json_build_object(
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
      ORDER BY g.name ASC
      LIMIT $${paramCount}
    `;

        queryParams.push(Number(limit));

        const result = await pool.query(query, queryParams);

        res.status(200).json({
            success: true,
            message: "Garages trouvés dans la zone spécifiée",
            bounds: {
                north_lat: nLat,
                south_lat: sLat,
                east_lng: eLng,
                west_lng: wLng
            },
            data: {
                total: result.rows.length,
                garages: result.rows.map((garage) => ({
                    id: garage.id,
                    name: garage.name,
                    address: garage.address,
                    phone: garage.phone,
                    capacity: garage.capacity,
                    location: {
                        latitude: parseFloat(garage.latitude),
                        longitude: parseFloat(garage.longitude)
                    },
                    category: {
                        id: garage.category_id,
                        name: garage.category_name
                    },
                    subcategories: garage.subcategories || [],
                    isAvailable: garage.isdisponible
                }))
            }
        });

    } catch (error: any) {
        console.error("Erreur lors de la recherche par limites:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};

// Export de toutes les fonctions
export {
    searchGaragesByLocation,
    searchGaragesByCategoryLocation,
    searchNearbyGarages,
    findNearestGarages,
    searchGaragesInBounds
};