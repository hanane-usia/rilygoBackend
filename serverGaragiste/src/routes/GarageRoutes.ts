/** @format */
import express from "express";
import {
  addGarage,
  getAllGarages,
  getGarage,
  getGaragesByCategory,
  getGaragesBySubcategory,
  updateGarage,
  deleteGarage,
  getAllGaragesWithDetails,
  getGarageDetails,
  searchGaragesWithDetails,
} from "../controllers/GarageController"; // Ajustez le chemin

const router = express.Router();

// POST /api/garages - Créer un nouveau garage
router.post("/garages", addGarage);

// GET /api/garages - Obtenir tous les garages avec pagination et filtres
// Query params: page, limit, disponible, categoryId
router.get("/garages", getAllGarages);

// GET /api/garages/:id - Obtenir un garage par ID
router.get("/garages/:id", getGarage);

// GET /api/garages/category/:categoryId - Obtenir les garages par catégorie
router.get("/garages/category/:categoryId", getGaragesByCategory);

// GET /api/garages/subcategory/:subcategoryId - Obtenir les garages par sous-catégorie
router.get("/garages/subcategory/:subcategoryId", getGaragesBySubcategory);

// PUT /api/garages/:id - Mettre à jour un garage
router.put("/garages/:id", updateGarage);

// DELETE /api/garages/:id - Supprimer un garage
router.delete("/garages/:id", deleteGarage);

//get all garages with details
router.get("/garages/all/details", getAllGaragesWithDetails);
router.get("/garages/:id/details", getGarageDetails);
router.get("/garages/search", searchGaragesWithDetails);

export default router;
