/** @format */
import express from "express";
import {
  getAllCategories,
  getCategoryById,
  getAllSubcategories,
  getSubcategoryById,
  getSubcategoriesByCategory,
  searchCategories,
  getCategoryStats
} from "../controllers/CategoryController";

const router = express.Router();

// ===== ROUTES الثابتة أولاً =====

// جلب جميع الفئات
router.get("/categories", getAllCategories);

// البحث في الفئات - يجب أن يكون قبل /:id
router.get("/categories/search", searchCategories);

// إحصائيات الفئات - يجب أن يكون قبل /:id
/**
 * @swagger
 * /categories/stats:
 *   get:
 *     summary: Récupérer les statistiques des catégories
 *     description: Retourne des statistiques détaillées sur les catégories, sous-catégories et leur distribution dans les garages
 *     tags: [Catégories]
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryStatsResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/categories/stats", getCategoryStats);

// ===== ROUTES مع Parameters بعد ذلك =====

// جلب فئة محددة - يجب أن يكون بعد الـ routes الثابتة
router.get("/categories/:id", getCategoryById);

// جلب الفئات الفرعية لفئة محددة
router.get("/categories/:categoryId/subcategories", getSubcategoriesByCategory);

// ===== ROUTES الفئات الفرعية =====

// جلب جميع الفئات الفرعية
router.get("/subcategories", getAllSubcategories);

// جلب فئة فرعية محددة
router.get("/subcategories/:id", getSubcategoryById);

export default router;