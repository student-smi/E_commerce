# Implementation Plan: Clothing E-Commerce Website

## Overview

This plan breaks the clothing e-commerce platform into 17 sequential tasks covering project scaffolding, database setup, backend API modules (auth, products, cart, payments, orders, admin), frontend React modules (auth, product catalog, cart, checkout, order history, admin dashboard), role-based access control, input validation, and testing with property-based tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3, 4] },
    { "wave": 4, "tasks": [5] },
    { "wave": 5, "tasks": [6, 9] },
    { "wave": 6, "tasks": [7, 10] },
    { "wave": 7, "tasks": [8, 11] },
    { "wave": 8, "tasks": [12] },
    { "wave": 9, "tasks": [13] },
    { "wave": 10, "tasks": [14] },
    { "wave": 11, "tasks": [15] },
    { "wave": 12, "tasks": [16] },
    { "wave": 13, "tasks": [17] }
  ]
}
```

## Tasks

- [x] 1. Project Scaffolding
  - Initialize the backend Node.js/Express project with TypeScript support
    - Create `backend/` directory with `package.json`, `tsconfig.json`
    - Install dependencies: `express`, `jsonwebtoken`, `bcryptjs`, `stripe`, `zod`, `cors`, `express-rate-limit`, `dotenv`
    - Install dev dependencies: `typescript`, `ts-node`, `nodemon`, `jest`, `@types/*`
    - Set up folder structure: `src/routes/`, `src/middleware/`, `src/controllers/`, `src/models/`, `src/lib/`
    - Create `.env.example` with `PORT`, `JWT_SECRET`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `CLIENT_ORIGIN`
    - Create `src/app.ts` with Express app setup (CORS, JSON body parser, rate limiter)
    - Create `src/server.ts` entry point
  - Initialize the frontend React project with Vite + TypeScript
    - Create `frontend/` directory using Vite (`npm create vite@latest`)
    - Install dependencies: `tailwindcss`, `react-router-dom`, `@tanstack/react-query`, `axios`, `zustand`, `@stripe/stripe-js`, `@stripe/react-stripe-js`
    - Configure Tailwind CSS (`tailwind.config.js`, `postcss.config.js`)
    - Set up folder structure: `src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/store/`
    - Create `src/lib/api.ts` Axios instance with base URL and auth interceptor
    - Create `.env` with `VITE_API_BASE_URL` and `VITE_STRIPE_PUBLISHABLE_KEY`
  - **Verification**: Both dev servers start without errors; Axios instance resolves to backend URL

- [x] 2. Database Schema Setup
  - Create the database schema script covering all tables
    - `users` table: `id` (UUID PK), `name`, `email` (unique), `password_hash`, `role` (default `'user'`), `created_at`, `updated_at`
    - `products` table: `id` (UUID PK), `name`, `description`, `price` (integer cents), `stock` (integer >= 0), `category`, `image_url`, `created_at`, `updated_at`
    - `carts` table: `id` (UUID PK), `user_id` (FK users), `created_at`
    - `cart_items` table: `cart_id` (FK carts), `product_id` (FK products), `quantity` (integer >= 1), composite PK `(cart_id, product_id)`
    - `orders` table: `id` (UUID PK), `user_id` (FK users), `status` (enum), `total_amount` (integer cents), `shipping_address` (JSON), `payment_intent_id`, `created_at`, `updated_at`
    - `order_items` table: `order_id` (FK orders), `product_id` (FK products), `quantity`, `price_at_purchase` (integer cents), composite PK `(order_id, product_id)`
  - Add database indexes for performance
    - Index on `products(category)`, `products(created_at)`, `products(stock)`
    - Composite index on `cart_items(cart_id, product_id)`
    - Index on `orders(user_id)`, `orders(status)`, `orders(created_at)`
  - Create `src/lib/db.ts` database connection and query helper
  - Seed script with sample categories and products
  - **Verification**: Schema runs without errors; seed data inserts successfully; indexes are created

- [x] 3. Auth Module — Backend
  - Implement Zod validation schemas for auth requests
    - `RegisterSchema`: `{ name: string (non-empty), email: valid email, password: min 8 chars }`
    - `LoginSchema`: `{ email: string, password: string }`
  - Implement `POST /api/auth/register` controller
    - Validate body with `RegisterSchema`; return 422 on failure
    - Check for duplicate email; return 409 if exists
    - Hash password with bcrypt (work factor 12)
    - Insert new user with `role = 'user'`
    - Sign JWT with `{ userId, role }` payload and 7-day expiry
    - Return HTTP 201 with `{ userId, token }`
  - Implement `POST /api/auth/login` controller
    - Validate body; find user by email; compare bcrypt hash
    - Return HTTP 200 with JWT on success; HTTP 401 with generic message on failure
  - Implement `requireAuth` middleware
    - Extract Bearer token from `Authorization` header
    - Verify JWT signature and expiry; attach `req.user` payload
    - Return HTTP 401 on missing or invalid token
  - Implement `requireAdmin` middleware
    - Check `req.user.role === 'admin'`; return HTTP 403 if not admin
  - Apply `express-rate-limit` to all `/api/auth/*` routes (max 20 req/15 min)
  - **Verification**: Register returns 201 + JWT; duplicate email returns 409; login with wrong password returns 401; expired JWT returns 401; admin middleware blocks non-admin

- [x] 4. Auth Module — Frontend
  - Create Zustand auth store (`src/store/authStore.ts`)
    - State: `{ token, userId, role, isAuthenticated }`
    - Actions: `login(token, userId, role)`, `logout()`
    - Persist token to `localStorage`
  - Create `LoginPage` component (`src/pages/LoginPage.tsx`)
    - Form with email and password fields (Tailwind styled)
    - Submit calls `POST /api/auth/login`; on success stores token and redirects
    - Display error message on 401
  - Create `RegisterPage` component (`src/pages/RegisterPage.tsx`)
    - Form with name, email, password fields
    - Submit calls `POST /api/auth/register`; on success logs in and redirects
    - Display validation errors from API
  - Create `ProtectedRoute` component — redirects unauthenticated users to `/login`
  - Create `AdminRoute` component — redirects non-admin users to `/login`
  - Configure Axios interceptor to attach `Authorization: Bearer <token>`; on 401 response call `logout()` and redirect to `/login`
  - **Verification**: Login stores token; protected pages redirect when not authenticated; logout clears state

- [x] 5. Product Catalog — Backend
  - Implement Zod schemas for product create/update
    - `CreateProductSchema`: `{ name: non-empty string, description, price: positive integer, stock: integer >= 0, category, imageUrl }`
    - `UpdateProductSchema`: partial of CreateProductSchema
  - Implement `GET /api/products` with query params `category`, `search`, `page` (default 1), `limit` (default 20, max 100)
    - Build dynamic query with optional WHERE clauses for category and search
    - Return `{ products, total, page, limit }`
  - Implement `GET /api/products/:id` — return product detail or HTTP 404
  - Implement admin product CRUD (protected by `requireAuth` + `requireAdmin`):
    - `POST /api/admin/products` — create product, return HTTP 201
    - `PUT /api/admin/products/:id` — update product, return HTTP 200
    - `DELETE /api/admin/products/:id` — delete product, return HTTP 200
    - Validate with Zod schemas; return 422 on invalid input, 404 if not found
  - **Verification**: Product list returns paginated results; filters work; admin CRUD requires admin JWT; invalid data returns 422

- [x] 6. Cart — Backend
  - Implement cart helper to get or create a cart for a user
  - Implement `GET /api/cart` — return all cart items with product details for authenticated user
  - Implement `POST /api/cart/add` controller
    - Validate `{ productId, quantity >= 1 }`
    - Check product exists and `stock > 0`
    - If cart item exists: increment quantity; check total does not exceed stock
    - If new item: insert cart item
    - Return HTTP 200 with updated cart
  - Implement `PATCH /api/cart/update` — validate new quantity; check stock; update cart item
  - Implement `DELETE /api/cart/remove/:productId` — remove cart item; return updated cart
  - All cart routes protected by `requireAuth`
  - **Verification**: Add to cart works; quantity exceeding stock returns error; unauthenticated requests return 401

- [x] 7. Payments — Backend
  - Initialize Stripe SDK with `STRIPE_SECRET_KEY` from env
  - Implement `POST /api/payments/intent` controller (protected by `requireAuth`)
    - Retrieve user's cart items; return error if cart is empty
    - Calculate total as sum of `(product.price × quantity)` in cents
    - Create Stripe payment intent; return `{ clientSecret, amount, currency }`
    - Never return `STRIPE_SECRET_KEY` in any response
  - **Verification**: Payment intent created with correct amount; empty cart returns error; Stripe key not leaked

- [x] 8. Orders — Backend
  - Implement `POST /api/orders` controller (protected by `requireAuth`)
    - Validate `{ cartId, paymentIntentId, shippingAddress }` with Zod
    - Verify Stripe payment intent status is `'succeeded'`; return error if not
    - Retrieve cart items; return error if empty
    - Check stock for all items; return HTTP 409 if any item is out of stock
    - Begin database transaction: insert Order, insert OrderItems with `priceAtPurchase` snapshot, decrement stock, clear cart
    - Commit and return HTTP 201 with `{ orderId }`; on failure rollback and return HTTP 500
  - Implement `GET /api/orders` — return authenticated user's own orders
  - Implement `GET /api/orders/:id` — return order detail if it belongs to the requesting user; HTTP 404 otherwise
  - **Verification**: Order created atomically; stock decremented; cart cleared; unconfirmed payment returns error; out-of-stock returns 409

- [x] 9. Product Catalog — Frontend
  - Create `useProducts` hook using React Query — accepts filter params; calls `GET /api/products`
  - Create `ProductCard` component — image, name, price, category, add-to-cart button
  - Create `ProductListPage` (`src/pages/ProductListPage.tsx`)
    - Responsive grid (2 cols mobile, 4 cols desktop) with Tailwind
    - Category filter dropdown and search input
    - Pagination controls; loading spinner
  - Create `ProductDetailPage` (`src/pages/ProductDetailPage.tsx`)
    - Full product info, quantity selector, add-to-cart button, out-of-stock indicator
  - Configure React Router routes: `/products` and `/products/:id`
  - **Verification**: Product grid renders; filters update results; detail page loads correctly; out-of-stock shown

- [x] 10. Cart — Frontend
  - Create Zustand cart store (`src/store/cartStore.ts`) — state: `{ items }`; actions: `setCart`, `clearCart`
  - Create `useCart` hook — fetches cart from `GET /api/cart` using React Query
  - Create `CartDrawer` component (`src/components/CartDrawer.tsx`)
    - Slide-in drawer with items, quantity controls, remove buttons, total, "Proceed to Checkout" button
  - Create `CartPage` (`src/pages/CartPage.tsx`) as full-page fallback
  - Add cart icon with item count badge to navigation header
  - **Verification**: Items added appear in cart; quantity updates recalculate total; empty cart shows empty state

- [x] 11. Checkout — Frontend
  - Wrap app with Stripe `Elements` provider using `VITE_STRIPE_PUBLISHABLE_KEY`
  - Create `CheckoutPage` (`src/pages/CheckoutPage.tsx`)
    - Shipping address form (line1, city, state, postalCode, country)
    - Stripe `PaymentElement` for card input
    - On submit: call payment intent → confirm payment → create order → navigate to confirmation
    - On payment failure: display Stripe error; preserve cart
  - Create `OrderConfirmationPage` with order ID and success message
  - **Verification**: Full checkout flow completes end-to-end; payment failure shows error and preserves cart

- [x] 12. Order History — Frontend
  - Create `useOrders` hook — fetches from `GET /api/orders` using React Query
  - Create `OrderHistoryPage` — list of past orders with ID, status badge, total, date; clickable rows
  - Create `OrderDetailPage` — full order breakdown with items, quantities, prices, shipping, status; 404 handling
  - **Verification**: Order history lists user's orders; detail page shows correct items; 404 handled gracefully

- [x] 13. Admin Module — Backend
  - Implement `GET /api/admin/orders` with filters (`status`, `userId`, `dateFrom`, `dateTo`) and pagination
    - Join orders with users; apply dynamic WHERE clauses; return `{ orders, total, page, limit }`
  - Implement `PATCH /api/admin/orders/:id` — validate new status; update and return order
  - Implement `GET /api/admin/users` — return all users (exclude `passwordHash`)
  - Implement `GET /api/admin/users/:id` — return user profile + full order history
  - Implement `GET /api/admin/stats` — return `{ totalRevenue, pendingOrderCount, totalUsers, totalProducts }`
  - All routes protected by `requireAuth` + `requireAdmin`
  - **Verification**: Non-admin JWT returns 403; filters work; stats return correct aggregates; user list excludes passwords

- [x] 14. Admin Module — Frontend
  - Create `AdminLayout` with sidebar navigation (Dashboard, Orders, Users, Products)
  - Create `AdminDashboardPage` — KPI cards fetched from `GET /api/admin/stats`
  - Create `AdminOrdersPage` — filterable table with inline status update dropdown
  - Create `AdminUsersPage` — user table with click-through to individual order history
  - Create `AdminProductsPage` — product table with create/edit/delete modal form
  - **Verification**: KPIs load; order status updates persist; product CRUD works; non-admin users cannot reach admin pages

- [x] 15. Role-Based Access Control
  - Apply `ProtectedRoute` to all user routes requiring auth: `/cart`, `/checkout`, `/orders`, `/orders/:id`
  - Apply `AdminRoute` to all admin routes: `/admin/*`
  - Verify backend middleware chain: `requireAuth` runs before `requireAdmin` on all admin routes
  - Add integration tests: unauthenticated → 401; user-role JWT on admin endpoint → 403
  - **Verification**: All protected routes enforce auth; admin routes enforce admin role on both frontend and backend

- [x] 16. Input Validation and Error Handling
  - Create global Zod validation middleware returning `{ error, details }` with HTTP 422 on failure
  - Ensure Zod schemas cover all POST/PUT/PATCH endpoints not already validated
  - Implement global Express error handler — log server-side; return generic HTTP 500 to client
  - Frontend: Axios interceptor displays toast for 500 errors; maps 422 details to form field errors
  - **Verification**: Missing required field returns 422; invalid OrderStatus returns 422; frontend shows field-level errors

- [x] 17. Testing
  - Backend unit tests (Jest):
    - `requireAuth`: valid token passes; expired token → 401; missing token → 401
    - `requireAdmin`: admin role passes; user role → 403
    - `authenticate()`: correct credentials return token; wrong password → 401
    - `addToCart()`: exceeding stock returns error; valid add returns updated cart
    - `createOrder()`: unconfirmed payment → error; out-of-stock → 409; success clears cart
  - Property-based tests (fast-check):
    - Cart invariant: for any sequence of valid add/update ops, quantity never exceeds stock
    - Order total: `order.totalAmount === sum(priceAtPurchase × quantity)` for all items
    - JWT roundtrip: `verify(sign(payload, secret), secret)` returns equivalent payload
    - Pagination: `results.length <= limit` holds for all page/limit combinations
  - Integration tests:
    - Full checkout flow: register → browse → add to cart → payment intent → create order → verify in history
    - Admin flow: login as admin → view orders → update status → verify persisted
    - Auth protection: 401/403 on protected routes without/with wrong role
  - **Verification**: All unit tests pass; property-based tests pass with 100+ generated cases; integration tests cover happy paths and key error scenarios

## Notes

- The database schema script will be provided separately by the user for integration testing. Until then, use the schema defined in Task 2 as the reference.
- Stripe test mode keys should be used during development and testing. Never commit real Stripe keys.
- All monetary values (prices, totals) are stored and transmitted as integers in cents. Display formatting (e.g., dividing by 100 for USD) is handled on the frontend only.
- The `priceAtPurchase` field on `OrderItem` is immutable after creation — no update operation should touch it.
- Property-based tests should be run with at least 100 generated test cases per property to provide meaningful coverage.
