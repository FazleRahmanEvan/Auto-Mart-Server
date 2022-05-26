const express = require("express");
const cors = require ('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();


app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ucgjw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
  
    try{
        await client.connect();
        const productCollection = client.db('autoMart').collection('products');
        
        app.get('/product', async(req,res)=>{
                        
        const query = {};
        const cursor = productCollection.find(query);
        const products = await cursor.toArray();
        res.send(products);
        });

        app.get('/product/:id', async(req,res)=>{
            const id =req.params.id;
            const query={_id: ObjectId(id)};
            const product =await productCollection.findOne(query);
            res.send(product);
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