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
  useCreateIndex: true,
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
    image_url: `https://your-domain.com/images/${req.file.filename}`
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
      image: `https://your-domain.com/images/${req.body.image}`,
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

// User Schema
const User = mongoose.model('User', {
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  cartData: { type: Object },
  date: { type: Date, default: Date.now },
});

// User registration route
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, error: "User already exists with this email address" });
    }

    let cart = {};
    for (let i = 0; i < 3000; i++) {
      cart[i] = 0;
    }

    const newUser = new User({
      name,
      email,
      password,
      cartData: cart,
    });

    await newUser.save();
    console.log("User registered:", newUser);
    
    const token = jwt.sign({ user: newUser }, process.env.SECRET);
    res.json({ success: true, token });
  } catch (err) {
    console.error("Error signing up:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// User login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Incorrect password" });
    }

    const token = jwt.sign({ user }, process.env.SECRET);
    res.json({ success: true, token });
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Please provide a valid token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// Example protected route (requires authentication)
app.post('/protected-route', authenticateUser, async (req, res) => {
  try {
    // Your protected route logic here
    res.json({ success: true, message: "Access granted to protected route" });
  } catch (err) {
    console.error("Error in protected route:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
