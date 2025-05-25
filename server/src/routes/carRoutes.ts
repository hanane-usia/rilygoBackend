/** @format */

import express, { RequestHandler } from "express";
import {
  addCar,
  getCars,
  getCarById,
  updateCar,
  deleteCar,
  getCarsByUserId,
} from "../controllers/carController.js";

const router = express.Router();

router.post("/cars", addCar as RequestHandler);
router.get("/cars", getCars as RequestHandler);
router.get("/cars/:id", getCarById as RequestHandler);
router.put("/cars/:id", updateCar as RequestHandler);
router.delete("/cars/:id", deleteCar as RequestHandler);
router.get("/cars/user/:user_id", getCarsByUserId as RequestHandler); // NEW: Get cars by user ID

export default router;
