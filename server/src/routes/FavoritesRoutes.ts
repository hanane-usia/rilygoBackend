/** @format */
import express, { RequestHandler } from "express";
import {
  addFavorite,
  getFavoritesByUser,
  getAllFavorites,
  deleteFavorite,
  checkFavorite,
  toggleFavorite,
} from "../controllers/FavoriteController.js";

const router = express.Router();

// Routes pour les favoris

// POST /api/favorites - Ajouter un garage aux favoris
router.post("/favorites", addFavorite as RequestHandler);

// GET /api/favorites - Obtenir tous les favoris (admin)
router.get("/favorites", getAllFavorites);

// GET /api/favorites/user/:userId - Obtenir les favoris d'un utilisateur
router.get("/favorites/user/:userId", getFavoritesByUser as RequestHandler);

// GET /api/favorites/check/:garageId/:automobileId - Vérifier si un garage est favori
router.get(
  "/favorites/check/:garageId/:automobileId",
  checkFavorite as RequestHandler,
);

// POST /api/favorites/toggle - Toggle favori (ajouter/supprimer)
router.post("/favorites/toggle", toggleFavorite as RequestHandler);

// DELETE /api/favorites/:id - Supprimer un favori
router.delete("/favorites/:id", deleteFavorite as RequestHandler);

export default router;

/*
EXEMPLES D'UTILISATION:

1. Ajouter un garage aux favoris:
   POST /api/favorites
   Body: {
     "garageId": 1,           // ID depuis server garagiste
     "automobileId": 2        // ID local (cars table)
   }

2. Obtenir les favoris d'un utilisateur:
   GET /api/favorites/user/1?page=1&limit=10

3. Vérifier si un garage est favori:
   GET /api/favorites/check/1/2
   // garageId=1, automobileId=2

4. Toggle favori (ajouter/supprimer):
   POST /api/favorites/toggle
   Body: {
     "garageId": 1,
     "automobileId": 2
   }

5. Supprimer un favori:
   DELETE /api/favorites/5?userId=1

6. Obtenir tous les favoris (admin):
   GET /api/favorites?page=1&limit=20&garageId=1

RÉPONSES TYPES:

1. POST /api/favorites (succès):
{
  "message": "Garage ajouté aux favoris avec succès",
  "favorite": {
    "id": 6,
    "garageId": 1,
    "automobileId": 2,
    "userId": 1,
    "likedAt": "2025-05-23T20:00:00Z",
    "createdAt": "2025-05-23T20:00:00Z",
    "updatedAt": "2025-05-23T20:00:00Z",
    "car": {
      "id": 2,
      "mark": "Honda",
      "model": "Civic",
      "user_id": 1,
      "owner_name": "Ahmed Alami"
    },
    "garage": {
      "id": 1,
      "name": "Garage Mécanique Pro",
      "address": "123 Rue de la Mécanique, Casablanca"
    }
  }
}

2. GET /api/favorites/user/1 (succès):
{
  "message": "Favoris de l'utilisateur récupérés",
  "userId": 1,
  "favorites": [
    {
      "id": 1,
      "garageId": 1,
      "automobileId": 1,
      "userId": 1,
      "likedAt": "2025-05-20T10:00:00Z",
      "user": {
        "id": 1,
        "name": "Ahmed Alami",
        "email": "ahmed.alami@email.com"
      },
      "car": {
        "id": 1,
        "mark": "Toyota",
        "model": "Camry",
        "matricule": "A-123-456"
      },
      "garage": {
        "id": 1,
        "name": "Garage Mécanique Pro",
        "address": "123 Rue de la Mécanique, Casablanca"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalFavorites": 2,
    "hasNext": false,
    "hasPrev": false
  }
}

3. GET /api/favorites/check/1/2 (succès):
{
  "message": "Vérification du favori",
  "isFavorite": true,
  "favorite": {
    "id": 2,
    "garageId": 1,
    "automobileId": 2,
    "userId": 1,
    "likedAt": "2025-05-21T11:30:00Z",
    "user_name": "Ahmed Alami",
    "car_mark": "Honda",
    "car_model": "Civic"
  }
}

4. POST /api/favorites/toggle (ajout):
{
  "message": "Garage ajouté aux favoris",
  "action": "added",
  "favorite": {
    "id": 7,
    "garageId": 2,
    "automobileId": 3,
    "userId": 2,
    "likedAt": "2025-05-23T20:15:00Z"
  }
}

5. POST /api/favorites/toggle (suppression):
{
  "message": "Garage retiré des favoris",
  "action": "removed",
  "favorite": {
    "id": 7,
    "garageId": 2,
    "automobileId": 3,
    "userId": 2
  }
}

ARCHITECTURE:
- Server Automobiliste: users, cars, favorites ✓
- Server Garagiste: garages (via API) ✓
- Relation: favorites.garageId → API call to /garages/:id
- Sécurité: Vérification propriétaire voiture
- Performance: Cache local possible pour garage populaires
*/
