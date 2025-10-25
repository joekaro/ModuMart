// backend/controllers/userController.js
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

/* ===========================================
   🔐 Generate JWT (keeps existing behavior)
=========================================== */
const generateToken = (id, expiresIn = "30d") => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

/* ===========================================
   🧍 Register user (POST /api/users/register)
=========================================== */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({ name, email, password });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

/* ===========================================
   🔑 Authenticate user / Login (POST /api/users/login)
=========================================== */
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

/* ===========================================
   👤 Get logged-in user's profile (GET /api/users/profile)
   @access Protected
=========================================== */
const getUserProfile = asyncHandler(async (req, res) => {
  // req.user is attached by protect middleware
  const user = await User.findById(req.user._id).select("-password");
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

/* ===========================================
   ✏️ Update logged-in user's profile (PUT /api/users/profile)
   Accepts name, email, password
   Returns updated user + new token (optional)
   @access Protected
=========================================== */
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.name = req.body.name ?? user.name;
  user.email = req.body.email ?? user.email;
  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin,
    token: generateToken(updatedUser._id), // helpful so frontend can update token if needed
  });
});

/* ===========================================
   👥 Admin: Get all users (GET /api/users) @access Admin
=========================================== */
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password");
  res.json(users);
});

/* ===========================================
   🔍 Admin: Get user by id (GET /api/users/:id) @access Admin
=========================================== */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) res.json(user);
  else {
    res.status(404);
    throw new Error("User not found");
  }
});

/* ===========================================
   ✏️ Admin: Update user by id (PUT /api/users/:id) @access Admin
=========================================== */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name ?? user.name;
    user.email = req.body.email ?? user.email;
    // allow false explicitly
    user.isAdmin = req.body.isAdmin ?? user.isAdmin;

    const updated = await user.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      isAdmin: updated.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

/* ===========================================
   ❌ Admin: Delete user (DELETE /api/users/:id) @access Admin
=========================================== */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    await user.deleteOne();
    res.json({ message: "User removed successfully" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

/* ===========================================
   🔁 Export controllers (keep names consistent)
=========================================== */
export {
  registerUser,
  authUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
