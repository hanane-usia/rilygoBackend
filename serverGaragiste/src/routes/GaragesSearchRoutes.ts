/** @format */
import express from "express";
import {
  searchGaragesByLocation,
  searchGaragesByCategoryLocation,
  searchNearbyGarages,
  findNearestGarages,
  searchGaragesInBounds
} from "../controllers/GaragesSearchController";

const router = express.Router();

router.get("/search/nearby", searchNearbyGarages);

router.get("/search/nearest", findNearestGarages);
router.get("/search/bounds", searchGaragesInBounds);

router.get(
  "/garages/subcategory/:subcategoryId/location/:latitude/:longitude/:radiusZone",
  searchGaragesByLocation
);

router.get(
  "/garages/category/:category_id/location/:latitude/:longitude/:radiusZone",
  searchGaragesByCategoryLocation
);

export default router;