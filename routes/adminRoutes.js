import express from "express";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalEarnings = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalEarnings: totalEarnings[0]?.total || 0,
    });
  } catch (error) {
    console.error("Summary Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
