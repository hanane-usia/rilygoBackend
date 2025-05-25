/** @format */

// swagger.js
import swaggerJsDoc from "swagger-jsdoc";

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
        email: "othmanelamranialaoui@gmail.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:5001/api",
        description: "Serveur de développement",
      },
      {
        url: "https://api-production.example.com/api",
        description: "Serveur de production",
      },
    ],
    tags: [
      {
        name: "Garagistes",
        description: "Opérations relatives aux garagistes",
      },
      {
        name: "Garages",
        description: "Opérations relatives aux garages",
      },
      {
        name: "Catégories",
        description: "Opérations relatives aux catégories et sous-catégories",
      },
      {
        name: "Images",
        description: "Gestion des images de garage",
      },
      {
        name: "Recherche",
        description: "Fonctionnalités de recherche et géolocalisation",
      },
    ],
    components: {
      schemas: {
        // Schémas des modèles de données
        Garage: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Garage Mécanique Pro" },
            address: {
              type: "string",
              example: "123 Rue de la Mécanique, Casablanca",
            },
            phone: { type: "string", example: "+212522123456" },
            capacity: { type: "integer", example: 5 },
            isDisponible: { type: "boolean", example: true },
            latitude: { type: "number", format: "double", example: 33.5731 },
            longitude: { type: "number", format: "double", example: -7.5898 },
            main_image: {
              type: "string",
              example: "https://example.com/images/garage1_main.jpg",
            },
            description: {
              type: "string",
              example:
                "Centre technique spécialisé dans les contrôles mécaniques",
            },
            category_id: { type: "integer", example: 1 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["name", "category_id", "capacity"],
        },
        Garagiste: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Ahmed Mechanic" },
            email: {
              type: "string",
              format: "email",
              example: "ahmed@garage.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "password123",
            },
            phone: { type: "string", example: "+212600123456" },
            profileImage: {
              type: "string",
              example: "https://example.com/profiles/ahmed.jpg",
            },
            deplomeImage: {
              type: "string",
              example: "https://example.com/diplomes/ahmed.jpg",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["name", "email", "password"],
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Visite Technique" },
            description: {
              type: "string",
              example: "Services de réparation et maintenance mécanique",
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
          required: ["name"],
        },
        Subcategory: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Test de suspension" },
            description: { type: "string", example: "Test de suspension" },
            category_id: { type: "integer", example: 1 },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
          required: ["name", "category_id"],
        },
        GarageImage: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            garage_id: { type: "integer", example: 1 },
            image_url: {
              type: "string",
              example: "https://example.com/images/garage1/image1.jpg",
            },
            is_featured: { type: "boolean", example: true },
            title: { type: "string", example: "Accueil" },
            alt_text: {
              type: "string",
              example: "Accueil du Garage Mécanique Pro",
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
          required: ["garage_id", "image_url"],
        },
        GarageDetails: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Garage Mécanique Pro" },
            address: {
              type: "string",
              example: "123 Rue de la Mécanique, Casablanca",
            },
            phone: { type: "string", example: "+212522123456" },
            capacity: { type: "integer", example: 5 },
            isAvailable: { type: "boolean", example: true },
            location: {
              type: "object",
              properties: {
                latitude: {
                  type: "number",
                  format: "double",
                  example: 33.5731,
                },
                longitude: {
                  type: "number",
                  format: "double",
                  example: -7.5898,
                },
              },
            },
            description: {
              type: "string",
              example: "Centre technique spécialisé",
            },
            mainImage: {
              type: "string",
              example: "https://example.com/images/garage1_main.jpg",
            },
            category: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                name: { type: "string", example: "Visite Technique" },
                description: {
                  type: "string",
                  example: "Services de réparation et maintenance mécanique",
                },
              },
            },
            subcategories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 1 },
                  name: { type: "string", example: "Test de suspension" },
                  description: {
                    type: "string",
                    example: "Test de suspension",
                  },
                  categoryId: { type: "integer", example: 1 },
                  categoryName: { type: "string", example: "Visite Technique" },
                },
              },
            },
            images: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 1 },
                  url: {
                    type: "string",
                    example: "https://example.com/images/garage1/image1.jpg",
                  },
                  isFeatured: { type: "boolean", example: true },
                  title: { type: "string", example: "Accueil" },
                  altText: {
                    type: "string",
                    example: "Accueil du Garage Mécanique Pro",
                  },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
            nearbyGarages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 3 },
                  name: { type: "string", example: "Électro Auto Services" },
                  address: {
                    type: "string",
                    example: "789 Boulevard Zerktouni, Casablanca",
                  },
                  mainImage: {
                    type: "string",
                    example: "https://example.com/images/garage3_main.jpg",
                  },
                  location: {
                    type: "object",
                    properties: {
                      latitude: {
                        type: "number",
                        format: "double",
                        example: 33.5992,
                      },
                      longitude: {
                        type: "number",
                        format: "double",
                        example: -7.6327,
                      },
                    },
                  },
                  distanceKm: { type: "string", example: "2.34" },
                },
              },
            },
            stats: {
              type: "object",
              properties: {
                imagesCount: { type: "integer", example: 3 },
                subcategoriesCount: { type: "integer", example: 3 },
              },
            },
            timestamps: {
              type: "object",
              properties: {
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Erreur serveur" },
            error: { type: "string", example: "Message d'erreur détaillé" },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Opération réussie" },
          },
        },
      },
      responses: {
        NotFound: {
          description: "Ressource non trouvée",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string", example: "Ressource non trouvée" },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Erreur serveur",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
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
                  message: { type: "string", example: "Requête invalide" },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts",
    "./src/docs/*.ts",
    "./routes/*.ts",
    "./controllers/*.ts",
    "./docs/*.ts",
  ], // Chemins vers les fichiers avec annotations
};

export const specs = swaggerJsDoc(options);
