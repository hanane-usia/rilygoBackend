/** @format */
import express, { RequestHandler } from "express";
import {
  addAddress,
  getUserAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
  getUserWithAddresses,
} from "../controllers/addressController.js"; // Ajustez le chemin

const router = express.Router();

// Routes pour les adresses des utilisateurs

// POST /api/users/:userId/addresses - Ajouter une adresse à un utilisateur
router.post("/users/:userId/addresses", addAddress as RequestHandler);

// GET /api/users/:userId/addresses - Obtenir toutes les adresses d'un utilisateur
router.get("/users/:userId/addresses", getUserAddresses as RequestHandler);

// GET /api/users/:userId/addresses/:addressId - Obtenir une adresse spécifique
router.get("/users/:userId/addresses/:addressId", getAddress as RequestHandler);

// PUT /api/users/:userId/addresses/:addressId - Mettre à jour une adresse
router.put(
  "/users/:userId/addresses/:addressId",
  updateAddress as RequestHandler,
);

// DELETE /api/users/:userId/addresses/:addressId - Supprimer une adresse
router.delete(
  "/users/:userId/addresses/:addressId",
  deleteAddress as RequestHandler,
);

// GET /api/users/:userId/with-addresses - Obtenir un utilisateur avec toutes ses adresses
router.get(
  "/users/:userId/UserAddresses",
  getUserWithAddresses as RequestHandler,
);

export default router;

/*
EXEMPLES D'UTILISATION:

1. Ajouter une adresse:
   POST /api/users/1/addresses
   Body: {
     "place": "123 Main Street, Paris 75001",
     "type": "home"
   }

2. Obtenir toutes les adresses d'un utilisateur:
   GET /api/users/1/addresses

3. Obtenir une adresse spécifique:
   GET /api/users/1/addresses/5

4. Mettre à jour une adresse:
   PUT /api/users/1/addresses/5
   Body: {
     "place": "456 New Street, Paris 75002",
     "type": "work"
   }

5. Supprimer une adresse:
   DELETE /api/users/1/addresses/5

6. Obtenir un utilisateur avec toutes ses adresses:
   GET /api/users/1/with-addresses

RÉPONSES TYPES:

1. POST /api/users/1/addresses (succès):
{
  "message": "Adresse ajoutée avec succès",
  "address": {
    "id": 10,
    "user_id": 1,
    "place": "123 Main Street, Paris 75001",
    "type": "home"
  }
}

2. GET /api/users/1/addresses (succès):
{
  "addresses": [
    {
      "id": 1,
      "user_id": 1,
      "place": "123 Main Street, New York, NY 10001",
      "type": "home",
      "user_name": "John Doe",
      "user_email": "john.doe@example.com"
    },
    {
      "id": 2,
      "user_id": 1,
      "place": "456 Business Ave, New York, NY 10002",
      "type": "work",
      "user_name": "John Doe",
      "user_email": "john.doe@example.com"
    }
  ],
  "count": 2
}

3. GET /api/users/1/with-addresses (succès):
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "addresses": [
      {
        "id": 1,
        "place": "123 Main Street, New York, NY 10001",
        "type": "home"
      },
      {
        "id": 2,
        "place": "456 Business Ave, New York, NY 10002",
        "type": "work"
      }
    ]
  }
}

4. Erreur (utilisateur non trouvé):
{
  "message": "Utilisateur non trouvé"
}

5. Erreur (validation):
{
  "message": "Vous devez fournir le lieu et le type d'adresse"
}
*/
