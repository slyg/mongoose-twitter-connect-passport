// loading dependencies
var
	express = require('express'),
	cons = require('consolidate'),
	swig = require('swig'),
	mongoose = require('mongoose')
	passport = require('passport')
	util = require('util')
	TwitterStrategy = require('passport-twitter').Strategy
	Schema = mongoose.Schema
;

// creating app
var app = express();

// setting user model schema
var UserSchema = new Schema({
  provider: String,
  uid: String,
  name: String,
  image: String,
  created: {type: Date, default: Date.now}
});

// connecting to mongodb
mongoose.connect('mongodb://localhost/twitter-mongo');
mongoose.connection.on('error', function (err) {
        console.error('MongoDB error: ' + err.message);
        console.error('Make sure a mongoDB server is running and accessible by this application')
});

// assigning User document schema
mongoose.model('User', UserSchema);
var User = mongoose.model('User');

// twitter credencials
var TWITTER_CONSUMER_KEY = "cEEX9ZxFerB7SeGPhx3Hcw";
var TWITTER_CONSUMER_SECRET = "0sRjUGPdQQjcreGQvvk7KxmnaDTuSMb39E7QZod0TA";

// twitter strategy middleware /!\ using local.host domain for twitter testing
passport.use(new TwitterStrategy({
    consumerKey: TWITTER_CONSUMER_KEY,
    consumerSecret: TWITTER_CONSUMER_SECRET,
    callbackURL: "http://local.host:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    User.findOne({uid: profile.id}, function(err, user) {
      if(user) {
	console.log('known user');
	console.log(user);
        done(null, user);
      } else {
	console.log('unknown user, creating a new one');
        var user = new User();
        user.provider = "twitter";
        user.uid = profile.id;
        user.name = profile.displayName;
        user.image = profile._json.profile_image_url;
        user.save(function(err) {
          if(err) { throw err; }
	  console.log('created new user');
	  console.log(user);
          done(null, user);
        });
      }
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.uid);
});

passport.deserializeUser(function(uid, done) {
  User.findOne({uid: uid}, function (err, user) {
    done(err, user);
  });
});

// configure Express
app.configure(function() {
	app.set('views', __dirname + '/views');
	app.engine('html', cons.swig);
	app.use(express.logger());
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({ secret: 'keyboard cat' }));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	swig.init({ root: __dirname + '/views', allowErrors: true, cache: false });
});

// routing
app.get('/', ensureAuthenticated, function(req, res){
  	res.redirect('/home');
});

app.get('/home', ensureAuthenticated, function(req, res){
	res.render('home.html', { user: req.user });
});

app.get('/login', function(req, res){
        res.render('login.html', { user: req.user });
});

app.get('/auth/twitter',
  passport.authenticate('twitter'),
  function(req, res){
    // The request will be redirected to Twitter for authentication, so this
    // function will not be called.
  });

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/home');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(3000);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}
