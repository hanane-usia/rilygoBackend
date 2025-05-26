/** @format */
import express, { RequestHandler } from "express";
import {
  addBooking,
  getAllBookings,
  getBookingsByUser,
  getBookingsByGarage,
  updateBooking,
  deleteBooking,
  getBookingsByStatus,
} from "../controllers/bookingController.js";

const router = express.Router();

// POST /api/bookings - Créer une nouvelle réservation
router.post("/bookings", addBooking as RequestHandler);

// GET /api/bookings - Obtenir toutes les réservations avec pagination et filtres
// Query params: page, limit, userId, garageId, status
router.get("/bookings", getAllBookings);

// GET /api/bookings/user/:userId - Obtenir les réservations d'un utilisateur
router.get("/bookings/user/:userId", getBookingsByUser as RequestHandler);

// GET /api/bookings/garage/:garageId - Obtenir les réservations d'un garage
// Query params: date, status
router.get("/bookings/garage/:garageId", getBookingsByGarage as RequestHandler);

// PUT /api/bookings/:id - Mettre à jour une réservation
router.put("/bookings/:id", updateBooking as RequestHandler);

// DELETE /api/bookings/:id - Supprimer une réservation
router.delete("/bookings/:id", deleteBooking as RequestHandler);
// Dans bookingRoutes.js, ajoutez cette ligne :
router.get("/bookings/status/:status", getBookingsByStatus as RequestHandler);
export default router;
