const express = require("express");
const cors = require ('cors');
const jwt = require ('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();


app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ucgjw.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
       
        if (err) {
            
            return res.status(403).send({ message: 'Forbidden access' })
        }
        // console.log(decoded)
        req.decoded = decoded;
        next();
    });
}


async function run(){
  
    try{


        await client.connect();
        const productCollection = client.db('autoMart').collection('products');
        const orderCollection = client.db('autoMart').collection('orders');
        const userCollection = client.db('autoMart').collection('user');
        const partsCollection = client.db('autoMart').collection('parts');



        
        app.get('/product', async(req,res)=>{
                        
        const query = {};
        const cursor = productCollection.find(query);
        const products = await cursor.toArray();
        res.send(products);
        });

        
        app.post('/product',  async (req, res) => {
            const products = req.body;
            const result = await productCollection.insertOne(products);
            res.send(result);
        });

        app.get('/product/:id', async(req,res)=>{
            const id =req.params.id;
            const query={_id: ObjectId(id)};
            const product =await productCollection.findOne(query);
            res.send(product);
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const user = await userCollection.find().toArray();
            res.send(user);
        })


        app.get('/admin/:email', async(req,res) => {
            const email = req.params.email;
            const user =await userCollection.findOne({email:email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin})
        })



        app.put('/user/admin/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester =req.decoded.email;
            const requetserAccount = await userCollection.findOne({email:requester});
            if(requetserAccount.role === 'admin'){

                const filter = { email: email };
                const updateDoc = {
                    $set: {role:'admin'},
                }
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else{
                res.status(403).send({message:'forbidden'});
            }



        })


        app.get('/user/:email', async(req,res) => {
            const email = req.params.email;
            const users =await userCollection.findOne({email:email});
            const isUsers = users.role === 'users';
            res.send({users: isUsers})
        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });

        })

     
          
        app.get('/orders', verifyJWT, async(req, res)=>{
            const email = req.query.email;
         const decodedEmail = req.decoded.email;
         if(email === decodedEmail){
            const query = {email:email};
            const myOrders = await orderCollection.find(query).toArray();
           return res.send(myOrders)
         }
         else{
             return res.status(403).send({message:'forbidden access'});
         }
        })

        app.post('/orders', async (req, res) => {

            const orders = req.body;
            const result = await orderCollection.insertOne(orders);
            res.send(result)
        })

        // getting all orders according to individual email address 
        app.get('/orders', async (req, res) => {

            const email = req.query.email
            const query = { email: email }
            const cursor = orderCollection.find(query)
            const myOrders = await cursor.toArray()
            res.send(myOrders);
        })


        app.get('/parts', async (req, res) => {
            const parts = await partsCollection.find().toArray();
            res.send(parts);
        })


    }
    finally{

    }
}

run().catch(console.dir);





app.get('/',(req,res)=>{

    res.send('Running Auto Mart');
})
app.listen(port, () => {
    console.log('Listening to port',port);
})