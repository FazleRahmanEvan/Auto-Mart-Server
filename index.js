const express = require("express");
const cors = require ('cors');
const jwt = require ('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;




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
        const reviewCollection = client.db('autoMart').collection('reviews');
        const paymentCollection = client.db('autoMart').collection('payments');



        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccout = await userCollection.findOne({ email: requester });
            if (requesterAccout.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }

        }

        
        app.get('/product', async(req,res)=>{
                        
        const query = {};
        const cursor = productCollection.find(query);
        const products = await cursor.toArray();
        res.send(products);
        });
        
        app.get('/product/add', async (req, res) => {
            const parts = await partsCollection.find().toArray();
            res.send(parts);
        })
        
        app.post('/product',verifyJWT,verifyAdmin,  async (req, res) => {
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


        app.delete('/product/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        });


        app.post('/review', async (req, res) => {
            const query = req.body;
            const review = await reviewCollection.insertOne(query);
            res.send(review);
        });

      
        app.get('/review', async (req, res) => {
            const query = {};
            const review = await reviewCollection.find(query).toArray();
            res.send(review);

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



        app.put('/user/admin/:email',verifyJWT,verifyAdmin, async (req, res) => {
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

    //     const query = req.body;
    //     const country = await countryCollection.insertOne(query);
    //     res.send(country);
    // });

        app.post('/create-payment-intent',verifyJWT, async(req,res)=>{
            const product = req.body;
            const price = product.price;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount : amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({clientSecret:paymentIntent.client_secret})
        })



        app.patch('/orders/:id', verifyJWT, async(req, res) =>{
            const id  = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            }
      
            const result = await paymentCollection.insertOne(payment);
            const updatedOrders = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedOrders);
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


        app.get('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        })

        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const result = await orderCollection.insertOne(orders);
            res.send(result)
        })

      
        app.get('/orders', async (req, res) => {

            const email = req.query.email
            const query = { email: email }
            const cursor = orderCollection.find(query)
            const myOrders = await cursor.toArray()
            res.send(myOrders);
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