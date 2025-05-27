/** @format */

import swaggerJsDoc from "swagger-jsdoc";
import { bookingPaths } from "./bookingPaths.js";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API de Gestion de Garages",
            version: "1.0.0",
            description:
                "API pour la gestion des garages, garagistes, catégories et recherche géolocalisée",
            contact: {
                name: "Support API",
                email: "hananedebouri2004@gmail.com",
            },
            license: {
                name: "HANANE DEBOURI",
                url: "",
            },
        },
        externalDocs: {
            description: "",
            url: ""
        },

        servers: [
            {
                url: "http://localhost:5000/api",
                description: "Serveur de développement",
            },
            {
                url: "",
                description: "Serveur de production",
            },
        ],

        tags: [
            {
                name: "Réservations",
                description: "🗓️ Opérations de gestion des réservations de base - création, modification, affichage et suppression des réservations",
                externalDocs: {
                    description: "Guide des réservations",
                    url: ""
                }
            },
            {
                name: "Statistiques des réservations",
                description: "📊 Rapports et statistiques complètes sur les réservations et les performances"
            },
            {
                name: "Recherche géographique",
                description: "🗺️ Recherche de garages par emplacement géographique et distance"
            },
            {
                name: "Gestion des utilisateurs",
                description: "👥 Gestion des réservations des utilisateurs et des différents garages"
            },
        ],

        // Intégration des paths depuis le fichier séparé
        paths: bookingPaths,

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Utiliser un token JWT pour l'authentification"
                },
                apiKey: {
                    type: "apiKey",
                    in: "header",
                    name: "X-API-Key",
                    description: "Clé API pour les applications externes"
                }
            },

            schemas: {
                // Modèles de base
                Booking: {
                    type: "object",
                    description: "Modèle de réservation de base",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1,
                            description: "Identifiant unique de la réservation"
                        },
                        garageId: {
                            type: "string",
                            example: "1",
                            description: "Identifiant du garage"
                        },
                        garageName: {
                            type: "string",
                            example: "Garage Al Amine",
                            description: "Nom du garage"
                        },
                        garageAddress: {
                            type: "string",
                            example: "Rue Rabat, Casablanca",
                            description: "Adresse du garage"
                        },
                        serviceId: {
                            type: "string",
                            example: "5",
                            description: "Identifiant du service demandé"
                        },
                        automobileId: {
                            type: "integer",
                            example: 1,
                            description: "Identifiant du véhicule"
                        },
                        userId: {
                            type: "integer",
                            example: 123,
                            description: "Identifiant de l'utilisateur propriétaire de la réservation"
                        },
                        reservedAt: {
                            type: "string",
                            format: "date-time",
                            example: "2025-05-28T10:00:00Z",
                            description: "Date et heure de la réservation au format ISO 8601"
                        },
                        status: {
                            type: "string",
                            enum: ["pending", "confirmed", "completed", "cancelled"],
                            example: "pending",
                            description: "État actuel de la réservation"
                        },
                        notes: {
                            type: "string",
                            example: "Changement d'huile et vérification des freins",
                            description: "Notes supplémentaires sur la réservation"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Date de création de la réservation"
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Date de dernière mise à jour de la réservation"
                        },
                    },
                    required: ["garageId", "serviceId", "automobileId", "reservedAt"],
                    example: {
                        id: 1,
                        garageId: "1",
                        garageName: "Garage Al Amine",
                        garageAddress: "Rue Rabat, Casablanca",
                        serviceId: "5",
                        automobileId: 1,
                        userId: 123,
                        reservedAt: "2025-05-28T10:00:00Z",
                        status: "pending",
                        notes: "Changement d'huile et vérification des freins",
                        createdAt: "2025-05-27T14:30:00Z",
                        updatedAt: "2025-05-27T14:30:00Z"
                    }
                },

                // Modèle de réservation avec détails complets
                BookingDetails: {
                    allOf: [
                        { $ref: "#/components/schemas/Booking" },
                        {
                            type: "object",
                            properties: {
                                // Données utilisateur
                                user_name: {
                                    type: "string",
                                    example: "Ahmed Mohamed",
                                    description: "Nom de l'utilisateur propriétaire de la réservation"
                                },
                                user_email: {
                                    type: "string",
                                    example: "ahmed@example.com",
                                    description: "Email de l'utilisateur"
                                },
                                user_phone: {
                                    type: "string",
                                    example: "+212612345678",
                                    description: "Numéro de téléphone de l'utilisateur"
                                },
                                user_address: {
                                    type: "string",
                                    example: "Rabat, Maroc",
                                    description: "Adresse de l'utilisateur"
                                },

                                // Données du véhicule
                                car_mark: {
                                    type: "string",
                                    example: "Toyota",
                                    description: "Marque du véhicule"
                                },
                                car_model: {
                                    type: "string",
                                    example: "Camry",
                                    description: "Modèle du véhicule"
                                },
                                car_matricule: {
                                    type: "string",
                                    example: "12345-B-67",
                                    description: "Numéro d'immatriculation du véhicule"
                                },
                                car_year: {
                                    type: "integer",
                                    example: 2020,
                                    description: "Année de fabrication du véhicule"
                                },

                                // Détails du garage (depuis API externe)
                                garage_details: {
                                    type: "object",
                                    description: "Détails du garage depuis l'API externe",
                                    properties: {
                                        name: { type: "string", example: "Garage Al Amine" },
                                        address: { type: "string", example: "Rue Rabat" },
                                        phone: { type: "string", example: "+212612345678" },
                                        rating: { type: "number", example: 4.5 },
                                        working_hours: { type: "string", example: "08:00-18:00" },
                                        specialties: {
                                            type: "array",
                                            items: { type: "string" },
                                            example: ["Changement d'huile", "Vérification des freins"]
                                        }
                                    }
                                },

                                // Détails du service (depuis API externe)
                                service_details: {
                                    type: "object",
                                    description: "Détails du service depuis l'API externe",
                                    properties: {
                                        name: { type: "string", example: "Changement d'huile" },
                                        description: { type: "string", example: "Changement d'huile moteur et filtre" },
                                        price: { type: "number", example: 200 },
                                        duration: { type: "integer", example: 60 },
                                        requirements: {
                                            type: "array",
                                            items: { type: "string" },
                                            example: ["Huile moteur", "Filtre à huile"]
                                        }
                                    }
                                },

                                // Informations supplémentaires
                                external_data_available: {
                                    type: "boolean",
                                    example: true,
                                    description: "Données supplémentaires disponibles depuis les APIs externes"
                                },
                                booking_reference: {
                                    type: "string",
                                    example: "BK-2025-001",
                                    description: "Référence unique de la réservation"
                                },
                                estimated_completion: {
                                    type: "string",
                                    format: "date-time",
                                    example: "2025-05-28T11:00:00Z",
                                    description: "Temps estimé pour la fin du service"
                                }
                            }
                        }
                    ]
                },

                // Modèle de demande de création de réservation
                CreateBookingRequest: {
                    type: "object",
                    description: "Données requises pour créer une nouvelle réservation",
                    properties: {
                        garageId: {
                            type: "string",
                            example: "1",
                            description: "Identifiant du garage (requis)"
                        },
                        garageAddress: {
                            type: "string",
                            example: "Rue Rabat, Casablanca",
                            description: "Adresse du garage (optionnel - sera récupéré automatiquement si non fourni)"
                        },
                        garageName: {
                            type: "string",
                            example: "Garage Al Amine",
                            description: "Nom du garage (optionnel - sera récupéré automatiquement si non fourni)"
                        },
                        serviceId: {
                            type: "string",
                            example: "5",
                            description: "Identifiant du service demandé (requis)"
                        },
                        automobileId: {
                            type: "integer",
                            example: 1,
                            description: "Identifiant du véhicule (requis)"
                        },
                        reservedAt: {
                            type: "string",
                            format: "date-time",
                            example: "2025-05-28T10:00:00Z",
                            description: "Date et heure de réservation demandées (requis)"
                        },
                        notes: {
                            type: "string",
                            example: "Changement d'huile et vérification des freins",
                            description: "Notes supplémentaires concernant la réservation (optionnel)"
                        },
                        priority: {
                            type: "string",
                            enum: ["normal", "urgent", "emergency"],
                            default: "normal",
                            example: "normal",
                            description: "Priorité de la réservation"
                        }
                    },
                    required: ["garageId", "serviceId", "automobileId", "reservedAt"],
                    example: {
                        garageId: "1",
                        garageAddress: "Rue Rabat, Casablanca",
                        garageName: "Garage Al Amine",
                        serviceId: "5",
                        automobileId: 1,
                        reservedAt: "2025-05-28T10:00:00Z",
                        notes: "Changement d'huile et vérification des freins",
                        priority: "normal"
                    }
                },

                // Modèle de mise à jour de réservation
                UpdateBookingRequest: {
                    type: "object",
                    description: "Données pouvant être mises à jour dans la réservation",
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
                            description: "Nouveau statut de la réservation"
                        },
                        notes: {
                            type: "string",
                            example: "Rendez-vous confirmé, merci d'arriver à l'heure",
                            description: "Notes mises à jour"
                        },
                        garageAddress: {
                            type: "string",
                            example: "Nouvelle Rue Rabat, Casablanca",
                            description: "Adresse mise à jour du garage"
                        },
                        garageName: {
                            type: "string",
                            example: "Garage Al Amine Mis à Jour",
                            description: "Nom mis à jour du garage"
                        },
                        priority: {
                            type: "string",
                            enum: ["normal", "urgent", "emergency"],
                            example: "urgent",
                            description: "Priorité mise à jour de la réservation"
                        },
                        completion_notes: {
                            type: "string",
                            example: "Maintenance terminée avec succès, pas de problèmes supplémentaires",
                            description: "Notes de complétion (lors du changement de statut à completed)"
                        }
                    },
                    example: {
                        status: "confirmed",
                        notes: "Rendez-vous confirmé, merci d'arriver à l'heure",
                        reservedAt: "2025-05-28T11:00:00Z",
                        priority: "normal"
                    }
                },

                // Modèle de statistiques
                BookingStats: {
                    type: "object",
                    description: "Statistiques globales sur les réservations",
                    properties: {
                        overview: {
                            type: "object",
                            description: "Vue d'ensemble des statistiques",
                            properties: {
                                total_bookings: { type: "string", example: "150", description: "Total des réservations" },
                                pending_bookings: { type: "string", example: "25", description: "Réservations en attente" },
                                confirmed_bookings: { type: "string", example: "80", description: "Réservations confirmées" },
                                completed_bookings: { type: "string", example: "35", description: "Réservations terminées" },
                                cancelled_bookings: { type: "string", example: "10", description: "Réservations annulées" },
                                today_bookings: { type: "string", example: "5", description: "Réservations du jour" },
                                this_week_bookings: { type: "string", example: "30", description: "Réservations de la semaine" },
                                this_month_bookings: { type: "string", example: "120", description: "Réservations du mois" },
                                revenue_total: { type: "number", example: 25000, description: "Revenu total" },
                                average_rating: { type: "number", example: 4.3, description: "Note moyenne" }
                            }
                        },
                        daily_breakdown: {
                            type: "array",
                            description: "Détail quotidien des réservations",
                            items: {
                                type: "object",
                                properties: {
                                    booking_date: { type: "string", format: "date-time", description: "Date de réservation" },
                                    bookings_count: { type: "string", example: "8", description: "Nombre de réservations" },
                                    status: { type: "string", example: "pending", description: "Statut des réservations" },
                                    revenue: { type: "number", example: 1200, description: "Revenu journalier" }
                                }
                            }
                        },
                        monthly_trends: {
                            type: "array",
                            description: "Tendances mensuelles",
                            items: {
                                type: "object",
                                properties: {
                                    month: { type: "string", example: "2025-05", description: "Mois" },
                                    total_bookings: { type: "integer", example: 120 },
                                    growth_rate: { type: "number", example: 15.5, description: "Taux de croissance %" }
                                }
                            }
                        },
                        filters_applied: {
                            type: "object",
                            description: "Filtres appliqués aux statistiques",
                            properties: {
                                userId: { type: "string", nullable: true, description: "ID utilisateur filtré" },
                                garageId: { type: "string", nullable: true, description: "ID garage filtré" },
                                dateFrom: { type: "string", format: "date", nullable: true },
                                dateTo: { type: "string", format: "date", nullable: true }
                            }
                        }
                    },
                    example: {
                        overview: {
                            total_bookings: "150",
                            pending_bookings: "25",
                            confirmed_bookings: "80",
                            completed_bookings: "35",
                            cancelled_bookings: "10",
                            today_bookings: "5",
                            this_week_bookings: "30",
                            this_month_bookings: "120",
                            revenue_total: 25000,
                            average_rating: 4.3
                        },
                        daily_breakdown: [
                            {
                                booking_date: "2025-05-27T00:00:00Z",
                                bookings_count: "8",
                                status: "pending",
                                revenue: 1200
                            }
                        ],
                        monthly_trends: [
                            {
                                month: "2025-05",
                                total_bookings: 120,
                                growth_rate: 15.5
                            }
                        ],
                        filters_applied: {
                            userId: null,
                            garageId: "1",
                            dateFrom: null,
                            dateTo: null
                        }
                    }
                },

                // Modèles de réponse
                SuccessResponse: {
                    type: "object",
                    description: "Modèle de réponse réussie",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string", example: "Opération réussie" },
                        data: {
                            type: "object",
                            description: "Données retournées (varie selon le type de requête)"
                        },
                        timestamp: {
                            type: "string",
                            format: "date-time",
                            example: "2025-05-27T14:30:00Z",
                            description: "Heure de la réponse"
                        },
                        request_id: {
                            type: "string",
                            example: "req_123456789",
                            description: "ID de la requête pour le suivi"
                        }
                    },
                    required: ["success", "message"]
                },

                // Modèle de réponse d'erreur
                ErrorResponse: {
                    type: "object",
                    description: "Modèle de réponse d'erreur",
                    properties: {
                        success: { type: "boolean", example: false },
                        message: {
                            type: "string",
                            example: "Une erreur est survenue dans le système",
                            description: "Message d'erreur en français"
                        },
                        error: {
                            type: "string",
                            example: "Détails techniques de l'erreur",
                            description: "Détails techniques supplémentaires pour les développeurs"
                        },
                        error_code: {
                            type: "string",
                            example: "BOOKING_001",
                            description: "Code d'erreur pour référence"
                        },
                        timestamp: {
                            type: "string",
                            format: "date-time",
                            example: "2025-05-27T14:30:00Z"
                        },
                        request_id: {
                            type: "string",
                            example: "req_123456789",
                            description: "ID de la requête pour le suivi"
                        },
                        help_url: {
                            type: "string",
                            example: "",
                            description: "URL d'aide pour résoudre l'erreur"
                        }
                    },
                    required: ["success", "message"]
                },

                // Modèle de pagination et filtrage
                PaginatedBookingsResponse: {
                    type: "object",
                    description: "Réponse des réservations avec pagination",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string", example: "Réservations récupérées avec succès" },
                        data: {
                            type: "object",
                            properties: {
                                bookings: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/BookingDetails" },
                                    description: "Liste des réservations"
                                },
                                pagination: {
                                    type: "object",
                                    description: "Informations de pagination",
                                    properties: {
                                        total: {
                                            type: "integer",
                                            example: 150,
                                            description: "Nombre total de réservations"
                                        },
                                        page: {
                                            type: "integer",
                                            example: 1,
                                            description: "Page actuelle"
                                        },
                                        limit: {
                                            type: "integer",
                                            example: 20,
                                            description: "Nombre de résultats par page"
                                        },
                                        totalPages: {
                                            type: "integer",
                                            example: 8,
                                            description: "Nombre total de pages"
                                        },
                                        hasNext: {
                                            type: "boolean",
                                            example: true,
                                            description: "Existe-t-il une page suivante"
                                        },
                                        hasPrev: {
                                            type: "boolean",
                                            example: false,
                                            description: "Existe-t-il une page précédente"
                                        },
                                        nextPage: {
                                            type: "integer",
                                            example: 2,
                                            nullable: true,
                                            description: "Numéro de la page suivante"
                                        },
                                        prevPage: {
                                            type: "integer",
                                            nullable: true,
                                            description: "Numéro de la page précédente"
                                        }
                                    }
                                },
                                filters: {
                                    type: "object",
                                    description: "Filtres appliqués",
                                    properties: {
                                        status: { type: "string", nullable: true },
                                        userId: { type: "string", nullable: true },
                                        garageId: { type: "string", nullable: true },
                                        serviceId: { type: "string", nullable: true },
                                        search: { type: "string", nullable: true },
                                        dateFrom: { type: "string", format: "date", nullable: true },
                                        dateTo: { type: "string", format: "date", nullable: true }
                                    }
                                }
                            }
                        },
                        timestamp: { type: "string", format: "date-time" },
                        request_id: { type: "string" }
                    }
                },

                // Modèles de recherche géographique
                GarageLocation: {
                    type: "object",
                    description: "Emplacement du garage",
                    properties: {
                        id: { type: "string", example: "1", description: "Identifiant du garage" },
                        name: { type: "string", example: "Garage Al Amine", description: "Nom du garage" },
                        address: { type: "string", example: "Rue Rabat", description: "Adresse du garage" },
                        location: {
                            type: "object",
                            properties: {
                                lat: { type: "number", format: "double", example: 33.5731 },
                                lng: { type: "number", format: "double", example: -7.5898 }
                            }
                        },
                        distance: {
                            type: "number",
                            format: "double",
                            example: 2.5,
                            description: "Distance en kilomètres"
                        },
                        rating: {
                            type: "number",
                            example: 4.5,
                            description: "Note du garage"
                        },
                        available_services: {
                            type: "array",
                            items: { type: "string" },
                            example: ["Changement d'huile", "Vérification des freins"],
                            description: "Services disponibles"
                        },
                        working_hours: {
                            type: "object",
                            properties: {
                                open: { type: "string", example: "08:00" },
                                close: { type: "string", example: "18:00" },
                                is_open_now: { type: "boolean", example: true }
                            }
                        },
                        contact: {
                            type: "object",
                            properties: {
                                phone: { type: "string", example: "+212612345678" },
                                email: { type: "string", example: "garage@example.com" }
                            }
                        }
                    }
                },

                // Modèle d'erreurs de validation
                ValidationError: {
                    type: "object",
                    description: "Erreurs de validation des données",
                    properties: {
                        success: { type: "boolean", example: false },
                        message: { type: "string", example: "Les données envoyées sont invalides" },
                        errors: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    field: { type: "string", example: "reservedAt" },
                                    message: { type: "string", example: "La date de réservation est requise" },
                                    code: { type: "string", example: "REQUIRED_FIELD" }
                                }
                            }
                        },
                        timestamp: { type: "string", format: "date-time" }
                    }
                }
            },

            responses: {
                // Réponses de succès
                BookingCreated: {
                    description: "✅ Réservation créée avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/SuccessResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/BookingDetails" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                BookingsRetrieved: {
                    description: "✅ Réservations récupérées avec succès",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/PaginatedBookingsResponse" }
                        }
                    }
                },

                BookingRetrieved: {
                    description: "✅ Réservation récupérée avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/SuccessResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/BookingDetails" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                BookingUpdated: {
                    description: "✅ Réservation mise à jour avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/SuccessResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/BookingDetails" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                BookingDeleted: {
                    description: "✅ Réservation supprimée avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/SuccessResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            data: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "integer" },
                                                    deletedAt: { type: "string", format: "date-time" }
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                StatsRetrieved: {
                    description: "✅ Statistiques récupérées avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/SuccessResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/BookingStats" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                GaragesFound: {
                    description: "✅ Garages trouvés",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/SuccessResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            data: {
                                                type: "object",
                                                properties: {
                                                    garages: {
                                                        type: "array",
                                                        items: { $ref: "#/components/schemas/GarageLocation" }
                                                    },
                                                    total_found: { type: "integer" },
                                                    search_params: { type: "object" }
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                // Réponses d'erreur
                NotFound: {
                    description: "❌ Élément non trouvé",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/ErrorResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            message: { example: "Réservation non trouvée" },
                                            error_code: { example: "BOOKING_NOT_FOUND" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                BadRequest: {
                    description: "❌ Requête invalide",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ValidationError" }
                        }
                    }
                },

                Conflict: {
                    description: "⚠️ Conflit de données",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/ErrorResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            message: { example: "Ce créneau est déjà réservé pour ce véhicule dans ce garage" },
                                            error_code: { example: "BOOKING_CONFLICT" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                ServerError: {
                    description: "💥 Erreur serveur",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/ErrorResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            message: { example: "Une erreur inattendue s'est produite sur le serveur" },
                                            error_code: { example: "INTERNAL_SERVER_ERROR" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                Unauthorized: {
                    description: "🔒 Accès non autorisé",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/ErrorResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            message: { example: "Vous devez être connecté" },
                                            error_code: { example: "UNAUTHORIZED" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                Forbidden: {
                    description: "🚫 Accès interdit",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/ErrorResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            message: { example: "Vous n'avez pas les droits d'accès à cette ressource" },
                                            error_code: { example: "FORBIDDEN" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },

                RateLimitExceeded: {
                    description: "⏱️ Limite de requêtes dépassée",
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    { $ref: "#/components/schemas/ErrorResponse" },
                                    {
                                        type: "object",
                                        properties: {
                                            message: { example: "Limite de requêtes dépassée, veuillez réessayer plus tard" },
                                            error_code: { example: "RATE_LIMIT_EXCEEDED" },
                                            retry_after: { type: "integer", example: 60, description: "Secondes avant de pouvoir réessayer" }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            parameters: {
                // Paramètres de chemin
                BookingId: {
                    name: "id",
                    in: "path",
                    required: true,
                    description: "Identifiant unique de la réservation",
                    schema: {
                        type: "integer",
                        minimum: 1,
                        example: 1
                    },
                    example: 1
                },

                UserId: {
                    name: "userId",
                    in: "path",
                    required: true,
                    description: "Identifiant de l'utilisateur",
                    schema: {
                        type: "string",
                        pattern: "^[0-9]+$",
                        example: "123"
                    }
                },

                GarageId: {
                    name: "garageId",
                    in: "path",
                    required: true,
                    description: "Identifiant du garage",
                    schema: {
                        type: "string",
                        pattern: "^[0-9]+$",
                        example: "1"
                    }
                },

                // Paramètres de requête pour la pagination
                PageNumber: {
                    name: "page",
                    in: "query",
                    description: "Numéro de page demandé",
                    schema: {
                        type: "integer",
                        minimum: 1,
                        default: 1,
                        example: 1
                    }
                },

                PageLimit: {
                    name: "limit",
                    in: "query",
                    description: "Nombre de résultats par page",
                    schema: {
                        type: "integer",
                        minimum: 1,
                        maximum: 100,
                        default: 20,
                        example: 20
                    }
                },

                // Paramètres de filtrage
                StatusFilter: {
                    name: "status",
                    in: "query",
                    description: "Filtrer par statut de réservation",
                    schema: {
                        type: "string",
                        enum: ["pending", "confirmed", "completed", "cancelled"],
                        example: "pending"
                    }
                },

                SearchQuery: {
                    name: "search",
                    in: "query",
                    description: "Rechercher dans le nom du garage, l'utilisateur ou la voiture",
                    schema: {
                        type: "string",
                        minLength: 2,
                        maxLength: 100,
                        example: "Toyota"
                    }
                },

                DateFilter: {
                    name: "date",
                    in: "query",
                    description: "Filtrer par date (YYYY-MM-DD)",
                    schema: {
                        type: "string",
                        format: "date",
                        example: "2025-05-28"
                    }
                },

                DateFromFilter: {
                    name: "dateFrom",
                    in: "query",
                    description: "Date de début du filtre",
                    schema: {
                        type: "string",
                        format: "date",
                        example: "2025-05-01"
                    }
                },

                DateToFilter: {
                    name: "dateTo",
                    in: "query",
                    description: "Date de fin du filtre",
                    schema: {
                        type: "string",
                        format: "date",
                        example: "2025-05-31"
                    }
                },

                UpcomingFilter: {
                    name: "upcoming",
                    in: "query",
                    description: "Afficher uniquement les réservations à venir",
                    schema: {
                        type: "boolean",
                        default: false,
                        example: true
                    }
                },

                // Paramètres de recherche géographique
                Latitude: {
                    name: "lat",
                    in: "query",
                    required: true,
                    description: "Latitude",
                    schema: {
                        type: "number",
                        format: "double",
                        minimum: -90,
                        maximum: 90,
                        example: 33.5731
                    }
                },

                Longitude: {
                    name: "lng",
                    in: "query",
                    required: true,
                    description: "Longitude",
                    schema: {
                        type: "number",
                        format: "double",
                        minimum: -180,
                        maximum: 180,
                        example: -7.5898
                    }
                },

                SearchRadius: {
                    name: "radius",
                    in: "query",
                    description: "Rayon de recherche en kilomètres",
                    schema: {
                        type: "number",
                        minimum: 0.1,
                        maximum: 100,
                        default: 10,
                        example: 10
                    }
                },

                ResultLimit: {
                    name: "limit",
                    in: "query",
                    description: "Nombre de résultats demandés",
                    schema: {
                        type: "integer",
                        minimum: 1,
                        maximum: 50,
                        default: 10,
                        example: 10
                    }
                },

                // Paramètres des limites géographiques
                NorthBound: {
                    name: "north",
                    in: "query",
                    required: true,
                    description: "Limite nord de la zone",
                    schema: {
                        type: "number",
                        format: "double",
                        example: 33.6
                    }
                },

                SouthBound: {
                    name: "south",
                    in: "query",
                    required: true,
                    description: "Limite sud de la zone",
                    schema: {
                        type: "number",
                        format: "double",
                        example: 33.5
                    }
                },

                EastBound: {
                    name: "east",
                    in: "query",
                    required: true,
                    description: "Limite est de la zone",
                    schema: {
                        type: "number",
                        format: "double",
                        example: -7.5
                    }
                },

                WestBound: {
                    name: "west",
                    in: "query",
                    required: true,
                    description: "Limite ouest de la zone",
                    schema: {
                        type: "number",
                        format: "double",
                        example: -7.6
                    }
                }
            },

            examples: {
                // Exemples de demandes de réservation
                BasicBookingRequest: {
                    summary: "Réservation basique",
                    description: "Exemple de réservation avec les données minimales requises",
                    value: {
                        garageId: "1",
                        serviceId: "5",
                        automobileId: 1,
                        reservedAt: "2025-05-28T10:00:00Z"
                    }
                },

                FullBookingRequest: {
                    summary: "Réservation complète",
                    description: "Exemple de réservation avec toutes les données optionnelles",
                    value: {
                        garageId: "1",
                        garageAddress: "Rue Rabat, Casablanca",
                        garageName: "Garage Al Amine",
                        serviceId: "5",
                        automobileId: 1,
                        reservedAt: "2025-05-28T10:00:00Z",
                        notes: "Changement d'huile et vérification des freins. Veuillez utiliser une huile de haute qualité.",
                        priority: "normal"
                    }
                },

                UrgentBookingRequest: {
                    summary: "Réservation urgente",
                    description: "Exemple de réservation urgente",
                    value: {
                        garageId: "1",
                        serviceId: "15",
                        automobileId: 1,
                        reservedAt: "2025-05-27T16:00:00Z",
                        notes: "Réparation urgente - Véhicule en panne",
                        priority: "emergency"
                    }
                },

                // Exemples de mise à jour de réservation
                ConfirmBooking: {
                    summary: "Confirmation de réservation",
                    description: "Exemple de confirmation de réservation",
                    value: {
                        status: "confirmed",
                        notes: "Rendez-vous confirmé. Veuillez vous présenter 15 minutes avant l'heure prévue."
                    }
                },

                RescheduleBooking: {
                    summary: "Report de rendez-vous",
                    description: "Exemple de report de rendez-vous",
                    value: {
                        reservedAt: "2025-05-29T14:00:00Z",
                        notes: "Rendez-vous reporté à la demande du client",
                        status: "confirmed"
                    }
                },

                CompleteBooking: {
                    summary: "Service terminé",
                    description: "Exemple de service terminé",
                    value: {
                        status: "completed",
                        completion_notes: "Maintenance effectuée avec succès. Changement d'huile et du filtre effectué. Pas de problèmes supplémentaires.",
                        notes: "Service terminé - Véhicule prêt à être récupéré"
                    }
                },

                CancelBooking: {
                    summary: "Annulation de réservation",
                    description: "Exemple d'annulation de réservation",
                    value: {
                        status: "cancelled",
                        notes: "Annulation effectuée à la demande du client"
                    }
                }
            }
        },

        // Paramètres supplémentaires
        security: [
            { bearerAuth: [] },
            { apiKey: [] }
        ]
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

// Export des paramètres supplémentaires
export const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: "list",
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        tagsSorter: "alpha",
        operationsSorter: "alpha"
    },
    customCss: `
   .swagger-ui .topbar { display: none; }
   .swagger-ui .info .title { color: #2c5aa0; }
   .swagger-ui .scheme-container { background: #f7f7f7; }
   .swagger-ui .opblock.opblock-post { border-color: #49cc90; }
   .swagger-ui .opblock.opblock-get { border-color: #61affe; }
   .swagger-ui .opblock.opblock-put { border-color: #fca130; }
   .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; }
 `,
    customSiteTitle: "Documentation API Système de Réservation - Rilygo"
};