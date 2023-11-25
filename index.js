const express = require("express");
require("dotenv").config();
const stripe = require("stripe")('sk_test_51OEBh5JPntNfPAY0wWotHmL0dkCHb00srFM3H9xo220LJeuk7e61X4mi20dZKHsSucZbve2A7CCytxsNIL34xHbn00SowaxNlP')
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
    const  productsCollections = client.db("imsDB").collection('prodcuts');
    const  salesCollections = client.db("imsDB").collection('sales');









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
// TODO:CHECK ONE ERROR THERE 
app.post('/api/v1/createShop/:email',async(req,res)=>{
    const email = req.params.email;
    const query = {email:email}

    const  existShop = await usersCollections.findOne(query);
// console.log('exist', existShop.length)

    if(existShop.role =='manager'){

 return   res.send({message:'existShop'})

    }else{

      const shopInfo = req.body;
      // console.log(shopInfo)
  
      const  updateRole = await usersCollections.findOne(query);
  
      
      if(updateRole){
         
          const id = updateRole._id;
          const filter = {_id: new ObjectId(id)}
          const updateDoc = {
              $set: {
                role: 'manager',
                addLimit:3,
                saleLimit:1,
              },
            };
  
           const updated = await usersCollections.updateOne(filter,updateDoc)
  
           const result = await shopsCollections.insertOne(shopInfo);
  
  
   res.send({updated:updated,result:result})
      }
  
  
  res.send({message:'go to account login'})
    }


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









// add products insert action


app.post('/api/v1/addProducts/:shopId',async(req,res)=>{

    const id =   req.params.shopId;

    const query =   {_id: new ObjectId(id) };


    const shopEmail = await shopsCollections.findOne(query)

    // console.log('shopE', shopEmail)

     if(shopEmail?.addLimit===3 || shopEmail?.addLimit>=3){

      res.send({message:"your product are limited",status:'limited'})
     }else{

      const prodcutInfo = req.body;
      // console.log(prodcutInfo)
              const result = await productsCollections.insertOne(prodcutInfo)
              const myQuery = {_id: new ObjectId(id) };
              const limit = await shopsCollections.findOne(myQuery)
          
              // console.log( 'l',limit.addLimit+1)
              // const  filter = {_id: new ObjectId(limit._id)};
               const updateDoc = {
                 $set:{

                  addLimit: limit.addLimit+1,
                 }
               }
                const update = shopsCollections.updateOne(myQuery,updateDoc);
              res.send({result:result,update:update})
     }



})












//  get all added product list 


app.get("/api/v1/products/:email",async(req,res)=>{

const email = req.params.email;

const query = {email:email};
console.log(query)
    const result = await productsCollections.find(query).toArray();
    res.send(result)
})











// update product 


app.patch('/api/v1/updateProduct/:id',async(req,res)=>{

  const id = req.params.id;
  const filter = {_id: new ObjectId(id)}
  const updateInfo = req.body;
  const options = { upsert: true };
console.log('upd', updateInfo)
   const updateDoc = {

    $set:{
      ...updateInfo,
    }
   }

  const result = await productsCollections.updateOne(filter,updateDoc,options)

  res.send(result);
   
})












// Delete products 


app.delete('/api/v1/productDelete/:id',async(req,res)=>{

const id = req.params.id;

const  filter = {_id:new ObjectId(id)};
console.log(filter)
   const result  = await productsCollections.deleteOne(filter)
   res.send(result)
})










// sale collection paid product


app.post('/api/v1/saleProduct',async(req,res)=>{


const sale = req.body;
// console.log('sale',sale)

const quey = {_id: new ObjectId(sale.itemId)}
  const result = await salesCollections.insertOne(sale);
 const productsC = await productsCollections.findOne(quey)
//  console.log(productsC)

 const updateDoc = {

  $set:{
    saleCount: productsC.saleCount+1,
    productQuantity: parseInt(productsC.productQuantity)-1,
  }
 }

 const updateSale = await productsCollections.updateOne(quey,updateDoc);

  res.send({result:result,updateSale:updateSale})
console.log(updateSale)
})







// create payment  intent 




app.post('/api/v1/create-payment-intent',async(req,res)=>{


  const {price} = req.body;

  const total =  parseInt(price *100);
console.log(price)
  const paymentIntents = await  stripe.paymentIntents.create({
     amount:total,
     currency:'usd',
     payment_method_types:['card']

  })


  res.send({
    clientSecret:paymentIntents.client_secret,
  })





})






// update collection 



app.patch('/api/v1/limitProduct/:email',async(req,res)=>{
 
  const email = req.params.email;
  const query = {OwnerEmail:email}
const paymentInfo = req.body;
  console.log(email)
  console.log('bb', paymentInfo.balance)


  const increase =  await shopsCollections.findOne(query)
 console.log(increase)

  const filter = {_id: new ObjectId(increase?._id)}

 
   const updateDoc = {
 
  
    $set: {
      addLimit: paymentInfo.limit,
       
    }
   }

   const updateLimit = await shopsCollections.updateOne(filter,updateDoc);



   const queryAdmin = {role:'admin'};

    const adminUser = await usersCollections.findOne(queryAdmin);

  

      const id = adminUser._id;

      const filters = {_id: new ObjectId(id)}
      const updateDocs = {

          $set: {

            balance: adminUser?.balance+paymentInfo?.balance,
          }
      }

      const updateAdmin = await usersCollections.updateOne(filters,updateDocs)
   



   res.send({updateLimit:updateLimit,updateAdmin:updateAdmin})
    
})






// shop ownerId get and findOut sale summary


app.get('/api/v1/sales/:shopId',async(req,res)=>{


  const shopId = req.params.shopId;

  const query = {shopId:shopId};
console.log('sEmail',query)
  const sales = await salesCollections.find(query).toArray();


  const pipeline = [

    {
      $group:{
        _id:null,
        sellingPrice:{$sum:'$sellingPrice'},
        ProductionCost:{$sum:'$ProductionCost'}
      }
    }
  ]

 const result = await salesCollections.aggregate(pipeline).toArray()

const revenue = result.length>0? result[0].sellingPrice:0;
const productionCost = result.length>0? result[0].ProductionCost:0;
// let totalInvest = 0;
//   sales.forEach((sale)=>{

//     totalInvest+=  parseInt(sale.ProductionCost) * parseInt(sale.productQuantity)

//   })


res.send({totalSale:sales?.length,totalSalePrice:revenue,productionCost:productionCost})

   
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