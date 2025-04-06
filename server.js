// Import dotenv to load environment variables
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use("/qr_codes", express.static(path.join(__dirname, "qr_codes")));

// MongoDB Atlas Connection using environment variable
const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Define product schema
const productSchema = new mongoose.Schema({
  name: String,
  company: String,
  productId: String,
  registered: Boolean,
  qrCodePath: String,
});

const Product = mongoose.model("Product", productSchema);

// POST route to register a product and generate QR code
app.post("/register-product", async (req, res) => {
  const { name, company, productId } = req.body;

  if (!name || !company || !productId) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Generate the correct link for the QR code (this should be your actual verification page URL)
  const link = `http://localhost:3000/verify/${productId}`; // Replace with your actual domain for production
  const qrDir = path.join(__dirname, "qr_codes");
  const qrPath = path.join(qrDir, `${productId}.png`);

  try {
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir);
    }

    await QRCode.toFile(qrPath, link);

    const newProduct = new Product({
      name,
      company,
      productId,
      registered: true,
      qrCodePath: `/qr_codes/${productId}.png`,
    });

    await newProduct.save();

    res.json({
      message: "✅ Product registered",
      qrCodeURL: `/qr_codes/${productId}.png`,
    });
  } catch (error) {
    console.error("❌ QR Generation or DB Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// GET route to verify product using productId from the QR code
app.get("/verify/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    // Find the product by productId in the database
    const product = await Product.findOne({ productId });

    if (!product) {
      return res.status(404).send("<h1>Product not found</h1>");
    }

    // Send a dynamic HTML response with the product details
    res.send(`
      <html>
        <head>
          <title>Product Verification</title>
        </head>
        <body>
          <h1>Product Verified</h1>
          <p><strong>Name:</strong> ${product.name}</p>
          <p><strong>Company:</strong> ${product.company}</p>
          <p><strong>Registered:</strong> ${product.registered ? "Yes" : "No"}</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Product verification error:", error);
    res.status(500).send("<h1>Something went wrong</h1>");
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
