/** @format */
import express, { RequestHandler } from "express";
import {
  addGaragiste,
  getAllGaragistes,
  getGaragiste,
  updateGaragiste,
  deleteGaragiste,
  searchGaragistes,
  loginGaragiste,
} from "../controllers/GaragisteController"; // Ajustez le chemin

const router = express.Router();

/**
 * @swagger
 * /garagistes:
 *   post:
 *     summary: Créer un nouveau garagiste
 *     description: Ajoute un nouveau garagiste à la base de données
 *     tags: [Garagistes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du garagiste
 *                 example: "Ahmed Mechanic"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email du garagiste (doit être unique)
 *                 example: "ahmed@garage.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe du garagiste
 *                 example: "password123"
 *               phone:
 *                 type: string
 *                 description: Numéro de téléphone
 *                 example: "+212600123456"
 *               profileImage:
 *                 type: string
 *                 description: URL de l'image de profil
 *                 example: "https://example.com/profile.jpg"
 *               deplomeImage:
 *                 type: string
 *                 description: URL de l'image du diplôme
 *                 example: "https://example.com/diplome.jpg"
 *     responses:
 *       201:
 *         description: Garagiste créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Garagiste créé avec succès"
 *                 garagiste:
 *                   $ref: '#/components/schemas/Garagiste'
 *       400:
 *         description: Données invalides ou manquantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vous devez fournir au moins un nom, email et mot de passe"
 *       409:
 *         description: Email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Un garagiste avec cet email existe déjà"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/garagistes", addGaragiste as RequestHandler);

/**
 * @swagger
 * /garagistes:
 *   get:
 *     summary: Récupérer tous les garagistes
 *     description: Retourne une liste paginée des garagistes avec possibilité de recherche
 *     tags: [Garagistes]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Terme de recherche (cherche dans le nom, email et téléphone)
 *     responses:
 *       200:
 *         description: Liste des garagistes récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 garagistes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Garagiste'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalGaragistes:
 *                       type: integer
 *                       example: 5
 *                     hasNext:
 *                       type: boolean
 *                       example: false
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garagistes", getAllGaragistes as RequestHandler);

/**
 * @swagger
 * /garagistes/search:
 *   get:
 *     summary: Rechercher des garagistes
 *     description: Recherche des garagistes selon un terme de recherche et un champ spécifique
 *     tags: [Garagistes]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *       - in: query
 *         name: field
 *         schema:
 *           type: string
 *           enum: [name, email, phone]
 *           default: name
 *         description: Champ dans lequel effectuer la recherche
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
 *                 message:
 *                   type: string
 *                   example: "Garagistes trouvés"
 *                 search:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       example: "ahmed"
 *                     field:
 *                       type: string
 *                       example: "name"
 *                 garagistes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Garagiste'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalGaragistes:
 *                       type: integer
 *                       example: 1
 *                     hasNext:
 *                       type: boolean
 *                       example: false
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Paramètres de recherche manquants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vous devez fournir un terme de recherche"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garagistes/search", searchGaragistes as RequestHandler);

/**
 * @swagger
 * /garagistes/{id}:
 *   get:
 *     summary: Récupérer un garagiste par ID
 *     description: Retourne les détails d'un garagiste spécifique
 *     tags: [Garagistes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du garagiste
 *     responses:
 *       200:
 *         description: Garagiste récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Garagiste récupéré avec succès"
 *                 garagiste:
 *                   $ref: '#/components/schemas/Garagiste'
 *       404:
 *         description: Garagiste non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Garagiste non trouvé"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/garagistes/:id", getGaragiste as RequestHandler);

/**
 * @swagger
 * /garagistes/{id}:
 *   put:
 *     summary: Mettre à jour un garagiste
 *     description: Met à jour les informations d'un garagiste existant
 *     tags: [Garagistes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du garagiste à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du garagiste
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email du garagiste
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nouveau mot de passe
 *               phone:
 *                 type: string
 *                 description: Numéro de téléphone
 *               profileImage:
 *                 type: string
 *                 description: URL de l'image de profil
 *               deplomeImage:
 *                 type: string
 *                 description: URL de l'image du diplôme
 *     responses:
 *       200:
 *         description: Garagiste mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Garagiste mis à jour avec succès"
 *                 garagiste:
 *                   $ref: '#/components/schemas/Garagiste'
 *       400:
 *         description: Données de mise à jour invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Aucune donnée valide fournie pour la mise à jour"
 *       404:
 *         description: Garagiste non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Garagiste non trouvé"
 *       409:
 *         description: Email déjà utilisé par un autre garagiste
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cet email est déjà utilisé par un autre garagiste"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put("/garagistes/:id", updateGaragiste as RequestHandler);

/**
 * @swagger
 * /garagistes/{id}:
 *   delete:
 *     summary: Supprimer un garagiste
 *     description: Supprime un garagiste existant
 *     tags: [Garagistes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du garagiste à supprimer
 *     responses:
 *       200:
 *         description: Garagiste supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Garagiste supprimé avec succès"
 *       404:
 *         description: Garagiste non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Garagiste non trouvé"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/garagistes/:id", deleteGaragiste as RequestHandler);

/**
 * @swagger
 * /garagistes/login:
 *   post:
 *     summary: Connexion d'un garagiste
 *     description: Authentifie un garagiste avec son email et son mot de passe
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email du garagiste
 *                 example: "ahmed@garage.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe du garagiste
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Connexion réussie"
 *                 garagiste:
 *                   $ref: '#/components/schemas/Garagiste'
 *       400:
 *         description: Informations de connexion manquantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Veuillez fournir un email et un mot de passe"
 *       401:
 *         description: Informations d'identification incorrectes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email ou mot de passe incorrect"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/garagistes/login", loginGaragiste as RequestHandler);

export default router;
