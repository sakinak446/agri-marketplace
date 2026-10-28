const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

const fail = (status, message) => Object.assign(new Error(message), { status });
const transitions = { pending: "confirmed", confirmed: "shipped", shipped: "delivered" };

function validateCheckout(body = {}) {
  if (!body || typeof body !== "object") throw fail(400, "Provide an order request");
  const { items, deliveryAddress, paymentMethod = "COD" } = body;
  if (!Array.isArray(items) || !items.length || items.length > 100) {
    throw fail(400, "Provide between 1 and 100 order items");
  }
  if (typeof deliveryAddress !== "string" || deliveryAddress.trim().length < 10 || deliveryAddress.trim().length > 1000) {
    throw fail(400, "Delivery address must contain 10 to 1000 characters");
  }
  if (paymentMethod !== "COD") throw fail(400, "Only cash on delivery is supported");
  const seen = new Set();
  for (const item of items) {
    if (!item || typeof item.product !== "string" || !mongoose.isObjectIdOrHexString(item.product)) {
      throw fail(400, "Each item must have a valid product ID");
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw fail(400, "Quantities must be positive whole numbers");
    }
    const id = item.product.toLowerCase();
    if (seen.has(id)) throw fail(400, "Duplicate products are not allowed");
    seen.add(id);
  }
  return { items, deliveryAddress: deliveryAddress.trim(), paymentMethod };
}

function sendError(res, error) {
  const unsupported = error.code === 20 || error.code === 303 || /Transaction numbers are only allowed|does not support retryable writes/i.test(error.message);
  const retryable = error.hasErrorLabel?.("TransientTransactionError") || error.hasErrorLabel?.("UnknownTransactionCommitResult");
  return res.status(unsupported || retryable ? 503 : error.status || 500).json({
    success: false,
    message: unsupported
      ? "Orders require MongoDB Atlas or a replica set with transaction support. No order was placed."
      : retryable
        ? "Order confirmation is unavailable. Check My Orders before trying again."
        : error.status ? error.message : "Unable to process orders. Please try again later.",
  });
}

async function createOrder(req, res) {
  let session;
  try {
    const input = validateCheckout(req.body);
    session = await mongoose.startSession();
    let order;
    await session.withTransaction(async () => {
      const snapshots = [];
      let totalCents = 0;
      // Keep operations sequential: parallel operations are unsupported in transactions.
      for (const item of input.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) throw fail(409, "A product is no longer available. Review your cart.");
        const cents = Math.round(product.price * 100);
        if (!Number.isFinite(product.price) || product.price < 0 || !Number.isSafeInteger(cents) || !product.farmer) {
          throw fail(409, `Invalid product details for ${product.name}`);
        }
        if (!Number.isFinite(product.quantity) || product.quantity < item.quantity) {
          throw fail(409, `Insufficient stock for ${product.name}. Review your cart.`);
        }
        const lineCents = cents * item.quantity;
        totalCents += lineCents;
        if (!Number.isSafeInteger(lineCents) || !Number.isSafeInteger(totalCents)) throw fail(400, "Order amount is too large");
        const update = await Product.updateOne(
          { _id: product._id, quantity: { $gte: item.quantity }, price: product.price, farmer: product.farmer },
          { $inc: { quantity: -item.quantity } },
          { session }
        );
        if (update.modifiedCount !== 1) throw fail(409, `Insufficient stock for ${product.name}. Review your cart.`);
        snapshots.push({ product: product._id, farmer: product.farmer, name: product.name, price: cents / 100, quantity: item.quantity, unit: product.unit, status: "pending" });
      }
      [order] = await Order.create([{
        consumer: req.user._id, items: snapshots, totalAmount: totalCents / 100,
        deliveryAddress: input.deliveryAddress, paymentMethod: "COD",
      }], { session });
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
    return res.status(201).json({ success: true, order });
  } catch (error) {
    return sendError(res, error);
  } finally {
    if (session) await session.endSession();
  }
}

async function myOrders(req, res) {
  try {
    const orders = await Order.find({ consumer: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, orders });
  } catch (error) { return sendError(res, error); }
}

function farmerView(order, farmerId) {
  const items = order.items.filter(item => String(item.farmer) === String(farmerId))
    .map(item => ({ ...item, status: order.status === "cancelled" ? "cancelled" : item.status || order.status || "pending" }));
  return {
    _id: order._id, createdAt: order.createdAt, deliveryAddress: order.deliveryAddress,
    paymentMethod: order.paymentMethod, items,
    farmerTotal: Math.round(items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0)) / 100,
  };
}

async function farmerOrders(req, res) {
  try {
    const orders = await Order.find({ "items.farmer": req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, orders: orders.map(order => farmerView(order, req.user._id)) });
  } catch (error) { return sendError(res, error); }
}

async function updateItemStatus(req, res) {
  try {
    const { orderId, itemId } = req.params;
    if (![orderId, itemId].every(id => mongoose.isObjectIdOrHexString(id))) throw fail(400, "Invalid order or item ID");
    const nextStatus = req.body?.status;
    const previous = Object.keys(transitions).find(key => transitions[key] === nextStatus);
    if (!previous) throw fail(400, "Status must be confirmed, shipped or delivered");
    const existing = await Order.findOne({
      _id: orderId, items: { $elemMatch: { _id: itemId, farmer: req.user._id } },
    }).lean();
    if (!existing || existing.status === "cancelled") throw fail(409, "Item unavailable or not owned by you");
    const item = existing.items.find(entry => String(entry._id) === itemId.toLowerCase());
    if ((item.status || existing.status || "pending") !== previous) throw fail(409, "Invalid status transition. Refresh orders.");
    const order = await Order.findOneAndUpdate({
      _id: orderId,
      items: { $elemMatch: { _id: itemId, farmer: req.user._id, status: item.status || { $exists: false } } },
      // Compare legacy status too so concurrent changes cannot regress old orders.
      status: existing.status || { $exists: false },
    }, { $set: { "items.$.status": nextStatus } }, { new: true, runValidators: true }).lean();
    if (!order) throw fail(409, "Item unavailable, not owned by you, or status transition is no longer valid");
    return res.json({ success: true, order: farmerView(order, req.user._id) });
  } catch (error) { return sendError(res, error); }
}

module.exports = { createOrder, myOrders, farmerOrders, updateItemStatus, validateCheckout, farmerView };
