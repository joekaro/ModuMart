import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Product from "./models/productModel.js";

dotenv.config();
await connectDB();

const baseUrl = "http://localhost:5000";

try {
  const products = await Product.find();
  for (let product of products) {
    if (product.image && product.image.startsWith("/images/")) {
      product.image = `${baseUrl}${product.image}`;
      await product.save();
      console.log(`✅ Updated: ${product.name}`);
    }
  }
  console.log("🎉 All product image URLs updated successfully!");
  process.exit();
} catch (error) {
  console.error("❌ Error updating images:", error);
  process.exit(1);
}
