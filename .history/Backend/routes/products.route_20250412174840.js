import express from "express";
import authenticateToken from "../middleware/isAuthenticated.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  searchProducts,
  getProductsByCategory,
  getSellerProducts
} from "../controllers/product.controller.js";
import upload from '../middleware/uploadMiddleware.js'; 

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/search", searchProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/seller/:sellerId", getSellerProducts);
router.get("/:id", getProductById);

// Protected routes - require authentication
router.use(authenticateToken); // Apply authentication middleware to all routes below
router.post("/",authenticateToken, upload.array('images', 10), createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", updateStock);

export default router;