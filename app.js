const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const errorController = require('./controllers/error');
const User = require('./models/user');


const MONGODB_URL = 'mongodb+srv://SeifAhmed:seif9517535@cluster0.agaemyt.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
const app = express();
const store = new MongoDBStore({
    uri: MONGODB_URL, // the url of the database i will connect the session to
    collection: 'sessions' // you need to define the collection where the sessions will be stored
});
const csrfProection = csrf(); 

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'images'); // directory where images will be stored
    },
    filename: (req, file, cb) => {
      cb(null, new Date().toISOString().replaceAll(':', '-') + '_' + file.originalname); // unique filename
    }
  });
const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
        cb(null, true);
    } else {
        cb(null,false);
    }
};

app.set('view engine','ejs');
app.set('views','views');

app.use(bodyParser.urlencoded({extended: false}));
app.use(multer({storage:fileStorage, fileFilter: fileFilter}).single('image'));
app.use(express.static(path.join(__dirname,'public')));
app.use('/images',express.static(path.join(__dirname,'images')));
app.use(session({secret: 'my secret', resave: false, saveUninitialized: false, store: store}));
app.use(csrfProection);  //should be registerd after session middleware
app.use(flash()); //should be registerd after session middleware

//attributes to be sent to all views file
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
});

//find the user that logged in and fetch his data to get a mongoose object
app.use((req, res, next)=>{
    /*
       in here we don't want to store anything in the session because the session is already something
       which will be managed for us automatically and for the incoming requests, 
       we register the middleware session, and the middleware session will then basically look for a session cookie,
       if it finds one it will look for a fitting session in the database and load the data from there
       so by the time we reach this middleware, we will have our session data loaded
       this means that now we just want to use that session data to load our real user, to create our mongoose object
       so we will create a user object(mongoose object) based on data stored in the session,
       and this mongoose object will only live for that request, but it's fueled by data from the session andn therefore
       it also survives across requests you could say.
       we need to do this because we need a mongoose object to work with
       because the data we store in the session storage in mongodb there, we retrieve it as just a plain data not as a
       mongoose object with all the cool methods mongoose gives us and that is why we get this error regarding add to cart
       not being found and so on. 
    */
    if (!req.session.user){ //this check because if the user loggedout there will not be an existing session
        return next();
    }
    User.findById(req.session.user._id)
    .then(user => {
        if(!user){ // we might still not find that user even if we have it, stored in a session
                   // maybe because the user was deleted in a database in between
            throw new Error('user not found');
        }
        console.log("============== in User Middleware ==============");
        console.log("LoggedIn status:   ",req.session.isLoggedIn);
        console.log("my user is:  ");
        console.log(user); // note: user here is a mongoose object that has the data + some methods from mongoose
        console.log("================================================");
        req.user = user;
       next();
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    }); // this catch block will not fired if i don't find the user with this id
        // it will only fire if there are any technical issues you could say,
        // if the database is down or if the user of this app doesn't have sufficient permisions to execute this action 
});

app.use('/admin',adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use('/500',errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
    res.status(500).render('500',{pageTitle:'Error!', path:''});
})

mongoose.connect(MONGODB_URL)
.then(() => {
    app.listen(3000);
})
.catch(err => console.log(err));
