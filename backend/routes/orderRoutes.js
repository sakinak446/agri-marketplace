const router = require("express").Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { createOrder, myOrders, farmerOrders, updateItemStatus } = require("../controllers/orderController");

router.use(protect);
router.post("/", authorize("consumer"), createOrder);
router.get("/my-orders", authorize("consumer"), myOrders);
router.get("/farmer-orders", authorize("farmer"), farmerOrders);
router.patch("/:orderId/items/:itemId/status", authorize("farmer"), updateItemStatus);

module.exports = router;
