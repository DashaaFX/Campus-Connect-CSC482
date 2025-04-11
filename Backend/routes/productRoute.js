// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth } = require('../middleware/auth');
const upload = multer({ dest: 'uploads/' });


router.get('/', productController.getProducts);
router.get('/all', productController.getProductsCategory); // Get all products with category data
router.get('/all', productController.getProductsCategory); // Get all products with category data

router.post('/', auth, upload.array('images'), productController.createProduct);


module.exports = router;
