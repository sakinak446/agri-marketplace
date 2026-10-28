const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");

const productError = (res, error) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: "Invalid product details. Check the required fields, price, quantity, category and unit." });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid product ID or field value" });
  }
  return res.status(500).json({ success: false, message: "Unable to process products. Please try again later." });
};

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "agri-marketplace/products",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

const createProduct = async (req, res) => {
    try{
        const {
            name,
            price,
            unit,
            quantity,
            category,
            description,
        } = req.body;
        let imageUrl = "";
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            imageUrl = uploadResult.secure_url;
        }
        const product = await Product.create({
            name,
            price,
            unit,
            quantity,
            category,
            description,
            image: imageUrl,
            farmer: req.user._id,
        });
        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
        });
    }catch (error) {
        return productError(res, error);

    }
};
const getProducts = async (req, res) => {
    try {
        const { 
            search, 
            category, 
            minPrice, 
            maxPrice, 
            sort,
            inStock } = req.query;
        const { page: pageQuery = "1", limit: limitQuery = "10" } = req.query;
        const page = Number(pageQuery);
        const limit = Number(limitQuery);
        if (
            typeof pageQuery !== "string" || !/^\d+$/.test(pageQuery) ||
            typeof limitQuery !== "string" || !/^\d+$/.test(limitQuery) ||
            !Number.isSafeInteger(page) || page <= 0 ||
            !Number.isSafeInteger(limit) || limit <= 0 || limit > 100 ||
            !Number.isSafeInteger((page - 1) * limit)
        ) {
            return res.status(400).json({
                success: false,
                message: "Page must be a positive integer, limit must be between 1 and 100, and pagination must be within the safe numeric range",
            });
        }
        const filter = {}
        if (search && (typeof search !== "string" || search.length > 200)) {
            return res.status(400).json({ success: false, message: "Search must be text of at most 200 characters" });
        }
        if(search){
            filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        }
        if(category){
            filter.category = category;
        }
        if (inStock === "true") {
            filter.quantity = { $gt: 0 };
        }
        if (
            (minPrice && (typeof minPrice !== "string" || !Number.isFinite(Number(minPrice)) || Number(minPrice) < 0)) ||
            (maxPrice && (typeof maxPrice !== "string" || !Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0))
        ) {
            return res.status(400).json({
                success: false,
            message: "Price must be a finite, non-negative number",
            });
        }
        if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice))
        {
            return res.status(400).json({
                success: false,
                message: "Minimum price cannot be greater than maximum price",
            });
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) {
                filter.price.$gte = Number(minPrice);
            }
            if (maxPrice) {
                filter.price.$lte = Number(maxPrice);
            }
        }
        let sortOption = { createdAt: -1 }; // Default sort by newest
        if (sort === "price_asc") {
            sortOption = { price: 1 };
        }
        if (sort === "price_desc") {
            sortOption = { price: -1 };
        }
        const products = await Product.find(filter)
        .populate("farmer", "name email")
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit);
        const totalProducts = await Product.countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: products.length,
            page,
            limit,
            totalProducts,
            totalPages: Math.ceil(totalProducts / limit),
            products,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch products",
        });
    }
};
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
        .populate("farmer", "name email");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            product,
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID",
        });
    }
};
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        if (product.farmer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own products",
            });
        }

        const updateData = {};
        for (const field of ["name", "price", "unit", "quantity", "category", "description"]) {
            if (Object.hasOwn(req.body || {}, field)) updateData[field] = req.body[field];
        }

        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            updateData.image = uploadResult.secure_url;
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { 
                new: true,
                runValidators: true, 
            }
        );

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct,
        });

    } catch (error) {
        return productError(res, error);
    }
};
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        if (product.farmer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own products",
            });
        }

        await Product.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });

    } catch (error) {
        return productError(res, error);
    }
};
const getMyProducts = async (req, res) => {
    try {
        const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            products,
        });
    } catch (error) {
        return productError(res, error);
    }
};
module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getMyProducts };
