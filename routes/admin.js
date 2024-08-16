const path = require('path');
const express = require('express');
const {body} = require('express-validator');
const router = express.Router();

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is_auth');

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/add-product => POST
router.post('/add-product',
    body('title', 'Title has to be at least 3 characters long').isString().isLength({min:3}).trim(),
    body('price').isFloat().withMessage('Price has to be float').trim(),
    body('description').isLength({min:5, max: 400}).withMessage('Description has to be between 5 and 400 characters').trim(),
    isAuth,
    adminController.postAddProduct
);

// /admin/edit-product/variableSegment => GET
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

// /admin/edit-product => POST
router.post('/edit-product',
    body('title', 'Title has to be at least 3 characters long').isString().isLength({min:3}).trim(),
    body('price').isFloat().withMessage('Price has to be float').trim(),
    body('description').isLength({min:5, max: 400}).withMessage('Description has to be between 5 and 400 characters').trim(),
    isAuth, 
    adminController.postEditProduct
);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/delete-product => POST 
//router.post('/delete-product', isAuth, adminController.postDeleteProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);


module.exports = router;

