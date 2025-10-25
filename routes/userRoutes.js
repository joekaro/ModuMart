// backend/routes/userRoutes.js
import express from "express";
import {
  registerUser,
  authUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* PUBLIC */
router.post("/register", registerUser);
router.post("/login", authUser);

/* AUTHENTICATED USER */
router
  .route("/profile")
  .get(protect, getUserProfile)   // GET current user profile
  .put(protect, updateUserProfile); // UPDATE current user profile

/* ADMIN */
router.route("/").get(protect, admin, getUsers);

router
  .route("/:id")
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

export default router;
