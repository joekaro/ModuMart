import asyncHandler from "express-async-handler";
import Product from "../models/productModel.js";

// @desc    Get all products (with search, filter, and sort)
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword
    ? { name: { $regex: req.query.keyword, $options: "i" } }
    : {};

  const category = req.query.category ? { category: req.query.category } : {};

  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : 0;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : 10000000;

  const priceFilter = {
    price: { $gte: minPrice, $lte: maxPrice },
  };

  const sortOption = {};
  if (req.query.sortBy) {
    if (req.query.sortBy === "priceAsc") sortOption.price = 1;
    else if (req.query.sortBy === "priceDesc") sortOption.price = -1;
    else if (req.query.sortBy === "newest") sortOption.createdAt = -1;
  }

  const products = await Product.find({
    ...keyword,
    ...category,
    ...priceFilter,
  }).sort(sortOption);

  res.json(products);
});


// @desc   Get single product
// @route  GET /api/products/:id
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc   Delete product (Admin only)
// @route  DELETE /api/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc   Create product (Admin only)
// @route  POST /api/products
// ✅ Correct version — use frontend data
export 
const createProduct = async (req, res) => {
  try {
    const { name, price, category, countInStock, description, image } = req.body;

    const product = new Product({
      name,
      price,
      category,
      countInStock,
      description,
      image,
      user: req.user._id,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// @desc   Create new review
// @route  POST /api/products/:id/reviews
// @access Private (user must be logged in)
export const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error("Product already reviewed");
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc   Update product (Admin only)
// @route  PUT /api/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const { name, price, description, image, brand, category, countInStock } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = name || product.name;
    product.price = price || product.price;
    product.description = description || product.description;
    product.image = image || product.image;
    product.brand = brand || product.brand;
    product.category = category || product.category;
    product.countInStock = countInStock || product.countInStock;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});
export{
  getProducts,
};
