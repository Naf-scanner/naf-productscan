// Import dotenv to load environment variables
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Define product schema first
const productSchema = new mongoose.Schema({
  name: String,
  company: String,
  productId: String,
  registered: Boolean,
  qrCodePath: String,
});

const Product = mongoose.model("Product", productSchema);

// ✅ Connect to MongoDB
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ VERIFY route FIRST — before static routes
app.get("/verify/:productId", async (req, res) => {
  const { productId } = req.params;
  console.log("Received productId:", productId);

  try {
    const decodedProductId = decodeURIComponent(productId);
    console.log("Decoded productId:", decodedProductId);

    const product = await Product.findOne({ productId: decodedProductId });

    if (!product) {
      return res.status(404).send("<h1>Product not found</h1>");
    }

    res.send(`
      <html>
        <head>
          <title>Product Verification</title>
        </head>
        <body>
          <h1>✅ Product Verified</h1>
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

// ✅ Static Routes — after dynamic routes
app.use("/qr_codes", express.static(path.join(__dirname, "qr_codes")));
app.use(express.static("public"));

// ✅ Register Product Route
app.post("/register-product", async (req, res) => {
  const { name, company, productId } = req.body;

  if (!name || !company || !productId) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const encodedId = encodeURIComponent(productId);
  const link = `https://nafcode-server.onrender.com/verify/${encodedId}`;
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

// ✅ Catch-all 404
app.use((req, res) => {
  res.status(404).send("<h1>404 - Route Not Found</h1>");
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
