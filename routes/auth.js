const express = require('express');
const {check, body} = require('express-validator');

const router = express.Router();

const authController = require('../controllers/auth');
const User = require('../models/user');

router.get('/login',authController.getLogin);
router.post('/login', //make validation here [post req]
    body('email').isEmail().withMessage('please enter a valid email.').normalizeEmail() ,
    body('password', 'Please enter a password with only numbers and text and at least 5 characters').isLength({min: 5}).isAlphanumeric().trim() ,
    authController.postLogin
); 

router.get('/signup',authController.getSignup);
router.post('/signup', //make validation here [post req]
    check('email').isEmail().withMessage('please enter a valid email.').custom((value, {req}) => {
        //check if a user with that e-mail already exists
        return User.findOne({ email: value }).then(user => {
                if(user){ 
                    return Promise.reject('E-Mail exists already, please pick a different one.');
                }
            });
    }).normalizeEmail(),
    body('password', 'Please enter a password with only numbers and text and at least 5 characters').isLength({min: 5}).isAlphanumeric().trim() ,
    body('confirmPassword').custom((value, {req})=>{
        if(value !== req.body.password){
            throw new Error('Passwords have to match!');
        }
        return true;
    }).trim(),
    authController.postSignup
); 

router.post('/logout',authController.postLogout);

router.get('/reset',authController.getReset);
router.post('/reset', //make validation here [post req]
    body('email').isEmail().withMessage('please enter a valid email.').normalizeEmail() ,
    authController.postReset
);

router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', //make validation here [post req]
    body('password', 'Please enter a password with only numbers and text and at least 5 characters').isLength({min: 5}).isAlphanumeric().trim() ,
    authController.postNewPassword
);

module.exports = router;