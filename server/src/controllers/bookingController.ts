/** @format */
import { Request, Response } from "express";
import pool from "../db/pgDB.js";
import { BookingType } from "../models/Booking.js";

async function callGarageAPI(endpoint: string): Promise<any | null> {
    try {
        const GARAGE_API_URL = process.env.GARAGE_API_URL || "http://localhost:5000/api";
        const axios = (await import('axios')).default;

        const response = await axios.get(`${GARAGE_API_URL}${endpoint}`, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error: any) {
        return null;
    }
}

const createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            garageId,
            garageAddress,
            garageName,
            serviceId,
            automobileId,
            reservedAt,
            notes
        } = req.body;

        if (!garageId || !serviceId || !automobileId || !reservedAt) {
            res.status(400).json({
                success: false,
                message: "Toutes les données essentielles sont requises : garageId, serviceId, automobileId, reservedAt"
            });
            return;
        }

        const carCheck = await pool.query(
            "SELECT id, user_id FROM cars WHERE id = $1",
            [automobileId]
        );

        if (carCheck.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "La voiture n'existe pas"
            });
            return;
        }

        const conflictCheck = await pool.query(`
            SELECT id FROM booking 
            WHERE garageId = $1 AND automobileId = $2 AND reservedAt = $3
        `, [garageId, automobileId, reservedAt]);

        if (conflictCheck.rows.length > 0) {
            res.status(409).json({
                success: false,
                message: "Ce rendez-vous est déjà réservé pour cette voiture dans le même garage"
            });
            return;
        }

        let garageInfo = null;
        if (!garageName || !garageAddress) {
            garageInfo = await callGarageAPI(`/garages/${garageId}`);
        }

        const insertQuery = `
            INSERT INTO booking (
                garageId, garageAddress, garageName, serviceId, 
                automobileId, reservedAt, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING *
        `;

        const values = [
            garageId,
            garageAddress || garageInfo?.data?.address || `Garage numéro ${garageId}`,
            garageName || garageInfo?.data?.name || `Garage ${garageId}`,
            serviceId,
            automobileId,
            reservedAt,
            notes
        ];

        const result = await pool.query(insertQuery, values);
        const booking = result.rows[0];

        const bookingDetails = await getBookingWithDetails(booking.id);

        res.status(201).json({
            success: true,
            message: "La réservation a été créée avec succès",
            data: bookingDetails
        });

    } catch (error: any) {
        console.error("Erreur lors de la création de la réservation :", error);
        res.status(500).json({
            success: false,
            message: "Erreur du serveur",
            error: error.message
        });
    }
};

const getAllBookings = async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            limit = 20,
            userId,
            garageId,
            status,
            serviceId,
            search
        } = req.query;

        const offset = (Number(page) - 1) * Number(limit);
        let whereConditions = ['1=1'];
        let queryParams: any[] = [];
        let paramCount = 1;

        if (userId) {
            whereConditions.push(`b.userId = $${paramCount}`);
            queryParams.push(String(userId));
            paramCount++;
        }

        if (garageId) {
            whereConditions.push(`b.garageId = $${paramCount}`);
            queryParams.push(String(garageId));
            paramCount++;
        }

        if (status) {
            whereConditions.push(`b.status = $${paramCount}`);
            queryParams.push(String(status));
            paramCount++;
        }

        if (serviceId) {
            whereConditions.push(`b.serviceId = $${paramCount}`);
            queryParams.push(String(serviceId));
            paramCount++;
        }

        if (search) {
            whereConditions.push(`(
                b.garageName ILIKE $${paramCount} OR 
                u.name ILIKE $${paramCount} OR 
                c.mark ILIKE $${paramCount} OR
                c.matricule ILIKE $${paramCount}
            )`);
            queryParams.push(`%${String(search)}%`);
            paramCount++;
        }

        const whereClause = whereConditions.join(' AND ');

        const countQuery = `
            SELECT COUNT(*) 
            FROM booking b
            LEFT JOIN users u ON b.userId = u.id
            LEFT JOIN cars c ON b.automobileId = c.id
            WHERE ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);

        const dataQuery = `
            SELECT 
                b.*,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                c.mark as car_mark,
                c.model as car_model,
                c.matricule as car_matricule,
                c.year as car_year,
                a.place as user_address,
                a.type as address_type
            FROM booking b
            LEFT JOIN users u ON b.userId = u.id
            LEFT JOIN cars c ON b.automobileId = c.id
            LEFT JOIN address a ON u.id = a.user_id AND a.type = 'home'
            WHERE ${whereClause}
            ORDER BY b.reservedAt DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        queryParams.push(Number(limit), offset);
        const dataResult = await pool.query(dataQuery, queryParams);

        const bookingsWithGarageInfo = await Promise.all(
            dataResult.rows.map(async (booking: any) => {
                const [garageInfo, serviceInfo] = await Promise.all([
                    callGarageAPI(`/garages/${booking.garageid}`),
                    callGarageAPI(`/services/${booking.serviceid}`)
                ]);

                return {
                    ...booking,
                    garage_name: garageInfo?.data?.name || booking.garagename,
                    garage_address: garageInfo?.data?.address || booking.garageaddress,
                    garage_phone: garageInfo?.data?.phone || null,
                    garage_rating: garageInfo?.data?.rating || null,
                    service_name: serviceInfo?.data?.name || `Service ${booking.serviceid}`,
                    service_price: serviceInfo?.data?.price || null,
                    service_duration: serviceInfo?.data?.duration || null,
                    external_data_available: !!(garageInfo && serviceInfo)
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "Les réservations ont été récupérées avec succès",
            data: {
                bookings: bookingsWithGarageInfo,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                    hasNext: offset + Number(limit) < total,
                    hasPrev: Number(page) > 1
                }
            }
        });

    } catch (error: any) {
        console.error("Erreur lors de la récupération des réservations :", error);
        res.status(500).json({
            success: false,
            message: "Erreur du serveur",
            error: error.message
        });
    }
};

const getUserBookings = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { status, upcoming } = req.query;

        let whereConditions = ['b.userId = $1'];
        let queryParams = [userId];
        let paramCount = 2;

        if (status) {
            whereConditions.push(`b.status = $${paramCount}`);
            queryParams.push(String(status));
            paramCount++;
        }

        if (upcoming === 'true') {
            whereConditions.push(`b.reservedAt > NOW()`);
        }

        const whereClause = whereConditions.join(' AND ');

        const query = `
            SELECT 
                b.*,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                c.mark as car_mark,
                c.model as car_model,
                c.matricule as car_matricule,
                c.year as car_year,
                a.place as user_address
            FROM booking b
            LEFT JOIN users u ON b.userId = u.id
            LEFT JOIN cars c ON b.automobileId = c.id
            LEFT JOIN address a ON u.id = a.user_id AND a.type = 'home'
            WHERE ${whereClause}
            ORDER BY b.reservedAt ASC
        `;

        const result = await pool.query(query, queryParams);

        const bookingsWithDetails = await Promise.all(
            result.rows.map(async (booking: any) => {
                const [garageInfo, serviceInfo] = await Promise.all([
                    callGarageAPI(`/garages/${booking.garageid}`),
                    callGarageAPI(`/services/${booking.serviceid}`)
                ]);

                return {
                    ...booking,
                    garage_details: garageInfo?.data || {
                        name: booking.garagename,
                        address: booking.garageaddress
                    },
                    service_details: serviceInfo?.data || {
                        name: `Service ${booking.serviceid}`
                    }
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "Les réservations de l'utilisateur ont été récupérées avec succès",
            data: bookingsWithDetails
        });

    } catch (error: any) {
        console.error("Erreur lors de la récupération des réservations de l'utilisateur :", error);
        res.status(500).json({
            success: false,
            message: "Erreur du serveur",
            error: error.message
        });
    }
};

const getGarageBookings = async (req: Request, res: Response) => {
    try {
        const { garageId } = req.params;
        const { status, date } = req.query;

        let whereConditions = ['b.garageId = $1'];
        let queryParams = [garageId];
        let paramCount = 2;

        if (status) {
            whereConditions.push(`b.status = $${paramCount}`);
            queryParams.push(String(status));
            paramCount++;
        }

        if (date) {
            whereConditions.push(`DATE(b.reservedAt) = $${paramCount}`);
            queryParams.push(String(date));
            paramCount++;
        }

        const whereClause = whereConditions.join(' AND ');

        const query = `
            SELECT 
                b.*,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                c.mark as car_mark,
                c.model as car_model,
                c.matricule as car_matricule,
                c.year as car_year
            FROM booking b
            LEFT JOIN users u ON b.userId = u.id
            LEFT JOIN cars c ON b.automobileId = c.id
            WHERE ${whereClause}
            ORDER BY b.reservedAt ASC
        `;

        const result = await pool.query(query, queryParams);

        const bookingsWithServiceInfo = await Promise.all(
            result.rows.map(async (booking: any) => {
                const serviceInfo = await callGarageAPI(`/services/${booking.serviceid}`);

                return {
                    ...booking,
                    service_details: serviceInfo?.data || {
                        name: `Service ${booking.serviceid}`
                    }
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "Les réservations du garage ont été récupérées avec succès",
            data: bookingsWithServiceInfo
        });

    } catch (error: any) {
        console.error("Erreur lors de la récupération des réservations du garage :", error);
        res.status(500).json({
            success: false,
            message: "Erreur du serveur",
            error: error.message
        });
    }
};

const updateBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = [
            'reservedAt', 'status', 'notes', 'garageAddress', 'garageName'
        ];

        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        for (const [field, value] of Object.entries(updates)) {
            if (allowedFields.includes(field) && value !== undefined) {
                updateFields.push(`${field} = $${paramCount}`);
                updateValues.push(value);
                paramCount++;
            }
        }

        if (updateFields.length === 0) {
            res.status(400).json({
                success: false,
                message: "Aucun champ valide pour la mise à jour"
            });
            return;
        }

        updateValues.push(id);

        const updateQuery = `
            UPDATE booking 
            SET ${updateFields.join(', ')}, updatedAt = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, updateValues);

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "La réservation n'existe pas"
            });
            return;
        }

        const updatedBooking = await getBookingWithDetails(Number(id));

        res.status(200).json({
            success: true,
            message: "La réservation a été mise à jour avec succès",
            data: updatedBooking
        });

    } catch (error: any) {
        console.error("Erreur lors de la mise à jour de la réservation :", error);
        res.status(500).json({
            success: false,
            message: "Erreur du serveur",
            error: error.message
        });
    }
};

const deleteBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM booking WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "La réservation n'existe pas"
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "La réservation a été supprimée avec succès",
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error("Erreur lors de la suppression de la réservation :", error);
        res.status(500).json({
            success: false,
            message: "Erreur du serveur",
            error: error.message
        });
    }
};

const getBookingStats = async (req: Request, res: Response) => {
    try {
        const { userId, garageId } = req.query;

        let whereClause = '';
        const params: any[] = [];
        let paramCount = 1;

        if (userId) {
            whereClause = ` WHERE userId = $${paramCount}`;
            params.push(String(userId));
            paramCount++;
        } else if (garageId) {
            whereClause = ` WHERE garageId = $${paramCount}`;
            params.push(String(garageId));
            paramCount++;
        }

        const statsQuery = `
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                COUNT(CASE WHEN DATE(reservedAt) = CURRENT_DATE THEN 1 END) as today_bookings,
                COUNT(CASE WHEN reservedAt >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week_bookings,
                COUNT(CASE WHEN reservedAt >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as this_month_bookings
            FROM booking${whereClause}
        `;

        const result = await pool.query(statsQuery, params);

        const timeStatsQuery = `
            SELECT 
                DATE_TRUNC('day', reservedAt) as booking_date,
                COUNT(*) as bookings_count,
                status
            FROM booking${whereClause}
            WHERE reservedAt >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', reservedAt), status
            ORDER BY booking_date DESC
        `;

        const timeStatsResult = await pool.query(timeStatsQuery, params);

        res.status(200).json({
            success: true,
            message: "Les statistiques ont été récupérées avec succès",
            data: {
                overview: result.rows[0],
                daily_breakdown: timeStatsResult.rows,
                filters_applied: { userId, garageId }
            }
        });

    } catch (error: any) {
        console.error("Erreur lors de la récupération des statistiques :", error);
        res.status(500).json({
            success: false,
            message: "Erreur du serveur",
            error: error.message
        });
    }
};

const getBookingById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const booking = await getBookingWithDetails(Number(id));

        if (!booking) {
            res.status(404).json({
                success: false,
                message: "La réservation n'existe pas"
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Les détails de la réservation ont été récupérés avec succès",
            data: booking
        });

    } catch (error: any) {
        console.error("Erreur lors de la récupération des détails de la réservation :", error);
        res.status(500).json({
            success: false,
            message: "Erreur du serveur",
            error: error.message
        });
    }
};

async function getBookingWithDetails(bookingId: number) {
    try {
        const query = `
            SELECT 
                b.*,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                c.mark as car_mark,
                c.model as car_model,
                c.matricule as car_matricule,
                c.year as car_year,
                a.place as user_address,
                a.type as address_type
            FROM booking b
            LEFT JOIN users u ON b.userId = u.id
            LEFT JOIN cars c ON b.automobileId = c.id
            LEFT JOIN address a ON u.id = a.user_id AND a.type = 'home'
            WHERE b.id = $1
        `;

        const result = await pool.query(query, [bookingId]);

        if (result.rows.length === 0) {
            return null;
        }

        const booking = result.rows[0];

        const [garageInfo, serviceInfo] = await Promise.all([
            callGarageAPI(`/garages/${booking.garageid}`),
            callGarageAPI(`/services/${booking.serviceid}`)
        ]);

        return {
            ...booking,
            garage_details: garageInfo?.data || {
                name: booking.garagename,
                address: booking.garageaddress
            },
            service_details: serviceInfo?.data || {
                name: `Service ${booking.serviceid}`
            },
            external_data_available: !!(garageInfo && serviceInfo)
        };

    } catch (error) {
        console.error("Erreur lors de la récupération des détails de la réservation :", error);
        return null;
    }
}

export {
    createBooking,
    getAllBookings,
    getUserBookings,
    getGarageBookings,
    updateBooking,
    deleteBooking,
    getBookingStats,
    getBookingById
};