const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false, // Add this line to replace deprecated useCreateIndex
});

const conn = mongoose.connection;
conn.once("open", () => {
  console.log("Connected to MongoDB");
});

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// Serve Images
app.use('/images', express.static('upload/images'));

// Product Schema
const Product = mongoose.model("Product", {
  id: { type: Number, required: true },
  brand: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  new_price: { type: Number, required: true },
  old_price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
  rating: { type: Number },
  peopleRated: { type: Number },
});

// API Routes

// Root route
app.get("/", (req, res) => {
  res.send("Express App is running");
});

// Upload image route
app.post("/upload", upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    image_url: `https://e-commerce-backend-yy5w.onrender.com/images/${req.file.filename}`
  });
});

// Add product route
app.post('/addproduct', async (req, res) => {
  try {
    let products = await Product.find({});
    let id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const product = new Product({
      id: id,
      brand: req.body.brand,
      name: req.body.name,
      description: req.body.description,
      image: `https://e-commerce-backend-yy5w.onrender.com/images/${req.body.image}`,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
      rating: Math.floor(Math.random() * (5 - 1 + 1)) + 1,
      peopleRated: Math.floor(1000 + Math.random() * 9000),
    });

    await product.save();
    console.log("Product saved:", product);
    res.json({ success: true, name: req.body.name });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete product route
app.post('/removeproduct', async (req, res) => {
  try {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Product removed");
    res.json({ success: true, name: req.body.name });
  } catch (err) {
    console.error("Error removing product:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all products route
app.get('/allproducts', async (req, res) => {
  try {
    const products = await Product.find({});
    console.log("All products fetched");
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
