const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");
const { createOrder, myOrders, farmerOrders, updateItemStatus, validateCheckout, farmerView } = require("../controllers/orderController");

const productId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const farmerId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const consumerId = "cccccccccccccccccccccccc";
const orderId = "dddddddddddddddddddddddd";
const itemId = "eeeeeeeeeeeeeeeeeeeeeeee";
const address = "Recipient, 12 Market Road, Pune 411001";
const valid = () => ({ items: [{ product: productId, quantity: 2 }], deliveryAddress: address });
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
}
const request = (body = valid()) => ({ body, user: { _id: consumerId } });
const sampleProduct = () => ({ _id: productId, farmer: farmerId, name: "Tomato", price: 12.35, quantity: 5, unit: "kg" });
const sampleOrder = () => ({ _id: orderId, status: "pending", items: [{ _id: itemId, farmer: farmerId, status: "pending", price: 12.35, quantity: 2 }] });

test("checkout rejects malformed input and duplicate products", () => {
  const invalid = [null, {}, { ...valid(), items: [] }, { ...valid(), items: Array(101).fill(valid().items[0]) },
    { ...valid(), deliveryAddress: "short" }, { ...valid(), deliveryAddress: {} },
    { ...valid(), paymentMethod: "card" }, { ...valid(), items: [null] },
    { ...valid(), items: [{ product: "bad-id", quantity: 1 }] },
    ...[0, -1, 1.5, "2", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(quantity => ({ ...valid(), items: [{ product: productId, quantity }] })),
    { ...valid(), items: [{ product: productId, quantity: 1 }, { product: productId.toUpperCase(), quantity: 1 }] }];
  for (const body of invalid) assert.throws(() => validateCheckout(body), error => error.status === 400);
  assert.equal(validateCheckout({ ...valid(), deliveryAddress: `  ${address}  ` }).deliveryAddress, address);
});

function transactionMocks(t) {
  const session = { withTransaction: async fn => fn(), endSession: async () => {} };
  const start = t.mock.method(mongoose, "startSession", async () => session);
  const end = t.mock.method(session, "endSession", async () => {});
  t.mock.method(Product, "findById", () => ({ session: async supplied => { assert.equal(supplied, session); return sampleProduct(); } }));
  const update = t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  const create = t.mock.method(Order, "create", async docs => [{ _id: orderId, ...docs[0] }]);
  return { session, start, end, update, create };
}

test("checkout ignores supplied totals, price, stock and farmer and uses session-bound guarded stock updates", async t => {
  const mocks = transactionMocks(t);
  const req = request({ ...valid(), totalAmount: 0, farmer: consumerId, items: [{ product: productId, quantity: 2, price: 0, stock: 999, farmer: consumerId }] });
  const res = response();
  await createOrder(req, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.order.totalAmount, 24.7);
  assert.equal(res.body.order.consumer, consumerId);
  assert.equal(res.body.order.items[0].farmer, farmerId);
  assert.equal(res.body.order.items[0].price, 12.35);
  assert.deepEqual(mocks.update.mock.calls[0].arguments, [
    { _id: productId, quantity: { $gte: 2 }, price: 12.35, farmer: farmerId },
    { $inc: { quantity: -2 } }, { session: mocks.session },
  ]);
  assert.equal(mocks.create.mock.calls[0].arguments[1].session, mocks.session);
  assert.equal(mocks.end.mock.callCount(), 1);
});

test("insufficient stock aborts the transaction callback and never creates an order", async t => {
  const mocks = transactionMocks(t);
  mocks.update.mock.mockImplementation(async () => ({ modifiedCount: 0 }));
  let aborted = false;
  mocks.session.withTransaction = async fn => { try { await fn(); } catch (err) { aborted = true; throw err; } };
  const res = response();
  await createOrder(request(), res);
  assert.equal(res.statusCode, 409);
  assert.equal(aborted, true);
  assert.equal(mocks.create.mock.callCount(), 0);
  assert.equal(mocks.end.mock.callCount(), 1);
});

test("deleted products and invalid database prices reject checkout", async t => {
  const mocks = transactionMocks(t);
  const find = t.mock.method(Product, "findById", () => ({ session: async () => null }));
  for (const product of [null, { ...sampleProduct(), price: -5 }, { ...sampleProduct(), price: Infinity }]) {
    find.mock.mockImplementation(() => ({ session: async () => product }));
    const res = response();
    await createOrder(request(), res);
    assert.equal(res.statusCode, 409);
  }
  assert.equal(mocks.create.mock.callCount(), 0);
  assert.equal(mocks.update.mock.callCount(), 0);
});

test("unsupported transactions fail safely without fallback stock writes", async t => {
  const mocks = transactionMocks(t);
  mocks.session.withTransaction = async () => { throw Object.assign(new Error("unsupported"), { code: 20 }); };
  const res = response();
  await createOrder(request(), res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /replica set/);
  assert.equal(mocks.update.mock.callCount(), 0);
  assert.equal(mocks.create.mock.callCount(), 0);
});

test("unknown commit results tell consumers to check history", async t => {
  const mocks = transactionMocks(t);
  mocks.session.withTransaction = async () => { throw Object.assign(new Error("internal details"), { hasErrorLabel: label => label === "UnknownTransactionCommitResult" }); };
  const res = response();
  await createOrder(request(), res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /Check My Orders/);
  assert.doesNotMatch(res.body.message, /internal details/);
});

test("order insertion failure is propagated out of transaction and session is closed", async t => {
  const mocks = transactionMocks(t);
  mocks.create.mock.mockImplementation(async () => { throw new Error("private database details"); });
  let aborted = false;
  mocks.session.withTransaction = async fn => { try { await fn(); } catch (err) { aborted = true; throw err; } };
  const res = response();
  await createOrder(request(), res);
  assert.equal(res.statusCode, 500);
  assert.equal(aborted, true);
  assert.equal(mocks.end.mock.callCount(), 1);
  assert.doesNotMatch(res.body.message, /private database/);
});

test("farmer projection excludes other farmers and full order totals", () => {
  const order = { ...sampleOrder(), totalAmount: 999, consumer: consumerId, items: [...sampleOrder().items, { farmer: consumerId, price: 900, quantity: 1 }] };
  const view = farmerView(order, farmerId);
  assert.equal(view.items.length, 1);
  assert.equal(view.farmerTotal, 24.7);
  assert.equal(view.totalAmount, undefined);
  assert.equal(view.consumer, undefined);
});

test("histories scope database queries to the authenticated user", async t => {
  const queries = [];
  t.mock.method(Order, "find", filter => { queries.push(filter); return { sort: () => ({ lean: async () => [sampleOrder()] }) }; });
  const consumerRes = response();
  await myOrders(request(), consumerRes);
  assert.deepEqual(queries[0], { consumer: consumerId });
  const farmerRes = response();
  await farmerOrders({ user: { _id: farmerId } }, farmerRes);
  assert.deepEqual(queries[1], { "items.farmer": farmerId });
  assert.equal(farmerRes.body.orders[0].items.length, 1);
});

test("status updates guard ownership and previous status in the atomic write", async t => {
  t.mock.method(Order, "findOne", filter => {
    assert.equal(filter.items.$elemMatch.farmer, farmerId);
    return { lean: async () => sampleOrder() };
  });
  const update = t.mock.method(Order, "findOneAndUpdate", () => ({ lean: async () => ({ ...sampleOrder(), items: [{ ...sampleOrder().items[0], status: "confirmed" }] }) }));
  const res = response();
  await updateItemStatus({ params: { orderId, itemId }, user: { _id: farmerId }, body: { status: "confirmed" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(update.mock.calls[0].arguments[0].items.$elemMatch, { _id: itemId, farmer: farmerId, status: "pending" });
  assert.deepEqual(update.mock.calls[0].arguments[1], { $set: { "items.$.status": "confirmed" } });
});

test("unauthorized, stale, cancelled and skipped status changes do not write", async t => {
  const find = t.mock.method(Order, "findOne", () => ({ lean: async () => null }));
  const update = t.mock.method(Order, "findOneAndUpdate", () => { throw new Error("must not write"); });
  for (const existing of [null, { ...sampleOrder(), status: "cancelled" }, { ...sampleOrder(), items: [{ ...sampleOrder().items[0], status: "delivered" }] }]) {
    find.mock.mockImplementation(() => ({ lean: async () => existing }));
    const res = response();
    await updateItemStatus({ params: { orderId, itemId }, user: { _id: farmerId }, body: { status: "confirmed" } }, res);
    assert.equal(res.statusCode, 409);
  }
  assert.equal(update.mock.callCount(), 0);
});

test("legacy item status inherits the old order status without migration", async t => {
  const legacy = { ...sampleOrder(), status: "shipped", items: [{ _id: itemId, farmer: farmerId, price: 1, quantity: 1 }] };
  assert.equal(farmerView(legacy, farmerId).items[0].status, "shipped");
  t.mock.method(Order, "findOne", () => ({ lean: async () => legacy }));
  const update = t.mock.method(Order, "findOneAndUpdate", () => ({ lean: async () => ({ ...legacy, items: [{ ...legacy.items[0], status: "delivered" }] }) }));
  const res = response();
  await updateItemStatus({ params: { orderId, itemId }, user: { _id: farmerId }, body: { status: "delivered" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(update.mock.calls[0].arguments[0].items.$elemMatch.status, { $exists: false });
  assert.equal(update.mock.calls[0].arguments[0].status, "shipped");
});

test("JWT middleware rejects missing tokens and role middleware rejects the wrong role", async () => {
  const res = response();
  await protect({ headers: {} }, res, () => assert.fail("must not authorize"));
  assert.equal(res.statusCode, 401);
  const roleRes = response();
  authorize("consumer")({ user: { role: "farmer" } }, roleRes, () => assert.fail("must not authorize"));
  assert.equal(roleRes.statusCode, 403);
});

test("JWT middleware permits an active user and rejects inactive accounts", async t => {
  // Ephemeral test-only signing key; never load application environment files.
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "unit-test-only-key";
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  const token = jwt.sign({ id: consumerId }, process.env.JWT_SECRET);
  const find = t.mock.method(User, "findById", () => ({ select: async () => ({ _id: consumerId, role: "consumer", isActive: true }) }));
  const req = { headers: { authorization: `Bearer ${token}` } };
  let authorized = false;
  await protect(req, response(), () => { authorized = true; });
  assert.equal(authorized, true);
  find.mock.mockImplementation(() => ({ select: async () => ({ isActive: false }) }));
  const res = response();
  await protect(req, res, () => assert.fail("must not authorize"));
  assert.equal(res.statusCode, 401);
});

test("order routes enforce authentication and consumer/farmer roles over HTTP", async t => {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/orders", require("../routes/orderRoutes"));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "route-test-only-key";
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  t.mock.method(User, "findById", id => ({ select: async () => ({ _id: id, isActive: true, role: id === farmerId ? "farmer" : "consumer" }) }));
  const base = `http://127.0.0.1:${server.address().port}/api/orders`;
  const endpoints = [["POST", ""], ["GET", "/my-orders"], ["GET", "/farmer-orders"], ["PATCH", `/${orderId}/items/${itemId}/status`]];
  for (const [method, path] of endpoints) {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401);
  }
  for (const [method, path, id] of [
    ["POST", "", farmerId], ["GET", "/my-orders", farmerId],
    ["GET", "/farmer-orders", consumerId], ["PATCH", `/${orderId}/items/${itemId}/status`, consumerId],
  ]) {
    const res = await fetch(base + path, { method, headers: { Authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}` } });
    assert.equal(res.status, 403);
  }
  const invalidCheckout = await fetch(base, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ id: consumerId }, process.env.JWT_SECRET)}` }, body: JSON.stringify({ items: [] }),
  });
  assert.equal(invalidCheckout.status, 400);
});

test("a concurrent item transition cannot overwrite a newer status", async t => {
  t.mock.method(Order, "findOne", () => ({ lean: async () => sampleOrder() }));
  t.mock.method(Order, "findOneAndUpdate", () => ({ lean: async () => null }));
  const res = response();
  await updateItemStatus({ params: { orderId, itemId }, user: { _id: farmerId }, body: { status: "confirmed" } }, res);
  assert.equal(res.statusCode, 409);
});

test("malformed status updates fail validation before database access", async () => {
  for (const [params, status] of [[{ orderId: "bad", itemId }, "confirmed"], [{ orderId, itemId }, "cancelled"], [{ orderId, itemId }, { $ne: "pending" }]]) {
    const res = response();
    await updateItemStatus({ params, user: { _id: farmerId }, body: { status } }, res);
    assert.equal(res.statusCode, 400);
  }
});
