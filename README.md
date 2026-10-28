# Agri Marketplace

A MERN marketplace connecting farmers and consumers, built with React, Vite, Tailwind CSS, Express, MongoDB/Mongoose, JWT and Cloudinary.

## Tech stack and structure

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router, Axios |
| Backend | Node.js, Express 5, Mongoose 9, MongoDB |
| Authentication | JWT with expiry, bcrypt password hashing, role middleware |
| Images | Cloudinary via Multer memory uploads; JPEG, PNG, WebP or GIF, maximum 5 MB |
| Checks | Oxlint, Vite production build, Node's built-in test runner |

`src/pages` contains screens, `src/components` shared UI, `src/context/CartContext.jsx` cart state, and `src/utils/orderApi.js` order API requests. `backend` separates models, controllers, middleware, routes and tests. No additional frontend environment variables are required for local use.

## Roles

Visitors can browse products and register. Consumers can manage their cart, place COD orders and view only their own order history. Farmers can create, edit and delete only their own products and advance fulfillment only for their own order items. The user schema includes an admin value, but public registration accepts only farmer/consumer and this MVP has no admin UI or admin-management endpoints. Protected API requests validate the JWT and the current active user from MongoDB; localStorage role values are only a UI convenience.

## Local setup

1. Install Node.js supported by the installed Vite release (Node 22.12+ or a compatible newer release) and npm.
2. Run `npm ci` in the project root and `npm ci` inside `backend` using the included lockfiles.
3. Copy `backend/.env.example` to `backend/.env`, then replace its placeholders with private development values for these variable names:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN` (optional; defaults to 7d)
   - `PORT` (optional; defaults to port 5000)
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Use development MongoDB Atlas or a local MongoDB replica set. **Order placement requires transactions.** Standalone MongoDB can serve other features, but checkout returns HTTP 503 without falling back to non-atomic stock deductions.
5. Inside `backend`, run `npm run dev` (or `npm start`). In the project root, run `npm run dev` and open the printed Vite URL.

Existing frontend API URLs target `http://localhost:5000`; keep that backend port for local use. New order requests use `src/utils/orderApi.js`. Cloudinary credentials stay on the backend. Never commit environment files or log authentication responses.

Use a random private JWT signing secret. To generate a new development secret locally, run `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, put the output only in your private `.env`, restart the API and log in again. Replacing the secret invalidates existing login tokens. Do not include this value in screenshots or submission files.

The root/backend Git ignore rules exclude `.env` and `.env.*` while allowing `.env.example`. Only the example should accompany the submission. Ignore rules do not remove files already tracked in another Git checkout: inspect that checkout's index and history separately. This workspace currently has no project Git metadata; do not infer that remote history has been checked.

## Features

- Farmer/consumer registration, JWT login, protected routes and server-enforced roles.
- Farmer product CRUD and Cloudinary image uploads.
- Product search, category/price/stock filters, sorting and pagination.
- Per-user localStorage cart, quantity controls, price/stock synchronization and deleted-product handling.
- Consumer checkout with delivery address, current product summary and cash on delivery (COD) only. Delivery is free for this MVP.
- Server-owned order snapshots and totals calculated in integer paise, conditional stock deductions and atomic order creation in a MongoDB transaction.
- Consumer order history and farmer fulfillment management. Farmers receive only their own items and subtotal.
- Per-item status: pending -> confirmed -> shipped -> delivered. Steps cannot be skipped or reversed.
- Loading, empty, validation, error and confirmation states; cart clears only after a successful order response.

There is no online payment integration or cancellation/restocking endpoint.

## API

Base path: `/api`. Protected endpoints use Bearer JWT authentication. JSON responses include `success` and a descriptive `message` for errors.

| Method | Endpoint | Access / purpose |
| --- | --- | --- |
| GET | `/health` | Public health check |
| POST | `/auth/register` | Public registration |
| POST | `/auth/login` | Public login |
| GET | `/auth/me` | Authenticated profile |
| GET | `/products` | Public listing; search (literal text, max 200 characters), category, minPrice, maxPrice, inStock, sort, page, limit (1-100) |
| GET | `/products/:id` | Public details |
| GET | `/products/my-products` | Farmer product list |
| POST | `/products` | Farmer creation; multipart optional image |
| PUT | `/products/:id` | Owning farmer update; multipart optional image |
| DELETE | `/products/:id` | Owning farmer deletion |
| POST | `/orders` | Consumer checkout |
| GET | `/orders/my-orders` | Consumer's own orders, newest first |
| GET | `/orders/farmer-orders` | Farmer's own items grouped by order, newest first |
| PATCH | `/orders/:orderId/items/:itemId/status` | Owning farmer's next fulfillment step |

Checkout accepts `items` (1-100 unique products, each with `product` as its ID and `quantity` as a positive safe integer), `deliveryAddress` (a trimmed string of 10-1000 characters) and optional `paymentMethod` (COD only). Client prices, totals, farmer IDs and stock are ignored. Duplicate product IDs are rejected. Unit prices are rounded to paise before calculating totals. Success returns HTTP 201 with `{ success, order }`.

Status updates accept `{ "status": "confirmed" }`, followed by shipped and delivered. The atomic write checks ownership and previous status to prevent concurrent requests from regressing fulfillment. Farmer responses contain only owned items, delivery details and `farmerTotal`; they exclude other farmers' items, consumer account data and the full order total.

Order endpoint errors: 400 for invalid checkout input, status or IDs; 401 for authentication failure; 403 for incorrect role; 409 for unavailable products/stock or stale/unauthorized item transitions; 503 for unsupported transactions or unresolved transaction results; 500 for unexpected server errors. Internal database details are not exposed.

Product edits accept only name, price, unit, quantity, category and description, plus the uploaded image. Ownership and client-supplied MongoDB operators cannot be edited. Prices/stock must be finite non-negative numbers. Upload failures return JSON with HTTP 400 (unsupported type/fields) or 413 (oversized image); malformed JSON returns HTTP 400.

The original top-level `status` is retained for legacy records. New fulfillment uses `items[].status`; the top-level field is not an aggregate status for new orders. Legacy items without a status inherit the original order status for display and can advance without a migration. Legacy cancelled orders cannot be fulfilled. No destructive migration is required.

If confirmation times out or a commit result is uncertain, check My Orders before retrying. Duplicate clicks are prevented while checkout is in flight; cross-request idempotency is outside this MVP.

## Verification

From the root:

```sh
npm run lint
npm run build
npm audit --omit=dev
```

From `backend`:

```sh
npm test
npm audit --omit=dev
```

Tests use Node's built-in runner and mocked persistence. They cover validation, trusted pricing, guarded stock writes and session usage, transaction error handling, history scoping, farmer item isolation, legacy fulfillment and JWT/role middleware. They never load backend/.env or connect to a database. Actual rollback and concurrent checkout behavior require integration verification on a dedicated development replica set.

For a local manual smoke test, create two farmers and a consumer, add products from both farmers and checkout as the consumer. Confirm each farmer sees only their items, advance an item through every status and check consumer history. Check empty carts, deleted products, insufficient stock and interrupted requests. Verify a failed multi-product order deducts no stock and simultaneous purchases of the last unit yield only one success. Use a dedicated development database for these checks.

## Known limitations and submission checks

- COD only, free delivery, no cancellation, restocking, refunds or online payment. Order histories are not paginated.
- Checkout duplicate clicks are blocked in flight, but there is no persistent idempotency key. Check My Orders after an interrupted confirmation before retrying.
- API URLs and permissive CORS suit localhost development. Login throttling, security headers and production session hardening are not implemented; this is not a production deployment review. JWTs are stored in localStorage.
- Cart prices/stock refresh on cart entry and checkout validation, not continuously. A stale or offline cart is not proof of purchasable stock. Cross-tab updates and quantity changes should be checked manually.
- Some older pages have console-only error reporting, incomplete loading/empty states and unassociated form labels. Filter controls have accessible names, but no full screen-reader/browser accessibility audit has been executed. Malformed saved user JSON can require clearing local site data and logging in again.
- Product category selectors currently expose vegetables only, although the backend schema supports other categories. Rapid filter changes can leave stale requests racing. These pre-existing UI limitations were not refactored during the submission audit.
- Build, lint and backend tests are executable checks, not proof of live database concurrency or browser responsiveness. The successful checkout and farmer-status manual workflows were reported by the project owner; the audit did not repeat them against a live database.

Before submission, use only a dedicated development database: verify the new litre option and upload restrictions, keyboard navigation and 320/375/768px layouts; register a consumer, add to cart and reload to confirm persistence; and run authorization/stock edge cases with two farmer accounts. For rollback, submit an order with an in-stock first item and an unavailable second item: expect HTTP 409 and unchanged first-item stock. For contention, send two concurrent API orders for one remaining unit: expect one success and one stock conflict, with no negative quantity. Never run these checks against live data.

In the actual Git checkout or final archive, exclude all private `.env*` files except `.env.example`, local backups, `node_modules` and generated build files. Check `git ls-files -- .env '.env.*' backend/.env 'backend/.env.*'` and ensure only placeholders-only examples appear. Review history locally for credential exposure; if anything private was ever shared, rotate it privately before submission. No deployment, push or history rewrite is required by these instructions.
