/** @format */
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
        // ===== SCHEMAS EXISTANTS =====
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

        // ===== NOUVEAUX SCHEMAS POUR CATEGORIES/SUBCATEGORIES =====
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
        
        CategoryStatsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Statistiques des catégories récupérées avec succès" },
            timestamp: { type: "string", format: "date-time" },
            data: {
              type: "object",
              properties: {
                general_statistics: {
                  type: "object",
                  properties: {
                    total_categories: { type: "integer", example: 6 },
                    total_subcategories: { type: "integer", example: 30 },
                    total_garages_with_services: { type: "integer", example: 45 },
                    total_available_garages: { type: "integer", example: 50 },
                    total_garage_service_relations: { type: "integer", example: 120 },
                    avg_subcategories_per_category: { type: "number", example: 5.0 },
                    service_coverage_rate: { type: "number", example: 90.0 }
                  }
                },
                category_breakdown: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 1 },
                      name: { type: "string", example: "Visite Technique" },
                      description: { type: "string", example: "Services de réparation" },
                      subcategories_count: { type: "integer", example: 5 },
                      garages_count: { type: "integer", example: 15 },
                      available_garages_count: { type: "integer", example: 12 },
                      total_services_offered: { type: "integer", example: 25 },
                      market_coverage_percentage: { type: "number", example: 30.0 }
                    }
                  }
                },
                popular_subcategories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 15 },
                      name: { type: "string", example: "Vidange d'huile" },
                      description: { type: "string", example: "Vidange d'huile moteur" },
                      category: {
                        type: "object",
                        properties: {
                          id: { type: "integer", example: 3 },
                          name: { type: "string", example: "Vidange" }
                        }
                      },
                      garages_offering_count: { type: "integer", example: 25 },
                      availability_percentage: { type: "number", example: 50.0 }
                    }
                  }
                },
                underserved_subcategories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 28 },
                      name: { type: "string", example: "Teintage de vitres" },
                      description: { type: "string", example: "Teintage de vitres" },
                      category: {
                        type: "object",
                        properties: {
                          id: { type: "integer", example: 5 },
                          name: { type: "string", example: "Bris de glace" }
                        }
                      },
                      garages_offering_count: { type: "integer", example: 2 },
                      availability_percentage: { type: "number", example: 4.0 },
                      improvement_needed: { type: "boolean", example: true }
                    }
                  }
                },
                category_distribution: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category_id: { type: "integer", example: 1 },
                      category_name: { type: "string", example: "Visite Technique" },
                      garage_count: { type: "integer", example: 15 },
                      percentage: { type: "number", example: 30.0 }
                    }
                  }
                },
                avg_services_per_garage: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category_id: { type: "integer", example: 1 },
                      category_name: { type: "string", example: "Visite Technique" },
                      total_garages: { type: "integer", example: 15 },
                      total_services: { type: "integer", example: 45 },
                      avg_services_per_garage: { type: "number", example: 3.0 }
                    }
                  }
                },
                insights: {
                  type: "object",
                  properties: {
                    most_popular_category: { type: "string", example: "Visite Technique" },
                    least_served_category: { type: "string", example: "Bris de glace" },
                    highest_coverage_category: { type: "string", example: "Vidange" },
                    recommendations: {
                      type: "object",
                      properties: {
                        expand_services: {
                          type: "array",
                          items: { type: "string" },
                          example: ["Teintage de vitres", "Parallélisme", "Débosselage"]
                        },
                        popular_services: {
                          type: "array",
                          items: { type: "string" },
                          example: ["Vidange d'huile", "Test de freinage", "Lavage extérieur"]
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },

        CategoryWithSubcategories: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Visite Technique" },
            description: {
              type: "string",
              example: "Services de réparation et maintenance mécanique",
            },
            subcategories_count: { type: "integer", example: 5 },
            subcategories: {
              type: "array",
              items: { $ref: "#/components/schemas/Subcategory" }
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        CategoryDetails: {
          type: "object",
          properties: {
            category: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                name: { type: "string", example: "Visite Technique" },
                description: {
                  type: "string",
                  example: "Services de réparation et maintenance mécanique",
                },
                subcategories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 1 },
                      name: { type: "string", example: "Test de suspension" },
                      description: { type: "string", example: "Test de suspension" },
                      garages_count: { type: "integer", example: 3 },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                    },
                  },
                },
                subcategories_count: { type: "integer", example: 5 },
                garages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 1 },
                      name: { type: "string", example: "Garage Mécanique Pro" },
                      address: { type: "string", example: "123 Rue de la Mécanique" },
                      phone: { type: "string", example: "+212522123456" },
                      capacity: { type: "integer", example: 5 },
                      isdisponible: { type: "boolean", example: true },
                      latitude: { type: "number", example: 33.5731 },
                      longitude: { type: "number", example: -7.5898 },
                      main_image: { type: "string", example: "https://example.com/image.jpg" },
                    },
                  },
                },
                garages_count: { type: "integer", example: 8 },
                created_at: { type: "string", format: "date-time" },
                updated_at: { type: "string", format: "date-time" },
              },
            },
          },
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

        SubcategoryWithCategory: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Test de suspension" },
            description: { type: "string", example: "Test de suspension" },
            category_id: { type: "integer", example: 1 },
            category: {
              type: "object",
              properties: {
                name: { type: "string", example: "Visite Technique" },
                description: { type: "string", example: "Services de réparation" },
              },
            },
            garages_count: { type: "integer", example: 3 },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        SubcategoryDetails: {
          type: "object",
          properties: {
            subcategory: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                name: { type: "string", example: "Test de suspension" },
                description: { type: "string", example: "Test de suspension" },
                category_id: { type: "integer", example: 1 },
                category: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "Visite Technique" },
                    description: { type: "string", example: "Services de réparation" },
                  },
                },
                garages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 1 },
                      name: { type: "string", example: "Garage Mécanique Pro" },
                      address: { type: "string", example: "123 Rue de la Mécanique" },
                      phone: { type: "string", example: "+212522123456" },
                      capacity: { type: "integer", example: 5 },
                      isdisponible: { type: "boolean", example: true },
                      latitude: { type: "number", example: 33.5731 },
                      longitude: { type: "number", example: -7.5898 },
                      main_image: { type: "string", example: "https://example.com/image.jpg" },
                    },
                  },
                },
                garages_count: { type: "integer", example: 3 },
                created_at: { type: "string", format: "date-time" },
                updated_at: { type: "string", format: "date-time" },
              },
            },
          },
        },

        CategoriesResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "تم جلب الفئات والفئات الفرعية بنجاح" },
            data: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CategoryWithSubcategories" }
                },
                total_categories: { type: "integer", example: 6 },
                total_subcategories: { type: "integer", example: 30 },
              },
            },
          },
        },

        SubcategoriesResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "تم جلب الفئات الفرعية بنجاح" },
            data: {
              type: "object",
              properties: {
                subcategories: {
                  type: "array",
                  items: { $ref: "#/components/schemas/SubcategoryWithCategory" }
                },
                pagination: {
                  type: "object",
                  properties: {
                    total: { type: "integer", example: 30 },
                    limit: { type: "integer", example: 20 },
                    offset: { type: "integer", example: 0 },
                    has_more: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
        },

        SearchResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "تم العثور على 5 نتيجة" },
            search_query: { type: "string", example: "lavage" },
            data: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Category" }
                },
                subcategories: {
                  type: "array",
                  items: { $ref: "#/components/schemas/SubcategoryWithCategory" }
                },
                total_results: { type: "integer", example: 5 },
              },
            },
          },
        },

        // ===== SCHEMAS EXISTANTS (continuez avec les autres) =====
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
  ],
};

export const specs = swaggerJsDoc(options);