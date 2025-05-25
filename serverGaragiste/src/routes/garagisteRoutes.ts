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

// Routes pour les garagistes

// POST /api/garagistes - Créer un nouveau garagiste
router.post("/garagistes", addGaragiste as RequestHandler);

// GET /api/garagistes - Obtenir tous les garagistes avec pagination et recherche
// Query params optionnels: page, limit, search
router.get("/garagistes", getAllGaragistes as RequestHandler);

// GET /api/garagistes/search - Rechercher des garagistes
// Query params: query, field (name, email, phone)
router.get("/garagistes/search", searchGaragistes as RequestHandler);

// GET /api/garagistes/:id - Obtenir un garagiste par ID
router.get("/garagistes/:id", getGaragiste as RequestHandler);

// PUT /api/garagistes/:id - Mettre à jour un garagiste
router.put("/garagistes/:id", updateGaragiste as RequestHandler);

// DELETE /api/garagistes/:id - Supprimer un garagiste
router.delete("/garagistes/:id", deleteGaragiste as RequestHandler);

// POST /api/garagistes/login - Connexion garagiste
router.post("/garagistes/login", loginGaragiste as RequestHandler);

export default router;

/*
EXEMPLES D'UTILISATION:

1. Créer un garagiste:
   POST /api/garagistes
   Body: {
     "name": "Ahmed Mechanic",
     "email": "ahmed@garage.com",
     "password": "password123",
     "phone": "+212600123456",
     "profileImage": "https://example.com/profile.jpg",
     "deplomeImage": "https://example.com/diplome.jpg"
   }

2. Obtenir tous les garagistes avec pagination:
   GET /api/garagistes?page=1&limit=10

3. Rechercher des garagistes:
   GET /api/garagistes?search=ahmed

4. Rechercher par champ spécifique:
   GET /api/garagistes/search?query=ahmed&field=name

5. Obtenir un garagiste spécifique:
   GET /api/garagistes/1

6. Mettre à jour un garagiste:
   PUT /api/garagistes/1
   Body: {
     "phone": "+212600999888",
     "profileImage": "https://example.com/new_profile.jpg"
   }

7. Supprimer un garagiste:
   DELETE /api/garagistes/1

8. Connexion garagiste:
   POST /api/garagistes/login
   Body: {
     "email": "ahmed@garage.com",
     "password": "password123"
   }

RÉPONSES TYPES:

1. POST /api/garagistes (succès):
{
  "message": "Garagiste créé avec succès",
  "garagiste": {
    "id": 6,
    "name": "Ahmed Mechanic",
    "email": "ahmed@garage.com",
    "phone": "+212600123456",
    "profileImage": "https://example.com/profile.jpg",
    "deplomeImage": "https://example.com/diplome.jpg",
    "createdAt": "2025-05-23T15:30:00Z",
    "updatedAt": "2025-05-23T15:30:00Z"
  }
}

2. GET /api/garagistes (succès):
{
  "garagistes": [
    {
      "id": 1,
      "name": "Ahmed Mechanic",
      "email": "ahmed.mechanic@garage.com",
      "phone": "+212600123456",
      "profileImage": "https://example.com/profiles/ahmed.jpg",
      "deplomeImage": "https://example.com/diplomes/ahmed_diplome.jpg",
      "createdAt": "2025-05-23T10:00:00Z",
      "updatedAt": "2025-05-23T10:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalGaragistes": 5,
    "hasNext": false,
    "hasPrev": false
  }
}

3. POST /api/garagistes/login (succès):
{
  "message": "Connexion réussie",
  "garagiste": {
    "id": 1,
    "name": "Ahmed Mechanic",
    "email": "ahmed.mechanic@garage.com",
    "phone": "+212600123456",
    "profileImage": "https://example.com/profiles/ahmed.jpg",
    "deplomeImage": "https://example.com/diplomes/ahmed_diplome.jpg",
    "createdAt": "2025-05-23T10:00:00Z",
    "updatedAt": "2025-05-23T10:00:00Z"
  }
}

4. Erreur (email déjà existant):
{
  "message": "Un garagiste avec cet email existe déjà"
}

5. Erreur (validation):
{
  "message": "Vous devez fournir au moins un nom, email et mot de passe"
}

6. Erreur (login incorrect):
{
  "message": "Email ou mot de passe incorrect"
}
*/
