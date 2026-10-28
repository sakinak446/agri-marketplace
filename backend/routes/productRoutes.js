const express = require("express");
const { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getMyProducts } = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getProducts);
router.get("/my-products", protect, authorize("farmer"), getMyProducts);
router.get("/:id", getProductById);
router.post(
    "/", 
    protect, 
    authorize("farmer"), 
    upload.single("image"), 
    createProduct
);
router.put(
  "/:id",
  protect,
  authorize("farmer"),
  upload.single("image"),
  updateProduct
);
router.delete("/:id", protect, authorize("farmer"), deleteProduct);


module.exports = router;