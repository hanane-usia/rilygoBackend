/** @format */



export const bookingPaths = {
    "/bookings": {
        post: {
            tags: ["Réservations"],
            summary: "Créer une nouvelle réservation",
            description: "Créer une nouvelle réservation dans le système avec validation des données",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateBookingRequest" },
                        examples: {
                            basicBooking: {
                                summary: "Réservation basique",
                                value: {
                                    garageId: "1",
                                    serviceId: "5",
                                    automobileId: 1,
                                    reservedAt: "2025-05-28T10:00:00Z"
                                }
                            },
                            fullBooking: {
                                summary: "Réservation complète",
                                value: {
                                    garageId: "1",
                                    garageAddress: "Rue Rabat, Casablanca",
                                    garageName: "Garage Al-Amin",
                                    serviceId: "5",
                                    automobileId: 1,
                                    reservedAt: "2025-05-28T10:00:00Z",
                                    notes: "Changement d'huile et vérification des freins"
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                201: {
                    description: "Réservation créée avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Réservation créée avec succès" },
                                    data: { $ref: "#/components/schemas/BookingDetails" }
                                }
                            }
                        }
                    }
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/ServerError" }
            }
        },
        get: {
            tags: ["Réservations"],
            summary: "Obtenir toutes les réservations",
            description: "Récupérer la liste des réservations avec possibilité de filtrage et de pagination",
            parameters: [
                { $ref: "#/components/parameters/PageNumber" },
                { $ref: "#/components/parameters/PageLimit" },
                { $ref: "#/components/parameters/StatusFilter" },
                { $ref: "#/components/parameters/SearchQuery" },
                {
                    name: "userId",
                    in: "query",
                    description: "Filtrer par ID utilisateur",
                    schema: { type: "string" }
                },
                {
                    name: "garageId",
                    in: "query",
                    description: "Filtrer par ID garage",
                    schema: { type: "string" }
                },
                {
                    name: "serviceId",
                    in: "query",
                    description: "Filtrer par ID service",
                    schema: { type: "string" }
                }
            ],
            responses: {
                200: {
                    description: "Réservations récupérées avec succès",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/PaginatedBookingsResponse" }
                        }
                    }
                },
                500: { $ref: "#/components/responses/ServerError" }
            }
        }
    },

    "/bookings/{id}": {
        get: {
            tags: ["Réservations"],
            summary: "Obtenir une réservation spécifique",
            description: "Récupérer les détails d'une réservation spécifique par son ID",
            parameters: [{ $ref: "#/components/parameters/BookingId" }],
            responses: {
                200: {
                    description: "Réservation récupérée avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Détails de la réservation récupérés avec succès" },
                                    data: { $ref: "#/components/schemas/BookingDetails" }
                                }
                            }
                        }
                    }
                },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/ServerError" }
            }
        },
        put: {
            tags: ["Réservations"],
            summary: "Mettre à jour une réservation",
            description: "Mettre à jour les données d'une réservation existante",
            parameters: [{ $ref: "#/components/parameters/BookingId" }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateBookingRequest" },
                        examples: {
                            statusUpdate: {
                                summary: "Confirmer une réservation",
                                value: {
                                    status: "confirmed",
                                    notes: "Rendez-vous confirmé"
                                }
                            },
                            reschedule: {
                                summary: "Reporter un rendez-vous",
                                value: {
                                    reservedAt: "2025-05-29T14:00:00Z",
                                    notes: "Rendez-vous reporté à la demande du client"
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: "Réservation mise à jour avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Réservation mise à jour avec succès" },
                                    data: { $ref: "#/components/schemas/BookingDetails" }
                                }
                            }
                        }
                    }
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/ServerError" }
            }
        },
        delete: {
            tags: ["Réservations"],
            summary: "Supprimer une réservation",
            description: "Supprimer définitivement une réservation du système",
            parameters: [{ $ref: "#/components/parameters/BookingId" }],
            responses: {
                200: {
                    description: "Réservation supprimée avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Réservation supprimée avec succès" },
                                    data: {
                                        type: "object",
                                        properties: {
                                            id: { type: "integer", example: 1 },
                                            deletedAt: { type: "string", format: "date-time" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/ServerError" }
            }
        }
    },

    "/bookings/user/{userId}": {
        get: {
            tags: ["Gestion des utilisateurs"],
            summary: "Obtenir les réservations d'un utilisateur",
            description: "Récupérer toutes les réservations d'un utilisateur spécifique avec possibilité de filtrage",
            parameters: [
                { $ref: "#/components/parameters/UserId" },
                { $ref: "#/components/parameters/StatusFilter" },
                {
                    name: "upcoming",
                    in: "query",
                    description: "Réservations à venir uniquement",
                    schema: { type: "boolean", default: false }
                }
            ],
            responses: {
                200: {
                    description: "Réservations de l'utilisateur récupérées avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Réservations de l'utilisateur récupérées avec succès" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/BookingDetails" }
                                    }
                                }
                            }
                        }
                    }
                },
                500: { $ref: "#/components/responses/ServerError" }
            }
        }
    },

    "/bookings/garage/{garageId}": {
        get: {
            tags: ["Gestion des utilisateurs"],
            summary: "Obtenir les réservations d'un garage",
            description: "Récupérer toutes les réservations d'un garage spécifique avec possibilité de filtrage",
            parameters: [
                { $ref: "#/components/parameters/GarageId" },
                { $ref: "#/components/parameters/StatusFilter" },
                {
                    name: "date",
                    in: "query",
                    description: "Filtrer par date (YYYY-MM-DD)",
                    schema: { type: "string", format: "date", example: "2025-05-28" }
                }
            ],
            responses: {
                200: {
                    description: "Réservations du garage récupérées avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Réservations du garage récupérées avec succès" },
                                    data: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/BookingDetails" }
                                    }
                                }
                            }
                        }
                    }
                },
                500: { $ref: "#/components/responses/ServerError" }
            }
        }
    },

    "/bookings/stats": {
        get: {
            tags: ["Statistiques des réservations"],
            summary: "Statistiques des réservations",
            description: "Récupérer des statistiques complètes sur les réservations",
            parameters: [
                {
                    name: "userId",
                    in: "query",
                    description: "Statistiques d'un utilisateur spécifique",
                    schema: { type: "string" }
                },
                {
                    name: "garageId",
                    in: "query",
                    description: "Statistiques d'un garage spécifique",
                    schema: { type: "string" }
                }
            ],
            responses: {
                200: {
                    description: "Statistiques récupérées avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Statistiques récupérées avec succès" },
                                    data: { $ref: "#/components/schemas/BookingStats" }
                                }
                            }
                        }
                    }
                },
                500: { $ref: "#/components/responses/ServerError" }
            }
        }
    },

    "/search/nearby": {
        get: {
            tags: ["Recherche géographique"],
            summary: "Rechercher des garages à proximité",
            description: "Rechercher les garages à proximité d'un emplacement spécifique",
            parameters: [
                {
                    name: "lat",
                    in: "query",
                    required: true,
                    description: "Latitude",
                    schema: { type: "number", format: "double", example: 33.5731 }
                },
                {
                    name: "lng",
                    in: "query",
                    required: true,
                    description: "Longitude",
                    schema: { type: "number", format: "double", example: -7.5898 }
                },
                {
                    name: "radius",
                    in: "query",
                    description: "Rayon en kilomètres",
                    schema: { type: "number", default: 10, example: 10 }
                }
            ],
            responses: {
                200: {
                    description: "Recherche effectuée avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Recherche effectuée avec succès" },
                                    data: {
                                        type: "object",
                                        properties: {
                                            garages: { type: "array", items: { type: "object" } },
                                            location: {
                                                type: "object",
                                                properties: {
                                                    lat: { type: "number", example: 33.5731 },
                                                    lng: { type: "number", example: -7.5898 }
                                                }
                                            },
                                            radius: { type: "number", example: 10 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/ServerError" }
            }
        }
    },

    "/search/nearest": {
        get: {
            tags: ["Recherche géographique"],
            summary: "Rechercher les garages les plus proches",
            description: "Rechercher les garages les plus proches d'un emplacement spécifique",
            parameters: [
                {
                    name: "lat",
                    in: "query",
                    required: true,
                    description: "Latitude",
                    schema: { type: "number", format: "double", example: 33.5731 }
                },
                {
                    name: "lng",
                    in: "query",
                    required: true,
                    description: "Longitude",
                    schema: { type: "number", format: "double", example: -7.5898 }
                },
                {
                    name: "limit",
                    in: "query",
                    description: "Nombre de garages demandés",
                    schema: { type: "integer", default: 5, minimum: 1, maximum: 20, example: 5 }
                }
            ],
            responses: {
                200: {
                    description: "Garages les plus proches trouvés",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Garages les plus proches trouvés" },
                                    data: {
                                        type: "object",
                                        properties: {
                                            nearest_garages: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        id: { type: "string", example: "1" },
                                                        name: { type: "string", example: "Garage Al-Amin" },
                                                        address: { type: "string", example: "Rue Rabat" },
                                                        distance: { type: "number", format: "double", example: 2.5 },
                                                        rating: { type: "number", example: 4.5 },
                                                        available_services: { type: "array", items: { type: "string" } }
                                                    }
                                                }
                                            },
                                            location: {
                                                type: "object",
                                                properties: {
                                                    lat: { type: "number", example: 33.5731 },
                                                    lng: { type: "number", example: -7.5898 }
                                                }
                                            },
                                            limit: { type: "integer", example: 5 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/ServerError" }
            }
        }
    },

    "/search/bounds": {
        get: {
            tags: ["Recherche géographique"],
            summary: "Rechercher dans une zone spécifique",
            description: "Rechercher les garages dans une zone géographique spécifique",
            parameters: [
                {
                    name: "north_lat",
                    in: "query",
                    required: true,
                    description: "Limite nord de la zone",
                    schema: { type: "number", format: "double", example: 33.6 }
                },
                {
                    name: "south_lat",
                    in: "query",
                    required: true,
                    description: "Limite sud de la zone",
                    schema: { type: "number", format: "double", example: 33.5 }
                },
                {
                    name: "east_lng",
                    in: "query",
                    required: true,
                    description: "Limite est de la zone",
                    schema: { type: "number", format: "double", example: -7.5 }
                },
                {
                    name: "west_lng",
                    in: "query",
                    required: true,
                    description: "Limite ouest de la zone",
                    schema: { type: "number", format: "double", example: -7.6 }
                }
            ],
            responses: {
                200: {
                    description: "Recherche dans la zone effectuée avec succès",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Recherche dans la zone effectuée avec succès" },
                                    data: {
                                        type: "object",
                                        properties: {
                                            garages: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        id: { type: "string", example: "1" },
                                                        name: { type: "string", example: "Garage Al-Amin" },
                                                        address: { type: "string", example: "Rue Rabat" },
                                                        location: {
                                                            type: "object",
                                                            properties: {
                                                                lat: { type: "number", example: 33.5731 },
                                                                lng: { type: "number", example: -7.5898 }
                                                            }
                                                        },
                                                        services_count: { type: "integer", example: 8 },
                                                        availability: { type: "boolean", example: true }
                                                    }
                                                }
                                            },
                                            bounds: {
                                                type: "object",
                                                properties: {
                                                    north_lat: { type: "number", example: 33.6 },
                                                    south_lat: { type: "number", example: 33.5 },
                                                    east_lng: { type: "number", example: -7.5 },
                                                    west_lng: { type: "number", example: -7.6 }
                                                }
                                            },
                                            total_found: { type: "integer", example: 15 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/ServerError" }
            }
        }
    }
};