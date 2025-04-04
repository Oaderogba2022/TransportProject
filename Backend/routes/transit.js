const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch'); 

const Schema = mongoose.Schema;

const routeSchema = new Schema({
  name: { type: String, required: true },
  stop: { type: String, required: true },
  routeId: { type: String, required: true },
  schedule: { type: Array, required: false },
  userEmail: { type: String, required: true }, 
});

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Route = mongoose.model('route', routeSchema);
const User = mongoose.model('user', userSchema);

let nextRouteId = 0;

const checkAuth = (req, res, next) => {
  if (!req.session.loggedIn) {
    res.json({ success: false, message: 'Please sign in to access this route' });
  } else {
    next();
  }
};

// Register a new user
router.post('/register', (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email })
    .then(existingUser => {
      if (existingUser) throw new Error('Email already registered');
      return bcrypt.hash(password, 10);
    })
    .then(hashedPassword => {
      const newUser = new User({ email, password: hashedPassword });
      return newUser.save();
    })
    .then(savedUser => {
      res.json({ success: true, message: 'User registered successfully' });
    })
    .catch(err => {
      console.log('Failed to register user:', err);
      res.json({ success: false, theError: err });
    });
});

// Sign in a user
router.post('/signin', (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email })
    .then(user => {
      if (!user) throw new Error('User not found');
      return bcrypt.compare(password, user.password).then(match => ({ match, user }));
    })
    .then(({ match, user }) => {
      if (!match) throw new Error('Invalid password');
      req.session.loggedIn = true;
      req.session.userEmail = user.email;
      return req.session.save();
    })
    .then(() => {
      res.json({ success: true, message: 'Signed in successfully' });
    })
    .catch(err => {
      console.log('Signin error:', err);
      res.json({ success: false, theError: err });
    });
});

// Sign out
router.post('/signout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log('Signout error:', err);
      res.json({ success: false, theError: err });
    } else {
      res.json({ success: true, message: 'Signed out successfully' });
    }
  });
});

router.post('/addRoute', checkAuth, (req, res) => {
  const { name, stop } = req.body;
  const routeId = 'R' + nextRouteId++;
  const userEmail = req.session.userEmail;

  fetch(`https://transit.land/api/v2/rest/stops?stop_name=${stop}`, {
    headers: { 'apikey': 'YOUR_TRANSITLAND_API_KEY' },
  })
    .then(apiRes => apiRes.json())
    .then(transitData => {
      const schedule = transitData.stops?.[0]?.schedule || [];
      const newRoute = new Route({ name, stop, routeId, schedule, userEmail });
      return newRoute.save();
    })
    .then(savedRoute => {
      res.json({ success: true, theRoute: savedRoute });
    })
    .catch(err => {
      console.log('Failed to add route:', err);
      res.json({ success: false, theError: err });
    });
});

// Fetch all routes for the signed-in user (protected)
router.post('/', checkAuth, (req, res) => {
  Route.find({ userEmail: req.session.userEmail })
    .then(routes => {
      res.json({ success: true, Routes: routes });
    })
    .catch(err => {
      console.log('Failed to find routes:', err);
      res.json({ success: false, theError: err });
    });
});

router.post('/getSpecificRoute', checkAuth, (req, res) => {
  Route.findOne({ routeId: req.body.routeId, userEmail: req.session.userEmail })
    .then(route => {
      if (!route) throw new Error('Route not found or not owned by user');
      res.json({ success: true, theRoute: route });
    })
    .catch(err => {
      console.log('Failed to find route:', err);
      res.json({ success: false, theError: err });
    });
});

router.post('/updateSpecificRoute', checkAuth, (req, res) => {
  Route.findOne({ routeId: req.body.routeId, userEmail: req.session.userEmail })
    .then(route => {
      if (!route) throw new Error('Route not found or not owned by user');
      route.name = req.body.name;
      route.stop = req.body.stop;
      return route.save();
    })
    .then(updatedRoute => {
      res.json({ success: true, theRoute: updatedRoute });
    })
    .catch(err => {
      console.log('Failed to update route:', err);
      res.json({ success: false, theError: err });
    });
});

// Delete specific route (protected)
router.post('/deleteSpecificRoute', checkAuth, (req, res) => {
  Route.findOneAndRemove({ routeId: req.body.routeId, userEmail: req.session.userEmail })
    .then(() => {
      res.json({ success: true });
    })
    .catch(err => {
      console.log('Failed to delete route:', err);
      res.json({ success: false, theError: err });
    });
});

exports.routes = router;