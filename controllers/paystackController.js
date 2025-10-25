import asyncHandler from "express-async-handler";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// @desc    Initialize Paystack payment
// @route   POST /api/paystack/initialize
// @access  Private
const initializePayment = asyncHandler(async (req, res) => {
  const { email, amount } = req.body;

  const params = {
    email,
    amount: amount * 100, // convert Naira to Kobo
  };

  const options = {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  };

  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    params,
    options
  );

  res.json(response.data);
});

// @desc    Verify Paystack payment
// @route   GET /api/paystack/verify/:reference
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const options = {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  };

  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    options
  );

  res.json(response.data);
});

export { initializePayment, verifyPayment };
