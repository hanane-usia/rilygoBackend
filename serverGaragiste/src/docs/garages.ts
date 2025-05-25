/** @format */
import express from "express";
import {
  addGarage,
  getAllGarages,
  getGarage,
  getGaragesByCategory,
  getGaragesBySubcategory,
  updateGarage,
  deleteGarage,
  getAllGaragesWithDetails,
  getGarageDetails,
  searchGaragesWithDetails,
} from "../controllers/GarageController";

const router = express.Router();

/**
 * @swagger
 * /garages:
 *   post:
 *     summary: Créer un nouveau garage
 *     description: Ajoute un nouveau garage à la base de données
 *     tags: [Garages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category_id
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du garage
 *                 example: "Garage Express"
 *               category_id:
 *                 type: integer
 *                 description: ID de la catégorie
 *                 example: 1
 *               capacity:
 *                 type: integer
 *                 description: Capacité du garage
 *                 example: 5
 *               isDisponible:
 *                 type: boolean
 *                 description: Disponibilité du garage
 *                 example: true
 *               address:
 *                 type: string
 *                 description: Adresse du garage
 *                 example: "123 Rue des Mécaniciens, Casablanca"
 *               phone:
 *                 type: string
 *                 description: Numéro de téléphone
 *                 example: "+212522123456"
 *               latitude:
 *                 type: number
 *                 format: double
 *                 description: Latitude
 *                 example: 33.5731
 *               longitude:
 *                 type: number
 *                 format: double
 *                 description: Longitude
 *                 example: -7.5898
 *               main_image:
 *                 type: string
 *                 description: URL de l'image principale
 *                 example: "https://example.com/images/garage1_main.jpg"
 *               description:
 *                 type: string
 *                 description: Description du garage
 *                 example: "Service de réparation rapide et professionnel"
 *               subcategories:
 *                 type: array
 *                 description: IDs des sous-catégories
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *     responses:
 *       201:
 *         description: Garage créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Garage créé avec succès"
 *                 data:
 *                   $ref: '#/components/schemas/Garage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/garages", addGarage);

/**
 * @swagger
 * /garages:
 *   get:
 *     summary: Récupérer tous les garages
 *     description: Récupère la liste des garages avec pagination et filtrage
 *     tags: [Garages]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page pour la pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre de résultats par page
 *       - in: query
 *         name: disponible
 *         schema:
 *           type: boolean
 *         description: Filtrer par disponibilité
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filtrer par ID de catégorie
 *     responses:
 *       200:
 *         description: Liste des garages récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Garages récupérés avec succès"
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 totalPages:
 *                   type: integer
 *                   example: 2
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Garage'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garages", getAllGarages);

/**
 * @swagger
 * /garages/{id}:
 *   get:
 *     summary: Récupérer un garage par ID
 *     description: Retourne les détails d'un garage spécifique
 *     tags: [Garages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du garage
 *     responses:
 *       200:
 *         description: Détails du garage récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Garage récupéré avec succès"
 *                 data:
 *                   $ref: '#/components/schemas/Garage'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garages/:id", getGarage);

/**
 * @swagger
 * /garages/{id}/details:
 *   get:
 *     summary: Récupérer les détails complets d'un garage
 *     description: Retourne toutes les informations détaillées d'un garage, y compris ses images, sous-catégories et statistiques
 *     tags: [Garages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du garage
 *     responses:
 *       200:
 *         description: Détails complets du garage récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/GarageDetails'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garages/:id/details", getGarageDetails);

/**
 * @swagger
 * /garages/category/{categoryId}:
 *   get:
 *     summary: Récupérer les garages par catégorie
 *     description: Retourne la liste des garages appartenant à une catégorie spécifique
 *     tags: [Garages]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la catégorie
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre de résultats par page
 *     responses:
 *       200:
 *         description: Garages récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Garages par catégorie récupérés avec succès"
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Garage'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garages/category/:categoryId", getGaragesByCategory);

/**
 * @swagger
 * /garages/subcategory/{subcategoryId}:
 *   get:
 *     summary: Récupérer les garages par sous-catégorie
 *     description: Retourne la liste des garages offrant une sous-catégorie spécifique
 *     tags: [Garages]
 *     parameters:
 *       - in: path
 *         name: subcategoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sous-catégorie
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre de résultats par page
 *     responses:
 *       200:
 *         description: Garages récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Garages par sous-catégorie récupérés avec succès"
 *                 subcategory:
 *                   $ref: '#/components/schemas/Subcategory'
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Garage'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garages/subcategory/:subcategoryId", getGaragesBySubcategory);

/**
 * @swagger
 * /garages/all/details:
 *   get:
 *     summary: Récupérer tous les garages avec détails complets
 *     description: Retourne une liste paginée de tous les garages avec leurs images et sous-catégories
 *     tags: [Garages]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre de résultats par page
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filtrer par ID de catégorie
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: integer
 *         description: Filtrer par ID de sous-catégorie
 *       - in: query
 *         name: available
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrer par disponibilité
 *     responses:
 *       200:
 *         description: Garages récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 totalCount:
 *                   type: integer
 *                   example: 15
 *                 totalPages:
 *                   type: integer
 *                   example: 2
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 hasNextPage:
 *                   type: boolean
 *                   example: true
 *                 hasPrevPage:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GarageDetails'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garages/all/details", getAllGaragesWithDetails);

/**
 * @swagger
 * /garages/search:
 *   get:
 *     summary: Rechercher des garages avec filtres avancés
 *     description: Permet de rechercher des garages selon plusieurs critères et retourne les résultats avec leurs détails
 *     tags: [Recherche]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Terme de recherche textuelle (nom, adresse, description)
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: ID de catégorie
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: integer
 *         description: ID de sous-catégorie
 *       - in: query
 *         name: available
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Disponibilité
 *       - in: query
 *         name: minCapacity
 *         schema:
 *           type: integer
 *         description: Capacité minimale
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: double
 *         description: Latitude pour recherche par proximité
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: double
 *         description: Longitude pour recherche par proximité
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           format: double
 *         description: Rayon de recherche en km
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre de résultats par page
 *     responses:
 *       200:
 *         description: Résultats de recherche récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 totalCount:
 *                   type: integer
 *                   example: 8
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 hasNextPage:
 *                   type: boolean
 *                   example: true
 *                 hasPrevPage:
 *                   type: boolean
 *                   example: false
 *                 searchCriteria:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       example: "vidange"
 *                     category:
 *                       type: integer
 *                       example: 3
 *                     subcategory:
 *                       type: integer
 *                       example: null
 *                     available:
 *                       type: string
 *                       example: "true"
 *                     minCapacity:
 *                       type: integer
 *                       example: 3
 *                     location:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                           example: 33.5731
 *                         longitude:
 *                           type: number
 *                           example: -7.5898
 *                         radiusKm:
 *                           type: number
 *                           example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GarageDetails'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garages/search", searchGaragesWithDetails);

/**
 * @swagger
 * /garages/{id}:
 *   put:
 *     summary: Mettre à jour un garage
 *     description: Met à jour les informations d'un garage existant
 *     tags: [Garages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du garage à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du garage
 *               category_id:
 *                 type: integer
 *                 description: ID de la catégorie
 *               capacity:
 *                 type: integer
 *                 description: Capacité du garage
 *               isDisponible:
 *                 type: boolean
 *                 description: Disponibilité du garage
 *               address:
 *                 type: string
 *                 description: Adresse du garage
 *               phone:
 *                 type: string
 *                 description: Numéro de téléphone
 *               latitude:
 *                 type: number
 *                 format: double
 *                 description: Latitude
 *               longitude:
 *                 type: number
 *                 format: double
 *                 description: Longitude
 *               main_image:
 *                 type: string
 *                 description: URL de l'image principale
 *               description:
 *                 type: string
 *                 description: Description du garage
 *               subcategories:
 *                 type: array
 *                 description: IDs des sous-catégories
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Garage mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Garage mis à jour avec succès"
 *                 data:
 *                   $ref: '#/components/schemas/Garage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put("/garages/:id", updateGarage);

/**
 * @swagger
 * /garages/{id}:
 *   delete:
 *     summary: Supprimer un garage
 *     description: Supprime un garage existant et toutes ses données associées
 *     tags: [Garages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du garage à supprimer
 *     responses:
 *       200:
 *         description: Garage supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Garage supprimé avec succès"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/garages/:id", deleteGarage);

export default router;
