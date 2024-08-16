const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {type: String, required: true},
    password: {type: String, required: true},
    resetToken: String,
    resetTokenExpiration: Date,
    //Schema.Types ---> it has the special types like ObjectId, and i choose ObjectId because i will store a reference to a product
      cart: [{ productId: {type: Schema.Types.ObjectId, ref: 'Product' ,required: true},
              quantity: {type: Number, required: true} 
            }]
});

/*
    notes: 
       1) methods key : is a object that allow you to add your methods

       2) this will be called on a real instance based on that schema 
          so really on an object which will have a populated cart with either an empty array
          or an array with items in there.

       3) i have to use a function with keyword function not arrow function, to let this still refer to the schema
*/ 
userSchema.methods.addToCart = function(product){
    const cartProductIndex = this.cart.findIndex(cartP => cartP.productId.toString() === product._id.toString()); // we can't compare object with another by === because it will compare the references ( address to first object === adddress to second object) so we convert them to strings first
    let newQuantity = 1;
    const updatedCart = [...this.cart]; 
    if(cartProductIndex != -1){
       newQuantity = this.cart[cartProductIndex].quantity + 1;
       updatedCart[cartProductIndex].quantity = newQuantity;
    } else {
        // this is a reference relation because we only store the id of the product not it's all information
        // because if we duplicate all data we have to change it in many places, for ex
        // if price changes, we can't show to the user the old price
        /*
            note:
                productId and quantity: this is the names i used in the schema definition, so i have to use them here with the same names
        */ 
        updatedCart.push({productId : product._id, quantity : newQuantity})
    }
    this.cart = updatedCart; 
    return this.save();
};

userSchema.methods.removeFromCart = function(prodId){
    //filter method: will return new array
    const updatedCart = this.cart.filter(cartProduct => cartProduct.productId.toString() !== prodId);
    this.cart = updatedCart
    return this.save();
};

module.exports = mongoose.model('User',userSchema);

