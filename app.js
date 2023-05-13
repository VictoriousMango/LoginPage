require('dotenv').config();
const ejs = require('ejs');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const googleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const Cryptojs = require('crypto-js')


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://addityamishra20:addityamishra20@cluster0.ldmnlql.mongodb.net/");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String,
    name: String,
    profile: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
      done(err, user);
    });
});

passport.use(new googleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"

 },
  function(accessToken, refreshToken, profile, cb){
    User.findOrCreate({googleId: profile.id, name: profile.displayName, email: profile.emails[0].value}, function(err,user){
      return cb(err, user);
    });
 }
));


app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate('google', {scope: ["profile", "email"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', {failureRedirect:"/login"}),
  function(req,res){
  res.redirect("/secrets");
  
});
                                  

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({ "secret":{$ne:null}}, function(err, foundUsers) {
        if(err){
            console.log(err);
        }else{
             if(foundUsers){
            res.render("secrets",{usersWithSecrets:foundUsers, Cryptojs: Cryptojs})
             }
        }
    });
});


app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
      res.render("submit");
    }else{
        res.redirect("/login");
   }
});

app.post("/submit",function(req,res){

    const submittedSecret=req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id,function(err,foundUser){
      if(err){
        console.log(err);
      }else{
         if(foundUser) {
          foundUser.secret=submittedSecret;
          foundUser.save(function(){
            res.redirect("/secrets");
          });
         }
      }
    });
});                  

app.get("/logout", function(req, res){
   req.logout();
   res.redirect("/"); 
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("loacl")(req, res, function(){
                res.redirect("/secrets")
            });
        }
    });
});

app.post("/login", function(req, res){
    
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000, function(){
    console.log("server has started on port 3000");
});