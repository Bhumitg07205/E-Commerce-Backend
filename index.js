const express = require("express");
const app =express();
const mongoose =require("mongoose");
const jwt =require("jsonwebtoken");
const multer =require("multer");
const path =require("path");
require('dotenv').config();
const port =process.env.PORT;
const cors = require("cors");
const { type } = require("os");
const { error } = require("console");

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URL);


//api creation
app.get("/",(req,res)=>{
    res.send("Express App is running")

})
//Image Storage Engine
const storage=multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload =multer({storage:storage})
//creating upload endpoint
app.use('/images',express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`https://e-commerce-backend-yy5w.onrender.com/images/${req.file.filename}`
    })
})

//Schema for creating Products

const Product =mongoose.model("Product",{
    id:{
        type: Number,
        required: true,},
        brand:{
            type:String,
            required: true,
        },
        name:{
            type:String,
            required: true,
        },
        discription:{
            type:String,
            required: true,
        },
        image:{
            type:String,
            required: true,
        },category:{
            type:String,
            required: true,
        },new_price:{
            type:Number,
            required: true,
        },old_price:{
            type:Number,
            required: true,
        },date:{
            type:Date,
            default:Date.now,
        },
        available:{
            type:Boolean,
            default:true,
        },
        rating:{
            type:Number,
        },
        peoplerated:{
            type:Number,
        }
})
app.post('/addproduct',async(req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
        {
            let last_product_array=products.slice(-1);
            let last_product=last_product_array[0];
            id =last_product.id+1;
        }else{
            id=1;
        }
    const product = new Product({
        id:id,
        brand:req.body.brand,
        name:req.body.name,
        discription:req.body.discription,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
        rating:Math.floor(Math.random() * (5 - 1 + 1)) + 1,
        peoplerated:Math.floor(1000 + Math.random() * 9000),


    });
    console.log(product);
    await product.save();
    console.log("Saved")
    res.json({
        success:true,
        name:req.body.name,
    })
})
//creating api for deleting products

app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })

})

//creating api for getting all products
app.get('/allproducts', async(req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

//schema creating for user model

const Users =mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    },
})

//Creating Endpoint for registering the user
app.post('/signup',async(req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with same email adress"})
    }
    let cart={};
    for (let i = 0; i < 3000; i++) {
        cart[i]=0;  
    }
    const user =new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })
    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }
    const token= jwt.sign(data,process.env.SECRET);
    res.json({success:true,token})
})
//creating endpoint for userlogin
app.post('/login',async(req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if (user) {
        const passCompare =req.body.password ===user.password;
        if (passCompare) {
            const data ={
                user:{
                    id:user.id
                }
            }
            const token=jwt.sign(data,process.env.SECRET);
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"Wrong Password"});
        }
        
    }
    else{
        res.json({success:false,errors:"Wrong Email Id"})
    }
})
app.get('/newcollections',async(req,res)=>{
    let products=await Product.find({});
    let newcollections =products.slice(1).slice(-8);
    console.log("New Collections Fetched");
    res.send(newcollections);

})
app.get('/popularinwomen',async(req,res)=>{
    let products=await Product.find({category:"women"});
    let popular_in_women =products.slice(0,4);
    console.log("Popular in Women Fetched");
    res.send(popular_in_women);

})


//creating middleware to fetch user
const fetchUser=async(req,res,next)=>{
    const token=req.header('auth-token');
    if (!token) {
        res.status(401).send({errors:"Please authenticate using valid token"})

        
    }else{
        try {
            const data=jwt.verify(token,process.env.SECRET);
            req.user=data.user;
            next();
        } catch (error) {
            res.status(401).send({errors:"please authenticate using a valid token"})
        }
    }


}
 
app.post('/addtocart',fetchUser,async(req,res)=>{
    console.log("added",req.body.itemId)
    let userData=await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await Users.findByIdAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Added");

})
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("Get Cart");
    let userData=await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("removed",req.body.itemId)
    let userData=await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;
    await Users.findByIdAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Remove");

})
app.listen(port,(error)=>{
    if(!error){
        console.log("server running on port"+port)
    }
    else{
        conole.log("Error:"+error)
    }
})
