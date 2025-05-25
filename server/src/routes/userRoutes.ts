/** @format */

import express, {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import {
  addUser,
  getAllUser,
  getUser,
  updateUser,
  deleteUser,
  getUserWithCars,
} from "../controllers/userController.js"; // Or .js if it's JavaScript

const router: Router = express.Router();

// Correct usage:
router.post("/users", addUser as RequestHandler);
router.get("/users", getAllUser as RequestHandler);
router.get("/users/:id", getUser as RequestHandler);
router.put("/users/:id", updateUser as RequestHandler);
router.delete("/users/:id", deleteUser as RequestHandler);
router.get("/users/:userId/cars", getUserWithCars as RequestHandler);

export default router;
