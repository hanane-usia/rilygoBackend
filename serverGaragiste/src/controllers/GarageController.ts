/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB";
import { GarageType } from "../models/Garage";

// Ajouter un garage
const addGarage = async (req: Request, res: Response) => {
  try {
    const {
      category_id,
      subcategoriesIds,
      capacity,
      disponible = true,
    }: GarageType = req.body;

    if (!category_id || !subcategoriesIds || subcategoriesIds.length === 0) {
      return res.status(400).json({
        message: "Vous devez fournir category_id et au moins une subcategory",
      });
    }

    if (capacity === undefined || capacity < 0) {
      return res.status(400).json({
        message: "La capacité doit être un nombre positif",
      });
    }

    // Vérifier que la catégorie existe
    const categoryCheck = await pool.query(
      "SELECT id FROM categories WHERE id = $1",
      [category_id],
    );
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Catégorie non trouvée",
      });
    }

    // Vérifier que toutes les sous-catégories existent et appartiennent à la catégorie
    const subcategoriesCheck = await pool.query(
      "SELECT id FROM subcategories WHERE id = ANY($1) AND category_id = $2",
      [subcategoriesIds, category_id],
    );

    if (subcategoriesCheck.rows.length !== subcategoriesIds.length) {
      return res.status(400).json({
        message:
          "Une ou plusieurs sous-catégories sont invalides ou n'appartiennent pas à cette catégorie",
      });
    }

    // Insérer le garage
    const garageQuery = `
      INSERT INTO garages (category_id, capacity, disponible, createdAt, updatedAt)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;

    const garageResult = await pool.query(garageQuery, [
      category_id,
      capacity,
      disponible,
    ]);
    const garage = garageResult.rows[0];

    // Insérer les relations garage-subcategories
    const subcategoryInserts = subcategoriesIds.map((subcategoryId) =>
      pool.query(
        "INSERT INTO garage_subcategories (garage_id, subcategory_id) VALUES ($1, $2)",
        [garage.id, subcategoryId],
      ),
    );

    await Promise.all(subcategoryInserts);

    // Récupérer le garage complet avec ses relations
    const completeGarage = await getCompleteGarageById(garage.id);

    res.status(201).json({
      message: "Garage créé avec succès",
      garage: completeGarage,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Fonction helper pour récupérer un garage complet
const getCompleteGarageById = async (garageId: number) => {
  const query = `
    SELECT 
      g.*,
      c.name as category_name,
      ARRAY_AGG(
        JSON_BUILD_OBJECT(
          'id', s.id,
          'name', s.name
        )
      ) as subcategories
    FROM garages g
    LEFT JOIN categories c ON g.category_id = c.id
    LEFT JOIN garage_subcategories gs ON g.id = gs.garage_id
    LEFT JOIN subcategories s ON gs.subcategory_id = s.id
    WHERE g.id = $1
    GROUP BY g.id, c.name
  `;

  const result = await pool.query(query, [garageId]);
  return result.rows[0];
};

// Obtenir tous les garages
const getAllGarages = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, disponible, category_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 1;

    // Filtrer par disponibilité
    if (disponible !== undefined) {
      whereConditions.push(`g.disponible = $${paramCount}`);
      queryParams.push(disponible === "true");
      paramCount++;
    }

    // Filtrer par catégorie
    if (category_id) {
      whereConditions.push(`g.category_id = $${paramCount}`);
      queryParams.push(Number(category_id));
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM garages g ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalGarages = parseInt(countResult.rows[0].count);

    // Récupérer les garages avec pagination
    const garagesQuery = `
      SELECT 
        g.*,
        c.name as category_name,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'id', s.id,
            'name', s.name
          )
        ) FILTER (WHERE s.id IS NOT NULL) as subcategories
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      LEFT JOIN garage_subcategories gs ON g.id = gs.garage_id
      LEFT JOIN subcategories s ON gs.subcategory_id = s.id
      ${whereClause}
      GROUP BY g.id, c.name
      ORDER BY g.createdAt DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(Number(limit), offset);
    const result = await pool.query(garagesQuery, queryParams);

    res.status(200).json({
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
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir un garage par ID
const getGarage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID du garage",
      });
    }

    const garage = await getCompleteGarageById(Number(id));

    if (!garage) {
      return res.status(404).json({
        message: "Aucun garage trouvé avec cet ID",
      });
    }

    res.status(200).json({ garage });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir les garages par catégorie
const getGaragesByCategory = async (req: Request, res: Response) => {
  try {
    const { category_id } = req.params;
    const { page = 1, limit = 10, disponible } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!category_id) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID de la catégorie",
      });
    }

    let whereConditions = [`g.category_id = $1`];
    let queryParams: any[] = [Number(category_id)];
    let paramCount = 2;

    if (disponible !== undefined) {
      whereConditions.push(`g.disponible = $${paramCount}`);
      queryParams.push(disponible === "true");
      paramCount++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Vérifier que la catégorie existe
    const categoryCheck = await pool.query(
      "SELECT name FROM categories WHERE id = $1",
      [category_id],
    );
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Catégorie non trouvée",
      });
    }

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM garages g WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalGarages = parseInt(countResult.rows[0].count);

    // Récupérer les garages
    const garagesQuery = `
      SELECT 
        g.*,
        c.name as category_name,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'id', s.id,
            'name', s.name
          )
        ) FILTER (WHERE s.id IS NOT NULL) as subcategories
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      LEFT JOIN garage_subcategories gs ON g.id = gs.garage_id
      LEFT JOIN subcategories s ON gs.subcategory_id = s.id
      WHERE ${whereClause}
      GROUP BY g.id, c.name
      ORDER BY g.createdAt DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(Number(limit), offset);
    const result = await pool.query(garagesQuery, queryParams);

    res.status(200).json({
      category: categoryCheck.rows[0].name,
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
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir les garages par sous-catégorie
const getGaragesBySubcategory = async (req: Request, res: Response) => {
  try {
    const { subcategoryId } = req.params;
    const { page = 1, limit = 10, disponible } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!subcategoryId) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID de la sous-catégorie",
      });
    }

    // Vérifier que la sous-catégorie existe
    const subcategoryCheck = await pool.query(
      "SELECT s.name, c.name as category_name FROM subcategories s JOIN categories c ON s.category_id = c.id WHERE s.id = $1",
      [subcategoryId],
    );

    if (subcategoryCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Sous-catégorie non trouvée",
      });
    }

    let whereConditions = [`gs.subcategory_id = $1`];
    let queryParams: any[] = [Number(subcategoryId)];
    let paramCount = 2;

    if (disponible !== undefined) {
      whereConditions.push(`g.disponible = $${paramCount}`);
      queryParams.push(disponible === "true");
      paramCount++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Compter le total
    const countQuery = `
      SELECT COUNT(DISTINCT g.id) 
      FROM garages g 
      JOIN garage_subcategories gs ON g.id = gs.garage_id 
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalGarages = parseInt(countResult.rows[0].count);

    // Récupérer les garages
    const garagesQuery = `
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
      JOIN garage_subcategories gs ON g.id = gs.garage_id
      LEFT JOIN garage_subcategories gs2 ON g.id = gs2.garage_id
      LEFT JOIN subcategories s ON gs2.subcategory_id = s.id
      WHERE ${whereClause}
      GROUP BY g.id, c.name
      ORDER BY g.createdAt DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(Number(limit), offset);
    const result = await pool.query(garagesQuery, queryParams);

    res.status(200).json({
      subcategory: subcategoryCheck.rows[0].name,
      category: subcategoryCheck.rows[0].category_name,
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
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Mettre à jour un garage
const updateGarage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category_id, subcategoriesIds, capacity, disponible } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID du garage",
      });
    }

    // Vérifier que le garage existe
    const garageCheck = await pool.query(
      "SELECT id FROM garages WHERE id = $1",
      [id],
    );
    if (garageCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Garage non trouvé",
      });
    }

    // Construire la requête de mise à jour
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (category_id !== undefined) {
      // Vérifier que la catégorie existe
      const categoryCheck = await pool.query(
        "SELECT id FROM categories WHERE id = $1",
        [category_id],
      );
      if (categoryCheck.rows.length === 0) {
        return res.status(404).json({
          message: "Catégorie non trouvée",
        });
      }
      updateFields.push(`category_id = $${paramCount}`);
      values.push(category_id);
      paramCount++;
    }

    if (capacity !== undefined) {
      updateFields.push(`capacity = $${paramCount}`);
      values.push(capacity);
      paramCount++;
    }

    if (disponible !== undefined) {
      updateFields.push(`disponible = $${paramCount}`);
      values.push(disponible);
      paramCount++;
    }

    if (updateFields.length === 0 && !subcategoriesIds) {
      return res.status(400).json({
        message: "Aucun champ à mettre à jour fourni",
      });
    }

    // Mettre à jour les champs du garage
    if (updateFields.length > 0) {
      updateFields.push(`updatedAt = NOW()`);
      values.push(id);

      const updateQuery = `
        UPDATE garages 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
      `;

      await pool.query(updateQuery, values);
    }

    // Mettre à jour les sous-catégories si fournies
    if (subcategoriesIds && subcategoriesIds.length > 0) {
      const finalCategoryId =
        category_id ||
        (
          await pool.query("SELECT category_id FROM garages WHERE id = $1", [
            id,
          ])
        ).rows[0].category_id;

      // Vérifier que toutes les sous-catégories existent et appartiennent à la catégorie
      const subcategoriesCheck = await pool.query(
        "SELECT id FROM subcategories WHERE id = ANY($1) AND category_id = $2",
        [subcategoriesIds, finalCategoryId],
      );

      if (subcategoriesCheck.rows.length !== subcategoriesIds.length) {
        return res.status(400).json({
          message:
            "Une ou plusieurs sous-catégories sont invalides ou n'appartiennent pas à cette catégorie",
        });
      }

      // Supprimer les anciennes relations
      await pool.query(
        "DELETE FROM garage_subcategories WHERE garage_id = $1",
        [id],
      );

      // Insérer les nouvelles relations
      const subcategoryInserts = subcategoriesIds.map((subcategoryId: number) =>
        pool.query(
          "INSERT INTO garage_subcategories (garage_id, subcategory_id) VALUES ($1, $2)",
          [id, subcategoryId],
        ),
      );

      await Promise.all(subcategoryInserts);
    }

    // Récupérer le garage mis à jour
    const updatedGarage = await getCompleteGarageById(Number(id));

    res.status(200).json({
      message: "Garage mis à jour avec succès",
      garage: updatedGarage,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Supprimer un garage
const deleteGarage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Vous devez fournir l'ID du garage",
      });
    }

    // Supprimer d'abord les relations (CASCADE devrait le faire automatiquement)
    await pool.query("DELETE FROM garage_subcategories WHERE garage_id = $1", [
      id,
    ]);

    // Supprimer le garage
    const result = await pool.query(
      "DELETE FROM garages WHERE id = $1 RETURNING id, capacity, disponible",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Garage non trouvé",
      });
    }

    res.status(200).json({
      message: "Garage supprimé avec succès",
      deletedGarage: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

const getGarageDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Vérifier que l'ID est valide
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de garage invalide",
      });
    }

    // 1. Récupérer les informations de base du garage
    const garageQuery = await pool.query(
      `SELECT 
        g.id,
        g.name,
        g.address,
        g.phone,
        g.capacity,
        g.isDisponible,
        g.latitude,
        g.longitude,
        g.main_image,
        g.description,
        g.createdAt,
        g.updatedAt,
        c.id as category_id,
        c.name as category_name,
        c.description as category_description
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.id = $1`,
      [id],
    );

    // Vérifier si le garage existe
    if (garageQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Garage non trouvé",
      });
    }

    const garageInfo = garageQuery.rows[0];

    // 2. Récupérer toutes les images du garage
    const imagesQuery = await pool.query(
      `SELECT 
        id,
        image_url,
        is_featured,
        title,
        alt_text,
        created_at,
        updated_at
      FROM garage_images
      WHERE garage_id = $1
      ORDER BY is_featured DESC, created_at DESC`,
      [id],
    );

    // 3. Récupérer toutes les sous-catégories associées au garage
    const subcategoriesQuery = await pool.query(
      `SELECT 
        s.id,
        s.name,
        s.description,
        s.category_id,
        c.name as parent_category_name
      FROM subcategories s
      JOIN garage_subcategories gs ON s.id = gs.subcategory_id
      JOIN categories c ON s.category_id = c.id
      WHERE gs.garage_id = $1
      ORDER BY s.category_id, s.name`,
      [id],
    );

    // 4. Compter le nombre total d'images
    const imagesCount = imagesQuery.rows.length;

    // 5. Compter le nombre total de sous-catégories
    const subcategoriesCount = subcategoriesQuery.rows.length;

    // 6. Récupérer les garages proches (optionnel)
    const nearbyGaragesQuery = await pool.query(
      `SELECT 
        g.id,
        g.name,
        g.address,
        g.main_image,
        g.latitude,
        g.longitude,
        (
          6371 * acos(
            cos(radians($1)) * 
            cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians($2)) + 
            sin(radians($1)) * 
            sin(radians(g.latitude))
          )
        ) as distance_km
      FROM garages g
      WHERE g.id != $3
      AND g.isDisponible = true
      AND g.latitude IS NOT NULL 
      AND g.longitude IS NOT NULL
      ORDER BY distance_km ASC
      LIMIT 5`,
      [garageInfo.latitude, garageInfo.longitude, id],
    );

    // Construire l'objet de réponse
    const responseData = {
      id: garageInfo.id,
      name: garageInfo.name,
      address: garageInfo.address,
      phone: garageInfo.phone,
      capacity: garageInfo.capacity,
      isAvailable: garageInfo.isdisponible,
      location: {
        latitude: garageInfo.latitude,
        longitude: garageInfo.longitude,
      },
      description: garageInfo.description,
      mainImage: garageInfo.main_image,
      category: {
        id: garageInfo.category_id,
        name: garageInfo.category_name,
        description: garageInfo.category_description,
      },
      subcategories: subcategoriesQuery.rows.map((subcat) => ({
        id: subcat.id,
        name: subcat.name,
        description: subcat.description,
        categoryId: subcat.category_id,
        categoryName: subcat.parent_category_name,
      })),
      images: imagesQuery.rows.map((img) => ({
        id: img.id,
        url: img.image_url,
        isFeatured: img.is_featured,
        title: img.title,
        altText: img.alt_text,
        createdAt: img.created_at,
        updatedAt: img.updated_at,
      })),
      nearbyGarages: nearbyGaragesQuery.rows.map((garage) => ({
        id: garage.id,
        name: garage.name,
        address: garage.address,
        mainImage: garage.main_image,
        location: {
          latitude: garage.latitude,
          longitude: garage.longitude,
        },
        distanceKm: parseFloat(garage.distance_km).toFixed(2),
      })),
      stats: {
        imagesCount,
        subcategoriesCount,
      },
      timestamps: {
        createdAt: garageInfo.createdat,
        updatedAt: garageInfo.updatedat,
      },
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des détails du garage:",
      error,
    );
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
};

const getAllGaragesWithDetails = async (req: Request, res: Response) => {
  try {
    // Paramètres de pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Paramètres de filtrage
    const { category, subcategory, available } = req.query;
    let whereConditions = ["1=1"]; // Toujours vrai pour commencer
    const queryParams: any[] = [];
    let paramCount = 1;

    if (category) {
      whereConditions.push(`g.category_id = $${paramCount}`);
      queryParams.push(category);
      paramCount++;
    }

    if (subcategory) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM garage_subcategories gs 
        WHERE gs.garage_id = g.id AND gs.subcategory_id = $${paramCount}
      )`);
      queryParams.push(subcategory);
      paramCount++;
    }

    if (available === "true") {
      whereConditions.push(`g.isDisponible = true`);
    } else if (available === "false") {
      whereConditions.push(`g.isDisponible = false`);
    }

    const whereClause = whereConditions.join(" AND ");

    // 1. Récupérer le nombre total de garages (pour la pagination)
    const countQuery = await pool.query(
      `SELECT COUNT(*) FROM garages g WHERE ${whereClause}`,
      queryParams,
    );
    const totalCount = parseInt(countQuery.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // 2. Récupérer les informations des garages avec pagination
    const garagesQuery = await pool.query(
      `SELECT 
        g.id,
        g.name,
        g.address,
        g.phone,
        g.capacity,
        g.isDisponible,
        g.latitude,
        g.longitude,
        g.main_image,
        g.description,
        g.createdAt,
        g.updatedAt,
        c.id as category_id,
        c.name as category_name,
        c.description as category_description
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE ${whereClause}
      ORDER BY g.createdAt DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset],
    );

    // Récupérer les détails pour chaque garage
    const garagesWithDetails = await Promise.all(
      garagesQuery.rows.map(async (garage) => {
        // Récupérer les images du garage
        const imagesQuery = await pool.query(
          `SELECT 
            id,
            image_url,
            is_featured,
            title,
            alt_text
          FROM garage_images
          WHERE garage_id = $1
          ORDER BY is_featured DESC, created_at DESC
          LIMIT 5`, // Limiter à 5 images par garage pour éviter de surcharger la réponse
          [garage.id],
        );

        // Récupérer les sous-catégories du garage
        const subcategoriesQuery = await pool.query(
          `SELECT 
            s.id,
            s.name,
            s.category_id,
            c.name as parent_category_name
          FROM subcategories s
          JOIN garage_subcategories gs ON s.id = gs.subcategory_id
          JOIN categories c ON s.category_id = c.id
          WHERE gs.garage_id = $1`,
          [garage.id],
        );

        // Compter le nombre total d'images
        const totalImagesQuery = await pool.query(
          `SELECT COUNT(*) FROM garage_images WHERE garage_id = $1`,
          [garage.id],
        );
        const totalImages = parseInt(totalImagesQuery.rows[0].count);

        return {
          id: garage.id,
          name: garage.name,
          address: garage.address,
          phone: garage.phone,
          capacity: garage.capacity,
          isAvailable: garage.isdisponible,
          location: {
            latitude: garage.latitude,
            longitude: garage.longitude,
          },
          description: garage.description,
          mainImage: garage.main_image,
          category: {
            id: garage.category_id,
            name: garage.category_name,
          },
          subcategories: subcategoriesQuery.rows.map((subcat) => ({
            id: subcat.id,
            name: subcat.name,
            categoryId: subcat.category_id,
            categoryName: subcat.parent_category_name,
          })),
          images: imagesQuery.rows.map((img) => ({
            id: img.id,
            url: img.image_url,
            isFeatured: img.is_featured,
            title: img.title,
          })),
          stats: {
            totalImages,
          },
          timestamps: {
            createdAt: garage.createdat,
            updatedAt: garage.updatedat,
          },
        };
      }),
    );

    return res.status(200).json({
      success: true,
      count: garagesWithDetails.length,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      data: garagesWithDetails,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des garages:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
};

const searchGaragesWithDetails = async (req: Request, res: Response) => {
  try {
    // Paramètres de pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Paramètres de recherche
    const {
      query,
      category,
      subcategory,
      available,
      minCapacity,
      latitude,
      longitude,
      radius,
    } = req.query;

    let whereConditions = ["1=1"]; // Toujours vrai pour commencer
    const queryParams: any[] = [];
    let paramCount = 1;

    // Recherche textuelle
    if (query) {
      whereConditions.push(`(
        g.name ILIKE $${paramCount} OR 
        g.address ILIKE $${paramCount} OR 
        g.description ILIKE $${paramCount}
      )`);
      queryParams.push(`%${query}%`);
      paramCount++;
    }

    // Filtrage par catégorie
    if (category) {
      whereConditions.push(`g.category_id = $${paramCount}`);
      queryParams.push(category);
      paramCount++;
    }

    // Filtrage par sous-catégorie
    if (subcategory) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM garage_subcategories gs 
        WHERE gs.garage_id = g.id AND gs.subcategory_id = $${paramCount}
      )`);
      queryParams.push(subcategory);
      paramCount++;
    }

    // Filtrage par disponibilité
    if (available === "true") {
      whereConditions.push(`g.isDisponible = true`);
    } else if (available === "false") {
      whereConditions.push(`g.isDisponible = false`);
    }

    // Filtrage par capacité minimale
    if (minCapacity) {
      whereConditions.push(`g.capacity >= $${paramCount}`);
      queryParams.push(parseInt(minCapacity as string));
      paramCount++;
    }

    // Filtrage par rayon géographique
    let orderByClause = `g.createdAt DESC`;

    if (latitude && longitude && radius) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);

      if (!isNaN(lat) && !isNaN(lng) && !isNaN(rad)) {
        // Formule de calcul de distance Haversine
        whereConditions.push(`(
          6371 * acos(
            cos(radians($${paramCount})) * 
            cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians($${paramCount + 1})) + 
            sin(radians($${paramCount})) * 
            sin(radians(g.latitude))
          )
        ) <= $${paramCount + 2}`);

        queryParams.push(lat, lng, rad);
        paramCount += 3;

        // Ordonner par distance
        orderByClause = `(
          6371 * acos(
            cos(radians($${paramCount - 3})) * 
            cos(radians(g.latitude)) * 
            cos(radians(g.longitude) - radians($${paramCount - 2})) + 
            sin(radians($${paramCount - 3})) * 
            sin(radians(g.latitude))
          )
        ) ASC`;
      }
    }

    const whereClause = whereConditions.join(" AND ");

    // 1. Récupérer le nombre total de garages (pour la pagination)
    const countQuery = await pool.query(
      `SELECT COUNT(*) FROM garages g WHERE ${whereClause}`,
      queryParams,
    );
    const totalCount = parseInt(countQuery.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // 2. Récupérer les informations des garages avec pagination
    const garagesQuery = await pool.query(
      `SELECT 
        g.id,
        g.name,
        g.address,
        g.phone,
        g.capacity,
        g.isDisponible,
        g.latitude,
        g.longitude,
        g.main_image,
        g.description,
        g.createdAt,
        g.updatedAt,
        c.id as category_id,
        c.name as category_name,
        c.description as category_description,
        CASE 
          WHEN $${paramCount} IS NOT NULL AND $${
        paramCount + 1
      } IS NOT NULL THEN
            (
              6371 * acos(
                cos(radians($${paramCount})) * 
                cos(radians(g.latitude)) * 
                cos(radians(g.longitude) - radians($${paramCount + 1})) + 
                sin(radians($${paramCount})) * 
                sin(radians(g.latitude))
              )
            )
          ELSE NULL
        END as distance_km
      FROM garages g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${paramCount + 2} OFFSET $${paramCount + 3}`,
      [...queryParams, latitude, longitude, limit, offset],
    );

    // Récupérer les détails pour chaque garage
    const garagesWithDetails = await Promise.all(
      garagesQuery.rows.map(async (garage) => {
        // Récupérer les images du garage
        const imagesQuery = await pool.query(
          `SELECT 
            id,
            image_url,
            is_featured,
            title,
            alt_text
          FROM garage_images
          WHERE garage_id = $1
          ORDER BY is_featured DESC, created_at DESC
          LIMIT 5`, // Limiter à 5 images par garage pour éviter de surcharger la réponse
          [garage.id],
        );

        // Récupérer les sous-catégories du garage
        const subcategoriesQuery = await pool.query(
          `SELECT 
            s.id,
            s.name,
            s.category_id,
            c.name as parent_category_name
          FROM subcategories s
          JOIN garage_subcategories gs ON s.id = gs.subcategory_id
          JOIN categories c ON s.category_id = c.id
          WHERE gs.garage_id = $1`,
          [garage.id],
        );

        return {
          id: garage.id,
          name: garage.name,
          address: garage.address,
          phone: garage.phone,
          capacity: garage.capacity,
          isAvailable: garage.isdisponible,
          location: {
            latitude: garage.latitude,
            longitude: garage.longitude,
          },
          distance: garage.distance_km
            ? parseFloat(garage.distance_km).toFixed(2)
            : null,
          description: garage.description,
          mainImage: garage.main_image,
          category: {
            id: garage.category_id,
            name: garage.category_name,
          },
          subcategories: subcategoriesQuery.rows.map((subcat) => ({
            id: subcat.id,
            name: subcat.name,
            categoryId: subcat.category_id,
            categoryName: subcat.parent_category_name,
          })),
          images: imagesQuery.rows.map((img) => ({
            id: img.id,
            url: img.image_url,
            isFeatured: img.is_featured,
            title: img.title,
          })),
          timestamps: {
            createdAt: garage.createdat,
            updatedAt: garage.updatedat,
          },
        };
      }),
    );

    return res.status(200).json({
      success: true,
      count: garagesWithDetails.length,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      searchCriteria: {
        query,
        category,
        subcategory,
        available,
        minCapacity,
        location:
          latitude && longitude
            ? { latitude, longitude, radiusKm: radius }
            : null,
      },
      data: garagesWithDetails,
    });
  } catch (error) {
    console.error("Erreur lors de la recherche des garages:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
};

export {
  addGarage,
  getAllGarages,
  getGarage,
  getGaragesByCategory,
  getGaragesBySubcategory,
  updateGarage,
  deleteGarage,
  getGarageDetails,
  getAllGaragesWithDetails,
  searchGaragesWithDetails,
};
