const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let  _db;

const mongoConnect = (callback) => {
    MongoClient.connect('mongodb+srv://SeifAhmed:seif9517535@cluster0.agaemyt.mongodb.net/shop?retryWrites=true&w=majority&appName=Cluster0') // the url here is the url you have in the connect model on the mongodb atlas cluster page 
    .then(client => {
        console.log('Connected!');
        _db = client.db('shop'); // store a connection to the database named shop
        callback();
    })
    .catch(err => {
        console.log(err);
        throw err;
    });
}

const getDb = () =>{
    if(_db){
        return _db;
    }
    throw 'No Database Found!';
}
exports.mongoConnect = mongoConnect;
exports.getDb = getDb; 