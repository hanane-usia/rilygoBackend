/** @format */
import express from "express";
import {
  searchGaragesByLocation,
  searchGaragesByCategoryLocation,
} from "../controllers/GaragesSearchController";

const router = express.Router();

// Routes de géolocalisation avec paramètres dans le path

// GET /api/garages/subcategory/:subcategoryId/location/:latitude/:longitude/:radiusZone
// Rechercher les garages par sous-catégorie et géolocalisation
// Query params optionnels: categoryId, limit
router.get(
  "/garages/subcategory/:subcategoryId/location/:latitude/:longitude/:radiusZone",
  searchGaragesByLocation,
);

// GET /api/garages/category/:categoryId/location/:latitude/:longitude/:radiusZone
// Rechercher les garages par catégorie et géolocalisation
// Query params optionnels: subcategoryId, limit
// router.get(
//   "/garages/category/:categoryId/location/:latitude/:longitude/:radiusZone",
//   searchGaragesByCategoryLocation,
// );

export default router;
