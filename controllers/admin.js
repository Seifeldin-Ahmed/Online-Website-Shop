const product = require('../models/product');
const Product = require('../models/product');
const {validationResult} = require('express-validator');
const {ObjectId} = require('mongodb');
const fileHelper = require('../util/file');
const path = require('path');
const rootDir = require('../util/path');
const ITEMS_PER_PAGE = 2;

exports.getAddProduct = (req,res,next) =>{
    if(!req.session.isLoggedIn){ //route protection
        return res.redirect('/login');
    }
    res.render('admin/edit-product',{pageTitle:'Add Product', path:'/admin/add-product', editing: false, hasError: false, errorMessage: null, validationErrors: [] });
};

exports.postAddProduct = (req,res,next) =>{
    const title = req.body.title;
    const image = req.file;
    const description = req.body.description;
    const price = req.body.price;
    if(!image){
        return res.status(422).render('admin/edit-product',{pageTitle:'Add Product', path:'/admin/add-product', editing: false, hasError: true, errorMessage: 'Attached file is not an image.', product: {title: title, price: price, description: description}, validationErrors: [] });
    }
    const errors = validationResult(req);    
    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('admin/edit-product',{pageTitle:'Add Product', path:'/admin/add-product', editing: false, hasError: true, errorMessage: errors.array()[0].msg, product: {title: title, price: price, description: description}, validationErrors: errors.array() });
    }
    const imageUrl = image.path; 
    const product = new Product({title: title,price: price, description: description, imageUrl: imageUrl, userId: req.user._id}); // the order of arguments doesn't matter here it's not js object, it's a module
    product.save() // this save method here come from mongoose
    .then(() => {
        res.redirect('/admin/products');
    }).catch(err => {
        console.log("s");
      //  return res.status(500).render('admin/edit-product',{pageTitle:'Add Product', path:'/admin/add-product', editing: false, hasError: true, errorMessage: 'Operation failed, please try again', product: {title: title, imageUrl: imageUrl, price: price, description: description}, validationErrors: [] });
      //  res.redirect('/500');
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req,res,next) =>{
    const prodId = req.params.productId;
    if(!ObjectId.isValid(prodId)){ //check if a string can be casted to objectId or not
        req.flash('error','Product Not Found');
        return res.redirect('/');
    }
    Product.findById(prodId)
    .then(product => {
        if(!product){
            req.flash('error','Product Not Found');
            return res.redirect('/');
        }
        res.render('admin/edit-product',{pageTitle:'Edit Product', path:'', editing: true, hasError: false, errorMessage: null, product: product, validationErrors: [] });
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};

exports.postEditProduct = (req,res,next) =>{
    //fetch information for the product

    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedDescription = req.body.description;
    const updatedPrice = req.body.price;
    const image = req.file;   

    const errors = validationResult(req);    
    if(!errors.isEmpty()){
        return res.status(422).render('admin/edit-product',{pageTitle:'Add Product', path:'/admin/add-product', editing: true, hasError: true, errorMessage: errors.array()[0].msg, product: {_id: prodId, title: updatedTitle, price: updatedPrice, description: updatedDescription}, validationErrors: errors.array() });
    } 
    Product.findById(prodId)
    .then(product => {
        if(product.userId.toString() !== req.user._id.toString())
        { //[authorization protection] that means wrong user try to edit the product
            return res.redirect('/');
        }
        //product here is not just a js object with data, but we will have a full mongoose object here with all mongoose methods
        //when we call save on existing document, it will not be saved as a new one, but the changes will be updated 
        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDescription;
        if(image){
            //fire and forget manner, i don't care about result
            fileHelper.deleteFile(product.imageUrl); // i will fire this function then continue (will not wait (async task));
            product.imageUrl = image.path;
        }
        return product.save()
                .then(() => {
                    res.redirect('/admin/products'); // i should send response after the promise done to make sure that element is already updated before display it to the user or the user will still see the old product
                })
                .catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);  
                });
    }) 
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};

exports.getProducts = (req,res,next) =>{
    //populate allows you to tell mongoose to populate a certian field
    // with all the detailed information and not just the id
    //find products that created by the currently logged in user
    let page = +req.query.page || 1;  // the + to convert string to int
    let totalItems; 
    Product.find({userId: req.user._id}).countDocuments()
    .then(numProducts => {
        totalItems = numProducts;
        return Product.find({userId: req.user._id}).populate('userId','email').skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    })
    .then( products => {
        console.log("======== in Admin/getProducts Middleware =======");
        console.log(products);
        console.log("================================================");
        res.render('admin/product-list', { prods: products, pageTitle:'Admin Products',path : '/admin/products', currentPage: page, hasNextPage: totalItems > ITEMS_PER_PAGE * page , hasPreviousPage: page > 1, nextPage: page + 1, previousPage: page - 1, lastPage: Math.ceil(totalItems/ ITEMS_PER_PAGE)});
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};


exports.deleteProduct = (req,res,next) => {
    const productId = req.params.productId;
    // findByIdAndRemove: mongoose method that can delete a document using it's id 
    // Product.findByIdAndRemove(productId).then().catch()
    
    // i used deleteOne instead of findByIdAndRemove for authorization purpose, to delete the product if the id of the product matches the desired id + this product has to be created by the currently logged in user
    Product.findById(productId)
    .then(product => {
        if(!product){
            return next(new Error('Product not found.'));
        } 
        console.log(path.join(rootDir,product.imageUrl));
        fileHelper.deleteFile(path.join(rootDir,product.imageUrl));
        return Product.deleteOne({_id:productId, userId: req.user._id});
    })
    .then(() =>{
        return req.user.removeFromCart(productId);
    })
    .then(() => {
        res.status(200).json({message: 'Success!'});
       // res.redirect('/admin/products');
    })
    .catch(err => {
        // const error = new Error(err);
        // error.httpStatusCode = 500;
        // return next(error);  
        res.status(500).json({message: 'Deleting product faild.'});
    });
};
