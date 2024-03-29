const express = require("express");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")('sk_test_51OEBh5JPntNfPAY0wWotHmL0dkCHb00srFM3H9xo220LJeuk7e61X4mi20dZKHsSucZbve2A7CCytxsNIL34xHbn00SowaxNlP')
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const nodemailer = require('nodemailer');
// create app 
const app = express();
const port = process.env.PORT || 4000;

// middle ware
app.use(
  cors({
    origin: ["http://localhost:5173","http://localhost:5174","https://myims-d3864.web.app"] ,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());





// verifiedToken

const verifiedToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("userCooke:info", token);

  if (!token) {
    return res.status(403).send("Unauthorize access");
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
    if (err) {
      console.log("tokenerrr", err);
      return res.status(401).send({ message: "unauthorize" });
    }
    console.log("usrDecode", decode);
    req.user = decode;
    next();
  });
};




  

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r486pno.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});







// start work on verify  token 










async function run() {

  try {
    // TODO:DELETE BEFORE DEPLOY AWAIT CLIENT
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const  usersCollections = client.db("imsDB").collection('users');
    const  reviewsCollections = client.db("imsDB").collection('reviews');
    const  shopsCollections = client.db("imsDB").collection('shops');
    const  productsCollections = client.db("imsDB").collection('prodcuts');
    const  salesCollections = client.db("imsDB").collection('sales');


  // verified admin  middleware

  const verifiedAdmin = async (req, res, next) => {
    const email = req.user.user;
    const query = { email: email };

    const user = await usersCollections.findOne(query);

    const isAdmin = user?.role === "admin";

    if (!isAdmin) {
      return res.status(403).send({ message: "forbidden access" });
    }
    next();
  };




     // verified manager  middleware

     const verifiedManager = async (req, res, next) => {
      const email = req.user.user;
      const query = { email: email };

      const user = await usersCollections.findOne(query);

      const isManager = user?.role === "manager";

      if (!isManager) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };



// jwt api 

app.post("/api/v1/jwt", (req, res) => {
  console.log("authEmail", req.body?.user); //from auth email
  const user = req.body;

  const token = jwt.sign(user, process.env.SECRET_KEY, {
    expiresIn: "24h",
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  });

  console.log("tk", req.cookies.token);
  res.send({ status: "success" });
});

// check done token 

try {
  app.post("/api/v1/logout", (req, res) => {
    console.log("logoutUser", req.body);

    res.clearCookie("token", { maxAge: 0 }).send({ success: true });
  });
} catch (error) {
  console.log(error);
}


    // API ROUTES 


app.get('/',(req,res)=>{


 res.send("hello ims")
}

)


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
app.post('/api/v1/createShop/:email',verifiedToken, async(req,res)=>{
    const email = req.params.email;
    const query = {email:email}
  console.log(req.user)
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
                shopName:shopInfo.shopName,
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

app.get('/api/v1/role/:email',  async(req,res)=>{


 const email = req.params?.email;
 
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


app.post('/api/v1/addProducts/:shopId',verifiedToken, verifiedManager,async(req,res)=>{

    const id =   req.params.shopId;

    const query =   {_id: new ObjectId(id) };


    const shopEmail = await shopsCollections.findOne(query)

    // console.log('shopE', shopEmail)

     if(shopEmail?.addLimit===3 ){

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

// token vf-done

app.get("/api/v1/products/:email", verifiedToken, verifiedManager,  async(req,res)=>{

  if (req.params?.email !== req.user?.user) {
    return res.status(403).send({ status: "forbidden" });
  }

const email = req.params.email;
// console.log('tokenUSER',req.user)
const query = {email:email};
console.log(query)
    const result = await productsCollections.find(query).toArray();
    res.send(result)
})




app.post('/api/v1/jwt',async(req,res)=>{

  console.log('jwtwww')

  console.log(req.body)
})




app.get('/api/v1/products',verifiedToken,verifiedManager,async(req,res)=>{


const {search} = req.query;


 if(!search){

  res.send({mesage:'not text '})
 }else{

const query = {
  _id:new ObjectId(search)


}
const result = await productsCollections.find(query).toArray();

 res.send(result)
 console.log(result)

 }




})







// update product 


app.patch('/api/v1/updateProduct/:id', verifiedToken,verifiedManager, async(req,res)=>{

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


app.delete('/api/v1/productDelete/:id',verifiedToken, verifiedManager,async(req,res)=>{

const id = req.params.id;

const  filter = {_id:new ObjectId(id)};
console.log(filter)
   const result  = await productsCollections.deleteOne(filter)
   res.send(result)
})










// sale collection paid product


app.post('/api/v1/saleProduct',verifiedToken,verifiedManager, async(req,res)=>{




const sale = req.body;
// console.log('sale',sale)

const quey = {_id: new ObjectId(sale.itemId)}
  const result = await salesCollections.insertOne(sale);
 const productsC = await productsCollections.findOne(quey)
//  console.log(productsC)

 const updateDoc = {

  $set:{
    saleCount: productsC.saleCount+1,
    productQuantity: parseInt(productsC.productQuantity)- sale?.orderQuantity,
  }
 }

 const updateSale = await productsCollections.updateOne(quey,updateDoc);
console.log('updateS', updateSale)
  res.send({result:result,updateSale:updateSale})

})







// create payment  intent 


// token-vf-done-manager

app.post('/api/v1/create-payment-intent',verifiedToken,verifiedManager, async(req,res)=>{


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

app.patch('/api/v1/limitProduct/:email',verifiedToken,async(req,res)=>{
 
   
  const email = req.params.email;
  const query = {OwnerEmail:email}
const paymentInfo = req.body;
  console.log(email)
  // console.log('bb', paymentInfo.balance)
  // console.log('LL', paymentInfo.limit)


  const increase =  await shopsCollections.findOne(query)
//  console.log(increase)

  const filter = {_id: new ObjectId(increase?._id)}

 
   const updateDoc = {
 
  
    $set: {
      addLimit:increase?.addLimit + paymentInfo.limit,
       
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
// token-vg-done-manager

app.get('/api/v1/sales/:shopId', verifiedToken, verifiedManager, async(req,res)=>{

  // console.log('rrraj',req.query)
  const page =parseInt( req.query.page);
  const size = parseInt(req.query.size);
 const skips = page*size;
//  console.log(skips)
  const shopId = req.params.shopId;

  const query = {shopId:shopId};
// console.log('sEmail',query)

  const sales = await salesCollections.find(query).limit(size).skip(skips).toArray();

// console.log(sales)
  const matchedStage = {$match:{shopId:shopId}}
  
  
  const groupStage ={

    $group:{
      _id:null,
      TotalAmount:{$sum:'$TotalAmount'},
      ProductionCost:{$sum:'$ProductionCost'},
      orderQuantity:{$sum:'$orderQuantity'}
    }
  }

  const pipeline = [matchedStage,groupStage ]

 const result = await salesCollections.aggregate(pipeline).toArray()

const revenue = result.length>0? result[0].TotalAmount:0;
const productionCost = result.length>0? result[0].ProductionCost:0;
const quantity = result.length>0? result[0].orderQuantity:0;
// let totalInvest = 0;
//   sales.forEach((sale)=>{

//     totalInvest+=  parseInt(sale.ProductionCost) * parseInt(sale.productQuantity)

//   })


res.send({totalSale:sales?.length,totalSalePrice:revenue,productionCost:productionCost,sales:sales,quantity:quantity})

   
})




// token vg-done public

// GET ROLE FOR ALL 


app.get('/api/v1/userRole/:email',verifiedToken,async(req,res)=>{


  if (req.params.email !== req.user?.user) {
        return res.status(403).send({ status: "forbidden" });
      }

  const email = req.params.email;

  const query = {email:email};
console.log('role', query)
  const  users = await usersCollections.findOne(query);



  res.send(users)


})








// admin area bellow



// get all shops 
// token v-f and admin v-f done
// token and admin vf done
app.get('/api/v1/shops',verifiedToken, verifiedAdmin, async(req,res)=>{

  const result = await shopsCollections.find().toArray();

  res.send(result);
})


// token-v-f and admin v-f done

app.get('/api/v1/adminStats',verifiedToken, verifiedAdmin, async(req,res)=>{


  const totalProducts = await  productsCollections.estimatedDocumentCount();
  const salesProducts = await  salesCollections.estimatedDocumentCount();

console.log(totalProducts)
  res.send({totalProducts:totalProducts,salesCollections:salesProducts})


})




// all users collection get


app.get('/api/v1/users',verifiedToken,verifiedAdmin, async(req,res)=>{

  const result = await usersCollections.find().toArray();

  res.send(result);


})













// promotion  send email admin fun


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
})




app.post('/api/v1/sendPromotion',(req,res)=>{

 
  const  {to,subject,message  } = req.body;

  // console.log(to,subject,message)

  // console.log('message', message)



  var mailOptions = {


     from:process.env.SMTP_MAIL,
     to:to,
     subject:subject,
     text: message


  }


  transporter.sendMail(mailOptions,(error,info)=>{


     if(error){
      console.log('error', error)
     }else{

      console.log('success',info)

      res.send({mail:'success'})
     }

  })


})




// reviews 


app.post('/api/v1/reviews',async(req,res)=>{

   const review = req.body;

  //  console.log('review', review)

   const result = await reviewsCollections.insertOne(review);

  //  console.log(result)

   res.send(result)


})




// get review


app.get(`/api/v1/reviews`,async(req,res)=>{

  //  const  paramsEmail =  req.params.email;

  //  const email = {email:paramsEmail};

   const findReview = await reviewsCollections.find().toArray();

   console.log(findReview)

   res.send(findReview)
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