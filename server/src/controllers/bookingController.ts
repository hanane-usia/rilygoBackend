/** @format */
import { Response, Request } from "express";
import pool from "../db/pgDB.js";

export type BookingType = {
  id?: number;
  garageId: number; // ID du garage (récupéré via API)
  garageAddress?: string; // Stocké localement pour performance
  garageName?: string; // Stocké localement pour performance
  automobileId: number; // FK vers cars table (même DB)
  carId: number; // Alias pour automobileId
  serviceId: number; // ID du service (récupéré via API)
  reservedAt: Date; // Date/heure de réservation
  userId?: number; // Calculé depuis automobileId
  createdAt?: Date;
  updatedAt?: Date;
};

// Configuration de l'API Gateway/Server Garagiste
const GARAGE_API_BASE_URL =
  process.env.GARAGE_API_URL || "http://localhost:5001/api";

// Helper function pour appeler l'API des garages
const callGarageAPI = async (endpoint: string) => {
  try {
    const response = await fetch(`${GARAGE_API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Garage API Error:", error);
    return null;
  }
};

// Ajouter une réservation
const addBooking = async (req: Request, res: Response) => {
  try {
    const {
      garageId,
      automobileId,
      carId,
      serviceId,
      reservedAt,
    }: BookingType = req.body;

    const finalCarId = carId || automobileId;

    if (!garageId || !finalCarId || !serviceId || !reservedAt) {
      return res.status(400).json({
        message: "garageId, carId, serviceId et reservedAt sont requis",
      });
    }

    // 1. Vérifier que la voiture existe (JOIN local)
    const carCheck = await pool.query(
      `
      SELECT c.id, c.user_id, u.name as owner_name, u.email as owner_email
      FROM cars c
      LEFT JOIN users u ON c.user_id = u.id  
      WHERE c.id = $1
    `,
      [finalCarId],
    );

    if (carCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Voiture non trouvée",
      });
    }

    const car = carCheck.rows[0];
    const userId = car.user_id;

    // 2. Appeler l'API pour vérifier le garage
    const garageData = await callGarageAPI(`/garages/${garageId}`);
    if (!garageData || !garageData.garage) {
      return res.status(404).json({
        message: "Garage non trouvé ou service garage indisponible",
      });
    }

    // 3. Appeler l'API pour vérifier le service (supposant qu'il y a un endpoint services)
    const serviceData = await callGarageAPI(`/services/${serviceId}`);
    if (!serviceData) {
      return res.status(404).json({
        message: "Service non trouvé ou service indisponible",
      });
    }

    // 4. Vérifier les conflits de réservation
    const conflictCheck = await pool.query(
      `
      SELECT id FROM booking 
      WHERE garageId = $1 
      AND reservedAt = $2
    `,
      [garageId, reservedAt],
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Créneau déjà réservé pour ce garage",
      });
    }

    // 5. Insérer la réservation
    const query = `
      INSERT INTO booking (
        garageId, garageAddress, garageName, automobileId, 
        serviceId, reservedAt, userId, createdAt, updatedAt
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      garageId,
      garageData.garage.address || null,
      garageData.garage.name || null,
      finalCarId,
      serviceId,
      reservedAt,
      userId,
    ];

    const result = await pool.query(query, values);
    const booking = result.rows[0];

    // 6. Enrichir la réponse avec les données des autres services
    const enrichedBooking = {
      ...booking,
      car: car,
      garage: garageData.garage,
      service: serviceData.service || serviceData,
    };

    res.status(201).json({
      message: "Réservation créée avec succès",
      booking: enrichedBooking,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir toutes les réservations avec enrichissement
const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, userId, garageId, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 1;

    if (userId) {
      whereConditions.push(`b.userId = $${paramCount}`);
      queryParams.push(Number(userId));
      paramCount++;
    }

    if (garageId) {
      whereConditions.push(`b.garageId = $${paramCount}`);
      queryParams.push(Number(garageId));
      paramCount++;
    }

    if (status) {
      whereConditions.push(`b.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Requête avec JOIN sur les tables locales
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
      ${whereClause}
      ORDER BY b.createdAt DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(Number(limit), offset);
    const result = await pool.query(query, queryParams);

    // Enrichir chaque réservation avec les données des garages (API calls)
    const enrichedBookings = await Promise.all(
      result.rows.map(async (booking) => {
        // Appel API pour récupérer les détails du garage
        const garageData = await callGarageAPI(`/garages/${booking.garageid}`);

        // Appel API pour récupérer les détails du service
        const serviceData = await callGarageAPI(
          `/services/${booking.serviceid}`,
        );

        return {
          id: booking.id,
          garageId: booking.garageid,
          automobileId: booking.automobileid,
          serviceId: booking.serviceid,
          reservedAt: booking.reservedat,
          status: booking.status,
          createdAt: booking.createdat,
          updatedAt: booking.updatedat,
          // Données locales (JOIN)
          user: {
            id: booking.userid,
            name: booking.user_name,
            email: booking.user_email,
            phone: booking.user_phone,
          },
          car: {
            id: booking.automobileid,
            mark: booking.car_mark,
            model: booking.car_model,
            matricule: booking.car_matricule,
            year: booking.car_year,
          },
          // Données externes (API)
          garage: garageData?.garage || {
            id: booking.garageid,
            name: booking.garagename,
            address: booking.garageaddress,
          },
          service: serviceData?.service || serviceData || null,
        };
      }),
    );

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM booking b ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalBookings = parseInt(countResult.rows[0].count);

    res.status(200).json({
      bookings: enrichedBookings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalBookings / Number(limit)),
        totalBookings,
        hasNext: offset + Number(limit) < totalBookings,
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
// Obtenir les réservations par status
const getBookingsByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 10, userId, garageId } = req.query;

    if (!status) {
      return res.status(400).json({
        message: "Status requis",
      });
    }

    // Valider le status
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Status invalide. Utilisez: pending, confirmed, completed, cancelled",
      });
    }

    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = ["b.status = $1"];
    let queryParams: any[] = [status];
    let paramCount = 2;

    // Filtres optionnels
    if (userId) {
      whereConditions.push(`b.userId = $${paramCount}`);
      queryParams.push(Number(userId));
      paramCount++;
    }

    if (garageId) {
      whereConditions.push(`b.garageId = $${paramCount}`);
      queryParams.push(Number(garageId));
      paramCount++;
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // Requête avec JOIN local
    const query = `
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        c.mark as car_mark,
        c.model as car_model,
        c.matricule as car_matricule
      FROM booking b
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN cars c ON b.automobileId = c.id
      ${whereClause}
      ORDER BY b.reservedAt DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(Number(limit), offset);
    const result = await pool.query(query, queryParams);

    // Compter le total
    const countQuery = `SELECT COUNT(*) FROM booking b ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalBookings = parseInt(countResult.rows[0].count);

    res.status(200).json({
      message: `Réservations avec status: ${status}`,
      status: status,
      bookings: result.rows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalBookings / Number(limit)),
        totalBookings,
        hasNext: offset + Number(limit) < totalBookings,
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
// Obtenir les réservations d'un utilisateur
const getBookingsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!userId) {
      return res.status(400).json({
        message: "ID utilisateur requis",
      });
    }

    // Requête avec JOIN sur les tables locales
    const query = `
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        c.mark as car_mark,
        c.model as car_model,
        c.matricule as car_matricule,
        a.place as user_address,
        a.type as address_type
      FROM booking b
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN cars c ON b.automobileId = c.id
      LEFT JOIN address a ON u.id = a.user_id AND a.type = 'home'
      WHERE b.userId = $1
      ORDER BY b.reservedAt DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, Number(limit), offset]);

    // Enrichir avec les données des garages
    const enrichedBookings = await Promise.all(
      result.rows.map(async (booking) => {
        const garageData = await callGarageAPI(`/garages/${booking.garageid}`);
        const serviceData = await callGarageAPI(
          `/services/${booking.serviceid}`,
        );

        return {
          ...booking,
          garage: garageData?.garage,
          service: serviceData?.service || serviceData,
        };
      }),
    );

    res.status(200).json({
      message: "Réservations de l'utilisateur récupérées",
      userId: Number(userId),
      bookings: enrichedBookings,
      total: enrichedBookings.length,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Obtenir les réservations par garage (pour le server garage qui appelle)
const getBookingsByGarage = async (req: Request, res: Response) => {
  try {
    const { garageId } = req.params;
    const { date, status } = req.query;

    if (!garageId) {
      return res.status(400).json({
        message: "ID garage requis",
      });
    }

    let whereConditions = ["b.garageId = $1"];
    let queryParams: any[] = [Number(garageId)];
    let paramCount = 2;

    if (date) {
      whereConditions.push(`DATE(b.reservedAt) = $${paramCount}`);
      queryParams.push(date);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`b.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const query = `
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        c.mark as car_mark,
        c.model as car_model,
        c.matricule as car_matricule
      FROM booking b
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN cars c ON b.automobileId = c.id
      ${whereClause}
      ORDER BY b.reservedAt ASC
    `;

    const result = await pool.query(query, queryParams);

    res.status(200).json({
      message: "Réservations du garage récupérées",
      garageId: Number(garageId),
      bookings: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Mettre à jour une réservation
const updateBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reservedAt, status } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "ID de réservation requis",
      });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (reservedAt !== undefined) {
      updateFields.push(`reservedAt = $${paramCount}`);
      values.push(reservedAt);
      paramCount++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        message: "Aucun champ à mettre à jour",
      });
    }

    updateFields.push(`updatedAt = NOW()`);
    values.push(id);

    const query = `
      UPDATE booking 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Réservation non trouvée",
      });
    }

    res.status(200).json({
      message: "Réservation mise à jour avec succès",
      booking: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

// Supprimer une réservation
const deleteBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "ID de réservation requis",
      });
    }

    const query = `
      DELETE FROM booking 
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Réservation non trouvée",
      });
    }

    res.status(200).json({
      message: "Réservation supprimée avec succès",
      deletedBooking: result.rows[0],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: `Il y a eu une erreur : ${error.message}`,
    });
  }
};

export {
  addBooking,
  getAllBookings,
  getBookingsByUser,
  getBookingsByGarage,
  updateBooking,
  deleteBooking,
  getBookingsByStatus,
};
