// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { adminAuth } = require('../middleware/auth');


router.get('/', categoryController.getAllCategories);
router.post('/', adminAuth, categoryController.createCategory);


module.exports = router;