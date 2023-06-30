const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');


// console.log(process.env.DB_PASS)
// create token : node > require('crypto').randomBytes(64).toString('hex')
// console.log(process.env.JWT_TOKEN)

// middleware
app.use(cors());
app.use(express.json())

// middleware: JWT verify token from client request
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'headers error: nauthorized access' })
  }
  // token received from client which is store in localstorage
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ err: true, message: 'verified error: unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

// connect driver MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgnfmcl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const run = async () => {
  try {
    await client.connect();

    // ******************** start custome code from here ************************
    const usersCollection = client.db('adminPanelDB').collection('users');

    // JWT
    // token request from AuthProvider.jsx
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: '5h' });
      res.send({ token })
    })

    // create DB & store all users 
    // from Register.jsx & SocialLogin.jsx
    app.post('/users', async (req, res) => {
      const user = req.body;
      // const query = {email: user.email}
      // const existingUser = await usersCollection.findOne(query)
      // if(existingUser) return res.send({ message: 'user already exist' });
      if (await usersCollection.findOne({ email: user.email }))
        return res.send({ message: '[ SERVER ] User Already Exist. Void Save to Database' });
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })





    // display users info in UI from 
    // from ManageUsers.jsx
    // req.query.email = axiosSecure.get(`/users?email=${user?.email}`)
    app.get('/users', verifyJWT, async (req, res) => {
      const userEmail = req.query.email; console.log('user:', userEmail)
      const decodedEmail = req.decoded.email; console.log('decoded:', decodedEmail)

      if (userEmail !== decodedEmail || req.decoded.expiresIn === true) {
        return res.status(403).send({ error: true, message: 'forbidden. other users data can not access' })
      } else {
        const result = await usersCollection.find().toArray();
        res.send(result)
      }
    })







    // update user info. become an Admin
    // from Manageusers.jsx
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateUser = {
        $set: { role: 'admin' }
      }
      const result = usersCollection.updateOne(filter, updateUser);
      res.send(result)
    })

    // delete user from ManageUser.jsx
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    // ping success to mongoDB
    await client.db("admin").command({ ping: 1 });
    console.log("Admin Panel Server is successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// testing serve setup
app.get('/', (req, res) => {
  res.send('Admin Panel Server is Running')
})

app.listen(port, () => {
  console.log(`Admin Panel Server is Running on port: ${port}`)
})