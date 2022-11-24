const express = require('express');
const cors= require('cors')
const app = express();
require('dotenv').config()

const port=process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

app.get('/', (req, res)=>{
    res.send('Shopify Server is Running ')
});


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nuouh7o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const categoryCollection=client.db('shopify').collection('category')
        const itemsCollection= client.db('shopify').collection('categoryItems')

        app.get('/category', async(req, res)=>{
            const query={}
            const result=await categoryCollection.find(query).toArray()
            res.send(result)
        });

        app.get('/categoryitems', async(req, res)=>{
            const categoryName=req.query.categoryName;
            const query={categoryName: categoryName}
            const result= await itemsCollection.find(query).toArray()
            res.send(result)
        })



    }
    catch{

    }
}
run().catch(error=>console.error(error))


app.listen(port, ()=>{
    console.log(`Shopify server is running on port ${port}`)
})