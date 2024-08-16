const path = require('path');
const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop');
const isAuth = require('../middleware/is_auth');

router.get('/',shopController.getIndex);
router.get('/products',shopController.getProducts);
//ex: /products/2141
router.get('/products/:productId',shopController.getProduct);


router.get('/cart', isAuth, shopController.getCart);
router.post('/cart', isAuth, shopController.postCart);
router.post('/cart-delete-item', isAuth, shopController.postCardDeleteProduct);

router.get('/orders', isAuth, shopController.getOrder);
router.post('/create-order', isAuth, shopController.postOrder);

router.get('/orders/:orderId',isAuth, shopController.getInvoice);

module.exports = router;

