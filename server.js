const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', { useNewUrlParser: true })
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: String,
  userID: String,
  exercises: [{description: String, duration: Number, date: Date}]
});

const User = mongoose.model('User', userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))

const makeUser = function(username) {
  
  const user = new User({username: username, userID: shortid.generate(), exercises: []})
  
  user.save()
  return user;
  
}


app.post('/api/exercise/new-User', function(req, res) {
  let username = req.body.username;
  console.log(username);
  let user = makeUser(username);
  res.json({'username': user.username, 'id': user.userID});
});

app.get('/api/exercise/users', async function(req, res) {
  let docs = await User.find({}).exec()
  res.json(docs)
});

app.post('/api/exercise/add', async function(req, res) {
  //console.log(req.body.userId)
  let user = await User.findOne({userID: req.body.userId});

  if (req.body.date) {
    user.exercises.push({description: req.body.description, duration: req.body.duration, date: req.body.date})
    user.exercises = user.exercises.sort((a, b) => {
      let date1 = new Date(a.date);
      let date2 = new Date(b.date);
      return date2 - date1
    })
  } else {
    let date = new Date();
    user.exercises.push({description: req.body.description, duration: req.body.duration, date: date})
    user.exercises = user.exercises.sort((a, b) => {
      let date1 = new Date(a.date);
      let date2 = new Date(b.date);
      return date2 - date1
    })
    
  }

  user.markModified('exercises');
  user.save();
  res.json(user);
});

app.get('/api/exercise/log', async function (req, res) {

  let user = await User.findOne({userID: req.query.userId});

  if (req.query.limit !== undefined) {
  
    let exercises = user.exercises.slice(0, req.query.limit);

    res.json(exercises)
  } else if (req.query.from !== undefined) {
  
    let date1 = new Date(req.query.from);
    let date2 = new Date(req.query.to);

    let exercises = user.exercises.filter((exercise) => {
      let date3 = new Date(exercise.date);
     
      return date3 > date1 && exercise.date < date2
        
      
    })
    res.json(exercises)
  } else if (req.query.from === undefined && req.query.limit === undefined) {
    res.json(user.exercises)
  } 
  
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
