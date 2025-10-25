import asyncHandler from "express-async-handler";
import axios from "axios";
import Order from "../models/orderModel.js";

/* ============================================
   Create new order
   POST /api/orders
   Private
============================================ */
const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  const order = new Order({
    orderItems,
    user: req.user._id,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    status: "Pending",
  });

  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
});

/* ============================================
   Get logged-in user's orders
   GET /api/orders/myorders
   Private
============================================ */
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

/* ============================================
   Get order by ID
   GET /api/orders/:id
   Private
============================================ */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

/* ============================================
   Update order to paid
   PUT /api/orders/:id/pay
   Private
============================================ */
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.status = "Paid";
  order.paymentResult = {
    id: req.body.id || req.body.transactionId,
    status: req.body.status || "success",
    reference: req.body.reference,
    gateway_response: req.body.gateway_response || "",
    email: req.body.email,
  };

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

/* ============================================
   Initialize Paystack Payment
   POST /api/orders/:id/init
============================================ */
const initializePaystackPayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "email name");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const email = order.user?.email || "customer@example.com";
  const amount = Math.round(order.totalPrice * 100);
  const reference = `modumart_${Date.now()}`;

  const payload = {
    email,
    amount,
    reference,
    callback_url:
      process.env.PAYSTACK_CALLBACK_URL ||
      "http://localhost:5173/payment-success",
    metadata: { orderId: order._id.toString() },
  };

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    if (data && data.status && data.data) {
      order.paymentResult = {
        reference: data.data.reference,
        authorization_url: data.data.authorization_url,
        status: "pending",
      };
      await order.save();

      res.json({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      });
    } else {
      res.status(400);
      throw new Error("Payment initialization failed");
    }
  } catch (error) {
    console.error("Paystack init error:", error.response?.data || error.message);
    res.status(500);
    throw new Error("Error initializing payment");
  }
});

/* ============================================
   Verify Paystack Payment
   POST /api/orders/verify
============================================ */
const verifyPaystackPayment = asyncHandler(async (req, res) => {
  const { reference } = req.body;
  if (!reference) {
    res.status(400);
    throw new Error("Payment reference missing");
  }

  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    }
  );

  const paystack = response.data;
  if (paystack.status && paystack.data.status === "success") {
    const orderId = paystack.data.metadata?.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error("Order not found for this payment");
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = "Paid";
    order.paymentResult = {
      id: paystack.data.id,
      status: paystack.data.status,
      reference: paystack.data.reference,
      gateway_response: paystack.data.gateway_response,
      email: paystack.data.customer.email,
      amount: paystack.data.amount / 100,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(400);
    throw new Error("Payment verification failed");
  }
});

/* ============================================
   Admin: Update to Delivered
   PUT /api/orders/:id/deliver
============================================ */
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.status = "Delivered";

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

/* ============================================
   Admin: Get All Orders
   GET /api/orders
============================================ */
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(orders);
});

/* ============================================
   Admin: Delete an Order
============================================ */
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    await order.deleteOne();
    res.json({ message: "Order removed successfully" });
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

export {
  addOrderItems,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  initializePaystackPayment,
  verifyPaystackPayment,
  updateOrderToDelivered,
  getAllOrders,
  deleteOrder,
};
