const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//please note: _id will be created behind the scene just like mongodb and will take value of ObjectId
// when i make a schema and connect it to a model --> this creates the collection
const productSchema = new Schema({
    title: {type: String, required: true},
    price: {type: Number, required: true},
    description: {type: String, required: true},
    imageUrl: {type: String, required: true},
    //special ref configuration: ref takes a string where we tell mongoose
    // which other mongoose model is actually retlated to the data in that field
    userId: {type: Schema.Types.ObjectId, ref: 'User', required: true} // our model named User , so i refered to it here with the same name
});

// models is a function and it's important for mongoose behind the scene to connect a schema to a name
module.exports = mongoose.model('Product',productSchema); // export Product model
