const Product = require('../models/product');
const Order = require('../models/order');
const {ObjectId} = require('mongodb');
const fs = require('fs');
const rootDir = require('../util/path');
const path = require('path');
const PDFDocument = require('pdfkit');
const product = require('../models/product');

const ITEMS_PER_PAGE = 2;
const setPdfStyling = (pdfDoc, order) => {
    pdfDoc.font('Times-Roman').fontSize(26).text('Invoice', {underline: true, continued: true});
    
    const currentDateAndTime = new Date();

    // Format the date (e.g., "August 14, 2024")
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = currentDateAndTime.toLocaleDateString('en-US', dateOptions);

    // Format the time (e.g., "10:30 AM")
    const timeOptions = { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true };
    const formattedTime = currentDateAndTime.toLocaleTimeString('en-US', timeOptions);
    pdfDoc.fontSize(18).text('Order Id: ', 262,80,{underline: false, continued: true});
    pdfDoc.fontSize(16).text('#'+ order._id);
    pdfDoc.fontSize(18).text('Date: ', 340, 100, {continued: true});
    pdfDoc.fontSize(16).text(formattedDate);
    pdfDoc.fontSize(18).text('Time: ', 340, 120, {continued: true});
    pdfDoc.fontSize(16).text(formattedTime);

    pdfDoc.fontSize(23).text('Details',100,170);
    pdfDoc.fontSize(20).text('-------------------------------------------------------');
    pdfDoc.text("Title".padEnd(25) + "Quantity".padEnd(25) + "Price".padEnd(15));
    pdfDoc.text('-------------------------------------------------------');
    pdfDoc.fontSize(17);

    let totalPrice = 0;
    order.items.forEach(item => {
        totalPrice +=  item.product.price * item.quantity;
        pdfDoc.text(item.product.title.padEnd(33) + item.quantity.toString().padEnd(30) + '$' + item.product.price.toString().padEnd(20));
    });
    pdfDoc.fontSize(20).text('-------------------------------------------------------');
    pdfDoc.text(' ');
    pdfDoc.text('Total Price: $' + totalPrice);
} ;

exports.getProducts = (req,res,next) =>{
    let page = +req.query.page || 1;  // the + to convert string to int
    let totalItems; 
    Product.find().countDocuments()
    .then(numProducts => {
        totalItems = numProducts;
        return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    })
    .then( products => {
        res.render('shop/product-list', { prods: products, pageTitle:'All Products',path : '/products',  currentPage: page, hasNextPage: totalItems > ITEMS_PER_PAGE * page , hasPreviousPage: page > 1, nextPage: page + 1, previousPage: page - 1, lastPage: Math.ceil(totalItems/ ITEMS_PER_PAGE)});
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};

exports.getProduct = (req,res,next) =>{
    const prodId = req.params.productId;
    if(!ObjectId.isValid(prodId)){ //check if a string can be casted to objectId or not
        req.flash('error','Product Not Found');
        return res.redirect('/');
    }
    //findById is a mongoose method, it can take a string and convert it to ObjectId internally
    Product.findById(prodId).then( product => {
        if(!product){
            req.flash('error','Product Not Found');
            return res.redirect('/');
        }
        res.render('shop/product-detail',{product: product, pageTitle: product.title, path: '/products'});
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};

/*
note: 
    find() is a mongoose method that return a query object which allows you to build up your query using methods like skip(), limit(), populate() so i can chain more methods like skip(), limit(), populate()
    you’re modifying this query object(same object). The query hasn’t been sent to the database yet; you’re just building the query.
    and when i call then, mongoose will create a promise and after this it will call then method on that promise  
    it's just like Product.find().skip().limit().exec().then ===> queryObjecy.exec().then() ==> promise.then() ,
    so exec is the function which execute that quary and make a promise and return it, but if i didn't call exec, mongoose do the same behavior
*/ 
exports.getIndex = (req,res,next) =>{
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    } else {
        message = null;
    }
    // if req.query.page undefined then i will use value 1 instead
    let page = +req.query.page || 1;  // the + to convert string to int
    let totalItems; 
    Product.find().countDocuments()
    .then(numProducts => {
        totalItems = numProducts;
        return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    })
    .then( products => {
        res.render('shop/index', { prods: products, pageTitle:'Shop',path : '/', errorMessage: message, currentPage: page, hasNextPage: totalItems > ITEMS_PER_PAGE * page , hasPreviousPage: page > 1, nextPage: page + 1, previousPage: page - 1, lastPage: Math.ceil(totalItems/ ITEMS_PER_PAGE)});
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
}; 


exports.getCart = (req,res,next) =>{
    /*  in populate('cart.productId') here 'cart.productId' is a nested property cause cart is the property and it has
        products, each product has productId and quantity so i populate the productId for each product which means: 
        each object in the cart array has:
                    productId: new ObjectId('66b124889f131719dee57a66)
                    quantity : 1 
        instead of that we populate the productId which means it will refer to an object that holds all info about products 
        so each object in the cart array will have:
                    productId: {_id: new ObjectId('66b124889f131719dee57a66),
                                title: 'book1',
                                price: 15 , 
                                ...}
                    quantity: 1            
    */
    req.user.populate('cart.productId')   
    .then(user => {
        console.log("============== in getCart Middleware ==============");
        console.log(user.cart);
        console.log("================================================");
        res.render('shop/cart', {pageTitle:'Your Cart', cart: user.cart, path : '/cart'});
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};

exports.postCart = (req,res,next) =>{
    const prodId = req.body.productId;
    Product.findById(prodId)
    .then(product => {
        //this will work because we added this method to the user object in our user model
        return req.user.addToCart(product);
    })
    .then(result =>{
        console.log("post cart   ",result);
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};

exports.postCardDeleteProduct = (req,res,next)=>{
    const prodId = req.body.productId;
    req.user.removeFromCart(prodId)
    .then(result => {
        console.log("after deleting   ",result);
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};


exports.getOrder = (req,res,next) =>{
    Order.find({'user.userId': req.user._id})
    .then(orders => {
        console.log("============== in getOrder Middleware ==============");
        console.log(orders);
        console.log("================================================");
        res.render('shop/orders', {pageTitle:'Your Orders',path : '/orders', orders: orders});
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};

exports.postOrder = (req,res,next) =>{
    req.user.populate('cart.productId')   
    .then(user => {
        /*
            note: 
               1) we can't just make product: cartItem.productId because we defined 'product' in orderSchem just an object (could be any object)
                  so cartItem.productId is the product object itself, but 'product' will just have the ObjectId(i mean _id)
                  it's same like   user:{name:req.user.name, userId: req.user},
                  here req.user is the whole user, but when we do this userId will just have the _id from the req.user
                  i think this behavior happens because in the cart array, productId attribute is just an ObjectId if we didn't do populate

               2) cartItem.productId will be an object with a lot of metadata attached to it, even though we can't directly
                  see that when console.log(cartItem.productId), but with _doc we get really access to just the data that's in there
                  and then with spread operator inside of a new object we pull out all the data in that document we retrieved and 
                  srore it in a new object which we save here as a product
                    
               3) we could make product: cartItem.productId if we defined the product in orderSchema in detail like:
                    product: {
                        _id : {type:Schema.Types.ObjectId, required: true },
                        title: {type: String, required: true},
                        price: {type: Number, required: true},
                        description: {type: String, required: true},
                        imageUrl: {type: String, required: true},
                        userId: {type: Schema.Types.ObjectId, ref: 'User', required: true} 
                    }
        */
        const items = user.cart.map(cartItem => {
            return {product: {...cartItem.productId._doc} , quantity: cartItem.quantity}
        });
        const order = new Order({
            user:{email:req.user.email, userId: req.user._id},
            items: items,
        });
        return order.save();
    }).then(() => {
        req.user.cart = [];
        req.user.save();
    })
    .then(() => {
        res.redirect('/orders');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};


exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    if(!ObjectId.isValid(orderId)){ //check if a string can be casted to objectId or not
        req.flash('error','Order Not Found');
        return res.redirect('/');
    }
    Order.findById(orderId) //[adding authorization]: the user who make that order is the one who can download it.
    .then(order => {
        if(!order){
            return next(new Error('No order found.'));
        }
        if(order.user.userId.toString() !== req.user._id.toString()){ //check if the userId assossicated with that order is the same of currently loggedIn user
            req.flash('error','Order Not Found');
            return res.redirect('/');
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join(rootDir,'data','invoices',invoiceName);
       
        const pdfDoc = new PDFDocument();
        res.setHeader('content-Type','application/pdf');
        res.setHeader('content-Disposition','inline; filename = "' + invoiceName + '"');
        //stream the file generated on the file to fileSystem and the response
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        setPdfStyling(pdfDoc, order);

        pdfDoc.end();
        /************************************** Preloading Data (Not recommended) **************************************/
        // fs.readFile(invoicePath, (err, fileContent) => {
        //     if(err){
        //         return next(err);
        //     }
        //     res.setHeader('content-Type','application/pdf');
        //     res.setHeader('content-Disposition','attachment; filename = "' + invoiceName + '"');
        //     res.send(fileContent);
        // });
        /********* The Recommended way of getting your file data especially for bigger files (Streaming data) **********/
        // const file = fs.createReadStream(invoicePath);
        // res.setHeader('content-Type','application/pdf');
        // res.setHeader('content-Disposition','attachment; filename = "' + invoiceName + '"');
        // file.pipe(res);
    })
    .catch(err =>next(err));
    
};
