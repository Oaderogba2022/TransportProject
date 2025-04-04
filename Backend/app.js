const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const transitRoutes = require('./routes/transit');

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'my secret', resave: false, saveUninitialized: false }));
app.use('/', transitRoutes);

mongoose.set('strictQuery', true);
// Using MongoDB Atlas (replace with your connection string)
mongoose.connect('mongodb://127.0.0.1:27017/db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    app.listen(3010, () => console.log('Server running on port 3010'));
  })
  .catch(err => {
    console.log('Mongoose connection error:', err);
  });

