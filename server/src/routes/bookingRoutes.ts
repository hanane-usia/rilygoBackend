/** @format */
import express, { Router } from "express";
import {
    createBooking,
    getAllBookings,
    getUserBookings,
    getGarageBookings,
    updateBooking,
    deleteBooking,
    getBookingStats,
    getBookingById
} from "../controllers/BookingController.js";

const router: Router = express.Router();

router.post("/bookings", createBooking);
router.get("/bookings", getAllBookings);
router.get("/bookings/stats", getBookingStats);
router.get("/bookings/:id", getBookingById);
router.get("/bookings/user/:userId", getUserBookings);
router.get("/bookings/garage/:garageId", getGarageBookings);
router.put("/bookings/:id", updateBooking);
router.delete("/bookings/:id", deleteBooking);

export default router;