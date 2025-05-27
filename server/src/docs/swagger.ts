/** @format */

import swaggerJsDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Gestion des Réservations",
      version: "1.0.0",
      description:
        "API complète pour la gestion des réservations de garages et services avec support de recherche géographique et statistiques",
      contact: {
        name: "Équipe Support Technique",
        email: "support@rilygo.com",
      },
      license: {
        name: "MIT",
        url: "",
      },
    },
    servers: [
      {
        url: "http://localhost:500/api",
        description: "Serveur de développement local",
      },
      {
        url: "",
        description: "Serveur de production",
      },
    ],
    tags: [
      {
        name: "Réservations",
        description: "Opérations de gestion des réservations de base",
      },
      {
        name: "Statistiques des réservations",
        description: "Rapports et statistiques des réservations",
      },
      {
        name: "Recherche géographique",
        description: "Recherche de garages par emplacement",
      },
      {
        name: "Gestion des utilisateurs",
        description: "Réservations des utilisateurs et garages",
      },
    ],
    components: {
      schemas: {
        Booking: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            garageId: { type: "string", example: "1" },
            garageName: {
              type: "string",
              example: "Garage Al Amine"
            },
            garageAddress: {
              type: "string",
              example: "Rue Rabat, Casablanca"
            },
            serviceId: { type: "string", example: "5" },
            automobileId: { type: "integer", example: 1 },
            userId: { type: "integer", example: 123 },
            reservedAt: {
              type: "string",
              format: "date-time",
              example: "2025-05-28T10:00:00Z"
            },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "completed", "cancelled"],
              example: "pending"
            },
            notes: {
              type: "string",
              example: "Changement d'huile et vérification des freins"
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["garageId", "serviceId", "automobileId", "reservedAt"],
        },

        BookingDetails: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            garageId: { type: "string", example: "1" },
            garageName: { type: "string", example: "Garage Al Amine" },
            garageAddress: { type: "string", example: "Rue Rabat, Casablanca" },
            serviceId: { type: "string", example: "5" },
            automobileId: { type: "integer", example: 1 },
            userId: { type: "integer", example: 123 },
            reservedAt: { type: "string", format: "date-time" },
            status: { type: "string", example: "pending" },
            notes: { type: "string", example: "Changement d'huile" },
            user_name: { type: "string", example: "Ahmed Mohamed" },
            user_email: { type: "string", example: "ahmed@example.com" },
            user_phone: { type: "string", example: "+212612345678" },
            user_address: { type: "string", example: "Rabat, Maroc" },
            car_mark: { type: "string", example: "Toyota" },
            car_model: { type: "string", example: "Camry" },
            car_matricule: { type: "string", example: "12345-B-67" },
            car_year: { type: "integer", example: 2020 },
            garage_details: {
              type: "object",
              properties: {
                name: { type: "string", example: "Garage Al Amine" },
                address: { type: "string", example: "Rue Rabat" },
                phone: { type: "string", example: "+212612345678" },
                rating: { type: "number", example: 4.5 }
              }
            },
            service_details: {
              type: "object",
              properties: {
                name: { type: "string", example: "Changement d'huile" },
                price: { type: "number", example: 200 },
                duration: { type: "integer", example: 60 }
              }
            },
            external_data_available: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        CreateBookingRequest: {
          type: "object",
          properties: {
            garageId: {
              type: "string",
              example: "1",
              description: "ID du garage (requis)"
            },
            garageAddress: {
              type: "string",
              example: "Rue Rabat, Casablanca",
              description: "Adresse du garage (optionnel)"
            },
            garageName: {
              type: "string",
              example: "Garage Al Amine",
              description: "Nom du garage (optionnel)"
            },
            serviceId: {
              type: "string",
              example: "5",
              description: "ID du service (requis)"
            },
            automobileId: {
              type: "integer",
              example: 1,
              description: "ID du véhicule (requis)"
            },
            reservedAt: {
              type: "string",
              format: "date-time",
              example: "2025-05-28T10:00:00Z",
              description: "Date et heure de réservation (requis)"
            },
            notes: {
              type: "string",
              example: "Changement d'huile et vérification des freins",
              description: "Notes supplémentaires (optionnel)"
            },
          },
          required: ["garageId", "serviceId", "automobileId", "reservedAt"],
        },

        UpdateBookingRequest: {
          type: "object",
          properties: {
            reservedAt: {
              type: "string",
              format: "date-time",
              example: "2025-05-28T11:00:00Z",
              description: "Nouvelle date et heure de réservation"
            },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "completed", "cancelled"],
              example: "confirmed",
              description: "Nouveau statut de réservation"
            },
            notes: {
              type: "string",
              example: "Rendez-vous confirmé",
              description: "Notes mises à jour"
            },
            garageAddress: {
              type: "string",
              example: "Nouvelle Rue Rabat",
              description: "Adresse du garage mise à jour"
            },
            garageName: {
              type: "string",
              example: "Garage Al Amine Mise à jour",
              description: "Nom du garage mis à jour"
            },
          },
        },

        BookingStats: {
          type: "object",
          properties: {
            overview: {
              type: "object",
              properties: {
                total_bookings: { type: "string", example: "150" },
                pending_bookings: { type: "string", example: "25" },
                confirmed_bookings: { type: "string", example: "80" },
                completed_bookings: { type: "string", example: "35" },
                cancelled_bookings: { type: "string", example: "10" },
                today_bookings: { type: "string", example: "5" },
                this_week_bookings: { type: "string", example: "30" },
                this_month_bookings: { type: "string", example: "120" },
              }
            },
            daily_breakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  booking_date: { type: "string", format: "date-time" },
                  bookings_count: { type: "string", example: "8" },
                  status: { type: "string", example: "pending" },
                }
              }
            },
            filters_applied: {
              type: "object",
              properties: {
                userId: { type: "string", nullable: true },
                garageId: { type: "string", nullable: true },
              }
            }
          },
        },

        NearbyGaragesRequest: {
          type: "object",
          properties: {
            lat: {
              type: "number",
              format: "double",
              example: 33.5731,
              description: "Latitude (requis)"
            },
            lng: {
              type: "number",
              format: "double",
              example: -7.5898,
              description: "Longitude (requis)"
            },
            radius: {
              type: "number",
              example: 10,
              description: "Rayon en kilomètres (par défaut: 10)"
            },
          },
          required: ["lat", "lng"],
        },

        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Opération réussie" },
            data: { type: "object" },
          },
        },

        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Une erreur est survenue" },
            error: { type: "string", example: "Détails techniques de l'erreur" },
          },
        },

        PaginatedBookingsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Réservations récupérées avec succès" },
            data: {
              type: "object",
              properties: {
                bookings: {
                  type: "array",
                  items: { $ref: "#/components/schemas/BookingDetails" }
                },
                pagination: {
                  type: "object",
                  properties: {
                    total: { type: "integer", example: 150 },
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 20 },
                    totalPages: { type: "integer", example: 8 },
                    hasNext: { type: "boolean", example: true },
                    hasPrev: { type: "boolean", example: false },
                  }
                }
              }
            }
          }
        },
      },

      responses: {
        NotFound: {
          description: "Élément non trouvé",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string", example: "Élément non trouvé" },
                },
              },
            },
          },
        },
        BadRequest: {
          description: "Requête invalide",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string", example: "Données envoyées invalides" },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Erreur serveur",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Conflict: {
          description: "Conflit de données",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string", example: "Ce créneau est déjà réservé" },
                },
              },
            },
          },
        },
      },

      parameters: {
        BookingId: {
          name: "id",
          in: "path",
          required: true,
          description: "Identifiant de la réservation",
          schema: { type: "integer", example: 1 }
        },
        UserId: {
          name: "userId",
          in: "path",
          required: true,
          description: "Identifiant de l'utilisateur",
          schema: { type: "string", example: "123" }
        },
        GarageId: {
          name: "garageId",
          in: "path",
          required: true,
          description: "Identifiant du garage",
          schema: { type: "string", example: "1" }
        },
        PageNumber: {
          name: "page",
          in: "query",
          description: "Numéro de page",
          schema: { type: "integer", minimum: 1, default: 1 }
        },
        PageLimit: {
          name: "limit",
          in: "query",
          description: "Nombre de résultats par page",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
        },
        StatusFilter: {
          name: "status",
          in: "query",
          description: "Filtrage par statut de réservation",
          schema: {
            type: "string",
            enum: ["pending", "confirmed", "completed", "cancelled"]
          }
        },
        SearchQuery: {
          name: "search",
          in: "query",
          description: "Recherche dans le nom du garage, l'utilisateur ou le véhicule",
          schema: { type: "string" }
        },
      }
    },
  },
  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts",
    "./src/docs/*.ts",
    "./routes/*.ts",
    "./controllers/*.ts",
    "./docs/*.ts",
  ],
};

export const specs = swaggerJsDoc(options);