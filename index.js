const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// create app 
const app = express();
const port = process.env.PORT || 4000;

// middle ware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r486pno.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // TODO:DELETE BEFORE DEPLOY AWAIT CLIENT
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const  usersCollections = client.db("imsDB").collection('users');
    const  shopsCollections = client.db("imsDB").collection('shops');

  







    // API ROUTES 


    // collection users post
app.post('/api/v1/users/:email',async(req,res)=>{
  const email = req.params.email;

  const query = {email:email}
    const usersInfo = req.body;
    // console.log(usersInfo);
//  console.log(query)
  
    const isExist = await usersCollections.findOne(query);

     if(isExist){

        return res.send({message:isExist});
     }

     const result = await usersCollections.insertOne({

        

            ...usersInfo,
            timeStamp:  Date.now(),

         
     })


     res.send(result)


})




// shop collection create shop post

app.post('/api/v1/createShop/:email',async(req,res)=>{
    const email = req.params.email;

    const query = {email:email}
    const shopInfo = req.body;
    console.log(shopInfo)
    const  updateRole = await usersCollections.findOne(query);

    if(updateRole){
       
        const id = updateRole._id;
        const filter = {_id: new ObjectId(id)}
        const updateDoc = {
            $set: {
              role: 'manager',
            },
          };

         const updated = await usersCollections.updateOne(filter,updateDoc)

         const result = await shopsCollections.insertOne(shopInfo);


 res.send({updated:updated,result:result})
    }


res.send({message:'go to account login'})

})










// shop collection get role 

app.get('/api/v1/role/:email',async(req,res)=>{


 const email = req.params.email;
 
  console.log(email)
 
const query = {OwnerEmail:email}

 const find = await shopsCollections.findOne(query);


   if(find){

      res.send(find);
   }else{

    res.send({message: 'create a shop'})
   }
    


    

})






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})