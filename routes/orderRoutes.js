import express from "express";
import {
  addOrderItems,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  initializePaystackPayment,
  verifyPaystackPayment,
  getAllOrders,
  deleteOrder,
} from "../controllers/orderController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import Order from "../models/orderModel.js";

const router = express.Router();

// Create new order / Admin get all orders
router.route("/").post(protect, addOrderItems).get(protect, admin, getAllOrders);

// Logged-in user orders
router.route("/myorders").get(protect, getMyOrders);

// Admin earnings stats
router.get("/earnings", protect, admin, async (req, res) => {
  try {
    const paidOrders = await Order.find({ isPaid: true });
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalOrders = await Order.countDocuments();
    const paidCount = paidOrders.length;

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const recentOrders = await Order.aggregate([
      {
        $match: {
          isPaid: true,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalRevenue,
      totalOrders,
      paidOrders: paidCount,
      recentEarnings: recentOrders.map((d) => ({
        date: d._id,
        total: d.total,
      })),
    });
  } catch (error) {
    console.error("Earnings route error:", error);
    res.status(500).json({ message: "Failed to fetch earnings" });
  }
});
// Top Products (Admin Analytics)
router.get("/top-products", protect, admin, async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $match: { isPaid: true } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.name",
          totalSold: { $sum: "$orderItems.qty" },
          totalRevenue: { $sum: "$orderItems.price" },
          image: { $first: "$orderItems.image" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    res.json(topProducts);
  } catch (error) {
    console.error("Top Products route error:", error);
    res.status(500).json({ message: "Failed to fetch top products" });
  }
});


// Paystack payment
router.post("/:id/init", protect, initializePaystackPayment);
router.post("/verify", verifyPaystackPayment);

// Order details, update, delete
router
  .route("/:id")
  .get(protect, getOrderById)
  .put(protect, updateOrderToPaid)
  .delete(protect, admin, deleteOrder);

// Mark as delivered (Admin)
router.put("/:id/deliver", protect, admin, updateOrderToDelivered);

export default router;
