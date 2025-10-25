import express from "express";
import { initializePayment, verifyPayment } from "../controllers/paystackController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/initialize", protect, initializePayment);
router.get("/verify/:reference", protect, verifyPayment);

export default router;
