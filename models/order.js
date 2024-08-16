const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/*
    notes:
        1) type object because it will be a full embedded document
        2) type object is a bit of shortcut, of course we could define
           the full nested product with all properties like: 
                [{ product: {
                    _id : {type:Schema.Types.ObjectId, required: true },
                    title: {type: String, required: true},
                    price: {type: Number, required: true},
                    description: {type: String, required: true},
                    imageUrl: {type: String, required: true},
                    userId: {type: Schema.Types.ObjectId, ref: 'User', required: true} 
                   },
                   quantity: {type: Number, required: true} 
                }]
           but here we just say this is any object
*/ 
const orderSchema = new Schema({
    user: {email: {type: String, required: true},
           userId: {type: Schema.Types.ObjectId, ref:'User',required: true}},
    items: [{ product: {type: Object ,required: true},
              quantity: {type: Number, required: true} 
            }]
});

module.exports = mongoose.model('Order',orderSchema);
