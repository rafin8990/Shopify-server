const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken')
const app = express();
require('dotenv').config()

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Shopify Server is Running ')
});


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nuouh7o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req, res, next) {
    const authHeaders = req.headers.authorization;
    // console.log(authHeaders)
    if (!authHeaders) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    const token = authHeaders.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })
}

async function run() {
    try {
        const categoryCollection = client.db('shopify').collection('category')
        const itemsCollection = client.db('shopify').collection('categoryItems')
        const usersCollection = client.db('shopify').collection('users')
        const bookingCollection = client.db('shopify').collection('booking')
        const paymentCollection = client.db('shopify').collection('payment')


        // implement jsonwebtoken 

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '3d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        // stripe 

        app.post('/create-payment-intent', async (req, res) => {
            const payment = req.body;
            const price = parseInt(payment.price);
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment)
            const id = payment.productId;
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transectionId
                }
            }
            const updateBookingProduct = await bookingCollection.updateOne(filter, updatedDoc);
            const categoryId = payment.categoryItemId
            const categoryFilter = { _id: ObjectId(categoryId) }

            const updateCategoryItems = await itemsCollection.updateOne(categoryFilter, updatedDoc)


            res.send(result)
        })

        // category area 

        app.get('/category', async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray()
            res.send(result)
        });

        app.get('/categoryitems', async (req, res) => {
            const categoryName = req.query.categoryName;
            const query = { categoryName: categoryName }
            const result = await itemsCollection.find(query).toArray()
            res.send(result)
        });
        app.post('/categoryitems', async (req, res) => {
            const productData = req.body;
            const result = await itemsCollection.insertOne(productData);
            res.send(result);
        })

        app.get('/categories', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await itemsCollection.find(query).toArray()
            res.send(result)
        })

        // users area 

        app.post('/users', async (req, res) => {
            const usersData = req.body
            const result = await usersCollection.insertOne(usersData)
            res.send(result)
        });

        app.get('/users', async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const sellerUser = await usersCollection.find(query).toArray();
            res.send(sellerUser)
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }

            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.admin === 'admin' });
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }

            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Seller' });
        })



        // booking area 

        app.get('/booking', verifyJWT, async (req, res) => {
            const email = req.query.email

            const decodedEmail = req.decoded.email

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/booking', async (req, res) => {
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);
            res.send(result)
        });

        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };

            const result = await bookingCollection.findOne(query);
            res.send(result)
        });

        // wishlist

        app.put('/categoryitem/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const wishlistData = req.body
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    wishlistData:wishlistData
                }
            }

            const updateForWishlist = await itemsCollection.updateOne(query, updatedDoc, options)
            res.send(updateForWishlist)
        });

        app.get('/categoryitem', async (req, res) => {
            const wishlishData = req.query.wishlistData;
            const query = { wishlishData: wishlishData };
            const wishlist = await itemsCollection.find(query).toArray()
            res.send(wishlist)
        })

    }
    catch {

    }
}
run().catch(error => console.error(error))


app.listen(port, () => {
    console.log(`Shopify server is running on port ${port}`)
})