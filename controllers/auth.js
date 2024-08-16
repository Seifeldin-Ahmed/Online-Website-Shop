const User = require('../models/user');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {validationResult} = require('express-validator');

const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const transport = nodemailer.createTransport(sendgridTransport({
    auth: {api_key: "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" }
}));


exports.getLogin = (req,res,next) =>{
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/login',{ path: '/login', pageTitle: 'Login', errorMessage: message, oldInput: {email: '', password: ''}, validationErrors: []});
};
exports.postLogin = (req,res,next) =>{
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/login',{ path: '/login', pageTitle: 'Login', errorMessage: errors.array()[0].msg, oldInput: {email: email, password: password}, validationErrors: errors.array()});
    }
    User.findOne({email:email})
    .then(user => {
        if(!user){ //if user not exist
            return res.status(422).render('auth/login',{ path: '/login', pageTitle: 'Login', errorMessage: 'Invalid email or password.', oldInput: {email:email, password: password}, validationErrors: [{path: 'email'},{path: 'password'}]});
        }
        bcrypt.compare(password, user.password)
        .then(doMatch =>{
            if(doMatch){
                /*
                    note: (read also the notes at the end of the file)
                        here i do set my session and when i then redirect, when i send a response,
                        the session middleware goes ahead and creates that session and that means it writes
                        it to mongodb because we use the mongodb session store and it sets the cookie.
                        Now the problem we can face here is writing that data to a database like mongodb can 
                        take a couple of milliseconds or depending on your speed even a bit more milliseconds.
                        The redirect is fired independent from that though, so you might redirect too early.
                        that's why we used save, to ensure that our session is created before we continue
                */
                req.session.user = user;    //store the user data in his session 
                req.session.isLoggedIn = true;
                req.session.save(err => { //cbf will be called after saving the session (async task)
                    res.redirect('/');
                });
            }
            else{
                return res.status(422).render('auth/login',{ path: '/login', pageTitle: 'Login', errorMessage: 'Invalid email or password.', oldInput: {email:email, password: password}, validationErrors: [{path: 'email'},{path: 'password'}]});
            }
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


exports.getSignup = (req,res,next) =>{
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/signup',{path: '/signup', pageTitle: 'Signup', errorMessage: message, oldInput: {email: '', password: '', confirmPassword: ''}, validationErrors: []});
};

exports.postSignup = (req,res,next) =>{
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log("========== Errors in signup =======");
        console.log(errors.array());
        console.log("===================================");
        return res.status(422).render('auth/signup',{path: '/signup', pageTitle: 'Signup', errorMessage: errors.array()[0].msg, oldInput: {email:email, password: password, confirmPassword: req.body.confirmPassword}, validationErrors: errors.array()});
    }
    bcrypt.hash(password,12)
    .then((hashedPassword => {
        const NewUser = new User({email: email, password: hashedPassword, cart: []});
        return NewUser.save();     
    }))
    .then(() => {
        res.redirect('/login');
        return transport.sendMail({
            to: email,
            from: 'seifeldenahmed123@gmail.com',
            subject: 'Signup Succeeded',
            html: '<h1>You successfully signup up!</h1>'
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
};


exports.postLogout = (req,res,next) =>{
    //clear session, the CBF will be called once it's done destroying the session
    req.session.destroy(err => {
        res.redirect('/');
    }); 
};


exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/reset',{ path: '/reset', pageTitle: 'Reset Password', errorMessage: message, oldInput: {email: ''}, validationErrors: [] });
};
exports.postReset = (req, res, next) =>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/reset',{ path: '/reset', pageTitle: 'Reset Password', errorMessage: errors.array()[0].msg, oldInput: {email: req.body.email}, validationErrors: errors.array() });
    }
    crypto.randomBytes(32, (err, buffer)=>{
        if(err){
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
        .then(user => {
            if(!user){
              //  req.flash('error','No account with that email found.');
               // return res.redirect('/reset');
                return res.status(422).render('auth/reset',{ path: '/reset', pageTitle: 'Reset Password', errorMessage: 'Invalid email or password.', oldInput: {email: req.body.email}, validationErrors: [{path: 'email'}] });
            }
            user.resetToken = token;
            //Data.now(): gives me the current date and the time and this token will be expired after one hour, but the hour has to be in milliseconds which is 3 600 000
            user.resetTokenExpiration = Date.now() + 3600000;
            return user.save();
        })
        .then(result => {
            res.redirect('/');
            return transport.sendMail({
                to: req.body.email,
                from: 'seifeldenahmed123@gmail.com',
                subject: 'Password reset',
                html: `
                <p>You requested a password rest </p>
                <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
                `
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);  
        });
    });
};


exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({resetToken:token, resetTokenExpiration: {$gt: Date.now()}})
    .then(user => {
        if(!user)
        {
            req.flash('error','session ended');
            return res.redirect('/reset');
        }
        let message = req.flash('error');
        if(message.length > 0){
            message = message[0];
        } else {
            message = null;
        }
        res.render('auth/new-password',{ path: '/new-password', pageTitle: 'New Password', errorMessage: message, oldInput: {password: ''} ,userId: user._id.toString(), passwordToken: token, validationErrors: []});
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });
}; 
exports.postNewPassword = ((req, res, next) =>{
    const password = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    console.log(password);
    let resetUser;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/new-password',{ path: '/new-password', pageTitle: 'New Password', errorMessage: errors.array()[0].msg, oldInput: {password: password}, validationErrors: errors.array(), userId: userId, passwordToken: passwordToken});
    }

    // 3 critria for search
    User.findOne({resetToken: passwordToken, resetTokenExpiration: {$gt: Date.now()}, _id: userId})
    .then(user => {
        resetUser = user;
        return bcrypt.hash(password,12);
    })
    .then(hashedPassword => {
        resetUser.password = hashedPassword;
        //note: undefined instead of null to not store anything in this variables in the database
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
    })
    .then(user => {
        res.redirect('/login');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);  
    });

});

/******************Sessions Notes part1  *********************
 * 

Middleware Order and Session Handling

    1) Session Middleware: When the session middleware runs at the beginning of the request, it loads the session data from the store (e.g., MongoDB) and attaches it to the req.session object.

    2) Your Custom Middleware: If your custom middleware runs after the session middleware, any changes you make to req.session during the request will modify the session object in memory for that request.

    3) End of Request Handling:
        After all the middleware and route handlers have run, the Express framework sends the response back to the client.
        At this point, the session middleware checks if the session data has changed (i.e., if req.session was modified).
        If changes were made, the session middleware automatically saves the updated session data back to the session store (e.g., MongoDB) at the end of the current request.


Summary of the Flow:
    Current Request: The session data is saved to the session store at the end of the current request if there were any changes. Your custom middleware can modify req.session, and those changes will be saved before the response is sent.
    Next Request: When the next request comes in, the session middleware will load the updated session data from the session store, reflecting any changes made during the previous request.

Key Points

Changes to req.session within a request are saved at the end of that same request.
The order of middleware matters for when changes are made, but the saving of session data happens after all middleware and route handlers have completed.
The session middleware manages saving automatically, so any modifications to req.session during the request will be persisted by the time the response is sent.
So, to directly answer your question: The changes you make to req.session in your custom middleware during the current request will be saved to the MongoDB store at the end of the current request, not the next one.
 
*/
/***************** Sessions Notes part2  *********************
 * 
 * 
 middleware actually has two main phases:
    
    A) Initialization Phase (at the beginning of the request):
        This is where the session middleware runs early in the middleware stack, typically near the start.
        In this phase, it reads the session ID from the request (if present) and loads the session data from the session store (e.g., MongoDB).
        The loaded session data is then attached to req.session, making it available for the rest of the request.
    
    B) Finalization Phase (at the end of the request):
        After all the middlewares and route handlers have been processed and just before the response is sent back to the client, the session middleware kicks in again.
        This finalization step isn’t a separate middleware call but is part of how Express manages the lifecycle of the request-response cycle.
        During this phase, the session middleware checks if req.session was modified. If it was, it saves the updated session data back to the session store.


Why This Works
    Session Middleware as a Lifecycle Manager: The session middleware is not just a single middleware function; it’s more like a lifecycle manager. It sets up the session at the beginning and finalizes any necessary actions (like saving changes) at the end.
    Express Design: Express is designed to let middleware manage aspects of the request and response lifecycle comprehensively. The session middleware’s finalization step is built into Express’s response-sending mechanism.


How to Think About It
    Session Initialization: Think of the session middleware’s initial role as “loading” or “preparing” the session data for use during the request.
    Session Finalization: Then, think of the session middleware’s final role as “finalizing” or “cleaning up” the session data by saving any changes made during the request.
    So, while it might seem like the session middleware's order has "passed," its final responsibilities are handled automatically as part of Express's built-in flow, ensuring that your session data is consistently updated and saved without requiring another explicit middleware call.
 * 
*/
