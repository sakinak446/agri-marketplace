const { test } = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../models/Product");
const User = require("../models/User");
const upload = require("../middleware/uploadMiddleware");
const { updateProduct, deleteProduct, getProducts, createProduct } = require("../controllers/productController");
const { registerUser, loginUser } = require("../controllers/authController");

const farmer = "aaaaaaaaaaaaaaaaaaaaaaaa";
const otherFarmer = "bbbbbbbbbbbbbbbbbbbbbbbb";
const productId = "cccccccccccccccccccccccc";
const product = () => ({ _id: productId, farmer, price: 20, quantity: 5, name: "Tomato" });
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("product updates allow only editable fields and cannot transfer ownership or inject operators", async t => {
  t.mock.method(Product, "findById", async () => product());
  const update = t.mock.method(Product, "findByIdAndUpdate", async () => product());
  const res = response();
  await updateProduct({ params: { id: productId }, user: { _id: farmer }, body: {
    name: "Updated tomato", farmer: otherFarmer, _id: otherFarmer, createdAt: "2000-01-01", $inc: { quantity: -999 },
  } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(update.mock.calls[0].arguments[1], { $set: { name: "Updated tomato" } });
});

test("farmers cannot edit or delete another farmer's product", async t => {
  t.mock.method(Product, "findById", async () => product());
  const update = t.mock.method(Product, "findByIdAndUpdate", async () => assert.fail("unauthorized write"));
  const remove = t.mock.method(Product, "findByIdAndDelete", async () => assert.fail("unauthorized delete"));
  for (const controller of [updateProduct, deleteProduct]) {
    const res = response();
    await controller({ params: { id: productId }, user: { _id: otherFarmer }, body: { name: "Changed" } }, res);
    assert.equal(res.statusCode, 403);
  }
  assert.equal(update.mock.callCount(), 0);
  assert.equal(remove.mock.callCount(), 0);
});

function listingMock(t) {
  let captured;
  const chain = { populate() { return this; }, sort() { return this; }, skip() { return this; }, limit: async () => [] };
  t.mock.method(Product, "find", filter => { captured = filter; return chain; });
  t.mock.method(Product, "countDocuments", async () => 0);
  return () => captured;
}

test("search treats regex metacharacters as literal text", async t => {
  const filter = listingMock(t);
  const res = response();
  await getProducts({ query: { search: "(a+)+$" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(filter().name.$regex, "\\(a\\+\\)\\+\\$");
});

test("listing rejects unbounded page sizes and invalid price filters", async t => {
  listingMock(t);
  for (const query of [{ limit: "1000000" }, { page: String(Number.MAX_SAFE_INTEGER), limit: "100" }, { minPrice: "Infinity" }, { maxPrice: "-1" }, { search: "a".repeat(201) }]) {
    const res = response();
    await getProducts({ query }, res);
    assert.equal(res.statusCode, 400, `Expected validation for ${Object.keys(query).join(", ")}`);
  }
});

test("uploads have a fixed memory bound and reject non-image MIME types", () => {
  assert.equal(upload.limits?.fileSize, 5 * 1024 * 1024);
  assert.equal(upload.limits?.files, 1);
  let error;
  upload.fileFilter({}, { mimetype: "text/html" }, err => { error = err; });
  assert.equal(error.status, 400);
  let accepted;
  upload.fileFilter({}, { mimetype: "image/jpeg" }, (err, allowed) => { assert.equal(err, null); accepted = allowed; });
  assert.equal(accepted, true);
});

test("registration errors never log raw validation values", async t => {
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "create", async () => { throw new Error("synthetic-private-password-value"); });
  const log = t.mock.method(console, "error", () => {});
  const res = response();
  await registerUser({ body: { name: "Test", email: "test@example.invalid", password: "test-password" } }, res);
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map(call => call.arguments), (_, value) => value instanceof Error ? value.message : value), /synthetic-private-password-value/);
});

test("inactive accounts cannot obtain login tokens", async t => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "audit-test-only-key";
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  t.mock.method(User, "findOne", () => ({ select: async () => ({ isActive: false, comparePassword: async () => true }) }));
  t.mock.method(console, "error", () => {});
  const res = response();
  await loginUser({ body: { email: "test@example.invalid", password: "test-password" } }, res);
  assert.equal(res.statusCode, 401);
});

test("non-finite inventory prices and stock fail model validation", async () => {
  for (const field of ["price", "quantity"]) {
    const item = new Product({ name: "Synthetic", price: 1, quantity: 1, unit: "kg", category: "vegetables", farmer, [field]: Infinity });
    await assert.rejects(item.validate(), error => !!error.errors[field]);
  }
});

test("invalid credential types fail before database access", async t => {
  const find = t.mock.method(User, "findOne", () => assert.fail("must validate first"));
  for (const controller of [registerUser, loginUser]) {
    const res = response();
    await controller({ body: { name: "Synthetic", email: { $ne: null }, password: ["bad"] } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(find.mock.callCount(), 0);
});

test("product service failures never expose raw provider error messages", async t => {
  t.mock.method(Product, "create", async () => { throw new Error("synthetic-private-provider-value"); });
  const res = response();
  await createProduct({ user: { _id: farmer }, body: { name: "Synthetic", price: 1, quantity: 1, category: "vegetables", unit: "kg" } }, res);
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(JSON.stringify(res.body), /synthetic-private-provider-value/);
});

test("upload errors and malformed JSON use safe structured HTTP responses", async t => {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.post("/image", upload.single("image"), (req, res) => res.json({ success: true, size: req.file?.size || 0 }));
  app.use(require("../middleware/errorMiddleware"));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/image`;
  const cases = [["text/html", "small", 400], ["image/jpeg", new Uint8Array(5 * 1024 * 1024 + 1), 413], ["image/jpeg", "small", 200]];
  for (const [type, content, status] of cases) {
    const body = new FormData();
    body.append("image", new Blob([content], { type }), "synthetic-upload");
    const res = await fetch(url, { method: "POST", body });
    assert.equal(res.status, status);
    assert.equal((await res.json()).success, status === 200);
  }
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{invalid" });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { success: false, message: "Invalid JSON request body" });
});
