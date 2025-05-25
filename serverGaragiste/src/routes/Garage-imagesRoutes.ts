/** @format */
import express from "express";
import { Router } from "express";
import pool from "../db/pgDB";

const router: Router = express.Router();

router.get("/garages/:garageId/images", async (req, res) => {
  try {
    const { garageId } = req.params;

    // Vérifier que le garage existe
    const garageCheck = await pool.query(
      "SELECT id FROM garages WHERE id = $1",
      [garageId],
    );

    if (garageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Garage non trouvé",
      });
    }

    // Récupérer toutes les images du garage
    const images = await pool.query(
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
      [garageId],
    );

    return res.status(200).json({
      success: true,
      count: images.rows.length,
      data: images.rows,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des images:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

router.get("/garages/:garageId/images/:imageId", async (req, res) => {
  try {
    const { garageId, imageId } = req.params;

    // Récupérer l'image spécifique
    const image = await pool.query(
      `SELECT 
        id, 
        garage_id,
        image_url, 
        is_featured, 
        title, 
        alt_text, 
        created_at, 
        updated_at
      FROM garage_images 
      WHERE id = $1 AND garage_id = $2`,
      [imageId, garageId],
    );

    if (image.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Image non trouvée pour ce garage",
      });
    }

    return res.status(200).json({
      success: true,
      data: image.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'image:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

router.post("/garages/:garageId/images", async (req, res) => {
  try {
    const { garageId } = req.params;
    const { image_url, is_featured, title, alt_text } = req.body;

    // Validation des données
    if (!image_url) {
      return res.status(400).json({
        success: false,
        message: "L'URL de l'image est requise",
      });
    }

    // Vérifier que le garage existe
    const garageCheck = await pool.query(
      "SELECT id FROM garages WHERE id = $1",
      [garageId],
    );

    if (garageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Garage non trouvé",
      });
    }

    // Si l'image est marquée comme "featured", mettre à jour les autres images
    if (is_featured) {
      await pool.query(
        "UPDATE garage_images SET is_featured = false WHERE garage_id = $1",
        [garageId],
      );
    }

    // Insérer la nouvelle image
    const newImage = await pool.query(
      `INSERT INTO garage_images 
        (garage_id, image_url, is_featured, title, alt_text) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`,
      [garageId, image_url, is_featured || false, title, alt_text],
    );

    return res.status(201).json({
      success: true,
      message: "Image ajoutée avec succès",
      data: newImage.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'image:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

router.put("/garages/:garageId/images/:imageId", async (req, res) => {
  try {
    const { garageId, imageId } = req.params;
    const { image_url, is_featured, title, alt_text } = req.body;

    // Vérifier que l'image existe pour ce garage
    const imageCheck = await pool.query(
      "SELECT * FROM garage_images WHERE id = $1 AND garage_id = $2",
      [imageId, garageId],
    );

    if (imageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Image non trouvée pour ce garage",
      });
    }

    // Si l'image est marquée comme "featured", mettre à jour les autres images
    if (is_featured) {
      await pool.query(
        "UPDATE garage_images SET is_featured = false WHERE garage_id = $1 AND id != $2",
        [garageId, imageId],
      );
    }

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (image_url !== undefined) {
      updates.push(`image_url = $${paramIndex}`);
      values.push(image_url);
      paramIndex++;
    }

    if (is_featured !== undefined) {
      updates.push(`is_featured = $${paramIndex}`);
      values.push(is_featured);
      paramIndex++;
    }

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
    }

    if (alt_text !== undefined) {
      updates.push(`alt_text = $${paramIndex}`);
      values.push(alt_text);
      paramIndex++;
    }

    // Ajouter updated_at
    updates.push(`updated_at = NOW()`);

    // Si aucune mise à jour n'est fournie
    if (updates.length === 1) {
      // Seulement updated_at
      return res.status(400).json({
        success: false,
        message: "Aucune donnée fournie pour la mise à jour",
      });
    }

    // Construire et exécuter la requête
    const updateQuery = `
      UPDATE garage_images 
      SET ${updates.join(", ")} 
      WHERE id = $${paramIndex} AND garage_id = $${paramIndex + 1} 
      RETURNING *
    `;
    values.push(imageId, garageId);

    const updatedImage = await pool.query(updateQuery, values);

    return res.status(200).json({
      success: true,
      message: "Image mise à jour avec succès",
      data: updatedImage.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'image:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

router.delete("/garages/:garageId/images/:imageId", async (req, res) => {
  try {
    const { garageId, imageId } = req.params;

    // Vérifier que l'image existe pour ce garage
    const imageCheck = await pool.query(
      "SELECT * FROM garage_images WHERE id = $1 AND garage_id = $2",
      [imageId, garageId],
    );

    if (imageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Image non trouvée pour ce garage",
      });
    }

    // Supprimer l'image
    await pool.query(
      "DELETE FROM garage_images WHERE id = $1 AND garage_id = $2",
      [imageId, garageId],
    );

    // Si l'image supprimée était en vedette, mettre la première image restante en vedette
    if (imageCheck.rows[0].is_featured) {
      const remainingImages = await pool.query(
        "SELECT id FROM garage_images WHERE garage_id = $1 ORDER BY created_at DESC LIMIT 1",
        [garageId],
      );

      if (remainingImages.rows.length > 0) {
        await pool.query(
          "UPDATE garage_images SET is_featured = true WHERE id = $1",
          [remainingImages.rows[0].id],
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Image supprimée avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'image:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

router.put(
  "/garages/:garageId/images/:imageId/set-featured",
  async (req, res) => {
    try {
      const { garageId, imageId } = req.params;

      // Vérifier que l'image existe pour ce garage
      const imageCheck = await pool.query(
        "SELECT * FROM garage_images WHERE id = $1 AND garage_id = $2",
        [imageId, garageId],
      );

      if (imageCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Image non trouvée pour ce garage",
        });
      }

      // Mettre à jour toutes les images pour ne pas être en vedette
      await pool.query(
        "UPDATE garage_images SET is_featured = false WHERE garage_id = $1",
        [garageId],
      );

      // Définir l'image spécifiée comme en vedette
      const updatedImage = await pool.query(
        "UPDATE garage_images SET is_featured = true WHERE id = $1 AND garage_id = $2 RETURNING *",
        [imageId, garageId],
      );

      // Mettre à jour l'image principale du garage
      await pool.query("UPDATE garages SET main_image = $1 WHERE id = $2", [
        updatedImage.rows[0].image_url,
        garageId,
      ]);

      return res.status(200).json({
        success: true,
        message: "Image définie comme principale avec succès",
        data: updatedImage.rows[0],
      });
    } catch (error) {
      console.error(
        "Erreur lors de la définition de l'image principale:",
        error,
      );
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  },
);

router.delete("/garages/:garageId/images", async (req, res) => {
  try {
    const { garageId } = req.params;

    // Vérifier que le garage existe
    const garageCheck = await pool.query(
      "SELECT id FROM garages WHERE id = $1",
      [garageId],
    );

    if (garageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Garage non trouvé",
      });
    }

    // Supprimer toutes les images du garage
    const result = await pool.query(
      "DELETE FROM garage_images WHERE garage_id = $1",
      [garageId],
    );

    // Mettre à jour l'image principale du garage à null
    await pool.query("UPDATE garages SET main_image = NULL WHERE id = $1", [
      garageId,
    ]);

    return res.status(200).json({
      success: true,
      message: `${result.rowCount} images supprimées avec succès`,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des images:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

export default router;
