# Requirements Document

## Introduction

This document defines the functional requirements for a full-stack clothing e-commerce platform. The system is composed of two primary modules: a **User Module** for shoppers (browsing, cart, checkout, payments, order history) and an **Admin Module** for staff (order management, user data, inventory/product management). The frontend is built with React.js and Tailwind CSS; the backend is built with Node.js and Express.js. Payments are processed via Stripe. Authentication is handled using JWTs.

---

## Glossary

- **System**: The clothing e-commerce platform as a whole (frontend + backend).
- **API**: The Express.js RESTful backend server.
- **Auth_Service**: The authentication and authorization subsystem (JWT middleware, bcrypt helpers).
- **User**: A registered shopper with role `'user'`.
- **Admin**: A registered staff member with role `'admin'`.
- **Product_Catalog**: The module responsible for managing and serving product data.
- **Cart_Service**: The module responsible for managing shopping cart state.
- **Order_Service**: The module responsible for creating and tracking orders.
- **Payment_Service**: The module responsible for creating and verifying Stripe payment intents.
- **Admin_Service**: The module responsible for admin-facing operations (order management, user management, product CRUD).
- **Stripe**: The third-party payment gateway used for processing payments.
- **JWT**: JSON Web Token used for stateless authentication.
- **OrderStatus**: An enumeration with values `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to create an account, so that I can shop and track my orders.

#### Acceptance Criteria

1. WHEN a registration request is submitted with a valid name, valid email, and a password of at least 8 characters, THE Auth_Service SHALL create a new User record with `role = 'user'` and return HTTP 201 with a signed JWT.
2. WHEN a registration request is submitted with an email that already exists in the database, THE Auth_Service SHALL return HTTP 409 without creating any record.
3. WHEN a registration request is submitted with a missing or malformed required field (name, email, or password), THE Auth_Service SHALL return HTTP 422 before performing any database operation.
4. THE Auth_Service SHALL store the user's password as a bcrypt hash with a work factor of 12 and SHALL NOT store the plain-text password.
5. WHEN a new User is created, THE Auth_Service SHALL include the `userId` and `role` in the signed JWT payload.

---

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my credentials, so that I can access my account and make purchases.

#### Acceptance Criteria

1. WHEN a login request is submitted with a valid email and matching password, THE Auth_Service SHALL return HTTP 200 with a signed JWT containing `userId` and `role`.
2. WHEN a login request is submitted with an email that does not exist in the database, THE Auth_Service SHALL return HTTP 401 with a generic error message.
3. WHEN a login request is submitted with a correct email but incorrect password, THE Auth_Service SHALL return HTTP 401 with the same generic error message used for an unknown email.
4. THE Auth_Service SHALL sign JWTs using HS256 with a secure random secret and set an expiry of 7 days.
5. WHEN a request is made with an expired or tampered JWT, THE Auth_Service SHALL return HTTP 401 before processing the request.

---

### Requirement 3: Product Catalog Browsing

**User Story:** As a shopper, I want to browse and search products, so that I can find clothing items to purchase.

#### Acceptance Criteria

1. WHEN a request is made to retrieve the product list, THE Product_Catalog SHALL return a paginated list of products including `id`, `name`, `description`, `price`, `stock`, `category`, and `imageUrl`.
2. WHEN a `category` filter parameter is provided, THE Product_Catalog SHALL return only products belonging to that category.
3. WHEN a `search` query parameter is provided, THE Product_Catalog SHALL return only products whose name or description matches the search term.
4. WHEN `page` and `limit` pagination parameters are provided, THE Product_Catalog SHALL return the correct subset of results and include `total`, `page`, and `limit` in the response.
5. THE Product_Catalog SHALL support a default page size of 20 and a maximum page size of 100.
6. WHEN a request is made for a single product by ID, THE Product_Catalog SHALL return the full product detail or HTTP 404 if the product does not exist.

---

### Requirement 4: Shopping Cart Management

**User Story:** As a shopper, I want to manage a shopping cart, so that I can collect items before checkout.

#### Acceptance Criteria

1. WHEN an authenticated user adds a product to the cart with a quantity of at least 1 and the product has sufficient stock, THE Cart_Service SHALL insert or increment the cart item and return HTTP 200 with the updated cart.
2. WHEN an authenticated user attempts to add a product whose stock is 0, THE Cart_Service SHALL return an error and SHALL NOT modify the cart.
3. WHEN an authenticated user attempts to add a quantity that would cause the total cart quantity for a product to exceed available stock, THE Cart_Service SHALL return an error and SHALL NOT modify the cart.
4. WHEN an authenticated user updates the quantity of an existing cart item to a valid positive integer that does not exceed stock, THE Cart_Service SHALL update the quantity and return the updated cart.
5. WHEN an authenticated user removes a product from the cart, THE Cart_Service SHALL delete the corresponding cart item and return the updated cart.
6. WHEN an authenticated user retrieves their cart, THE Cart_Service SHALL return all current cart items with product details and quantities.
7. IF the request to add or update a cart item is unauthenticated, THEN THE Cart_Service SHALL return HTTP 401.

---

### Requirement 5: Checkout and Payment Processing

**User Story:** As a shopper, I want to pay for my cart items using a credit/debit card, so that I can complete a purchase.

#### Acceptance Criteria

1. WHEN an authenticated user requests a payment intent for a non-empty cart, THE Payment_Service SHALL create a Stripe payment intent and return a `clientSecret`, the `amount` in cents, and the `currency`.
2. THE Payment_Service SHALL calculate the payment intent amount as the sum of `(product.price × quantity)` for all cart items at the time of intent creation.
3. WHEN the Stripe payment is confirmed by the user, THE Payment_Service SHALL NOT create an order; the frontend SHALL separately call the order creation endpoint after confirming payment.
4. IF a payment intent request is made for an empty cart, THEN THE Payment_Service SHALL return an error without calling Stripe.
5. THE Payment_Service SHALL never expose the Stripe secret key to the frontend.

---

### Requirement 6: Order Creation

**User Story:** As a shopper, I want to place an order after payment, so that I can receive the items I purchased.

#### Acceptance Criteria

1. WHEN an authenticated user submits an order with a confirmed Stripe `paymentIntentId`, a valid `cartId`, and a complete `shippingAddress`, THE Order_Service SHALL create an `Order` record with `status = 'pending'` and return HTTP 201 with the `orderId`.
2. WHEN an order is created, THE Order_Service SHALL insert `OrderItem` records capturing the `priceAtPurchase` snapshotted from the current product price at the time of order creation.
3. WHEN an order is created, THE Order_Service SHALL atomically decrement stock for each ordered product and clear the user's cart within the same database transaction.
4. IF any step within the order creation transaction fails, THEN THE Order_Service SHALL rollback all changes and return HTTP 500 with a generic error message.
5. WHEN an order creation request references a `paymentIntentId` whose Stripe status is not `'succeeded'`, THE Order_Service SHALL return an error and SHALL NOT create any order record.
6. WHEN an order creation request contains a cart item whose product has insufficient stock, THE Order_Service SHALL return HTTP 409 and SHALL NOT create any order record.
7. THE Order_Service SHALL ensure that `priceAtPurchase` on each `OrderItem` is set at creation time and is never updated retroactively.

---

### Requirement 7: Order History (User)

**User Story:** As a shopper, I want to view my past orders, so that I can track delivery status and review previous purchases.

#### Acceptance Criteria

1. WHEN an authenticated user requests their order list, THE Order_Service SHALL return all orders belonging to that user, including `id`, `status`, `totalAmount`, `shippingAddress`, and `createdAt`.
2. WHEN an authenticated user requests a specific order by ID, THE Order_Service SHALL return the full order detail including all `OrderItem` records if the order belongs to that user, or HTTP 404 otherwise.
3. IF an unauthenticated request is made to the order history endpoint, THEN THE Order_Service SHALL return HTTP 401.

---

### Requirement 8: Admin — Order Management

**User Story:** As an admin, I want to view and manage all customer orders, so that I can fulfil and track order fulfilment.

#### Acceptance Criteria

1. WHEN an authenticated admin requests the order list, THE Admin_Service SHALL return all orders across all users, joined with user information.
2. WHEN an authenticated admin applies filters (by `status`, `userId`, `dateFrom`, `dateTo`), THE Admin_Service SHALL return only the orders matching all supplied filter criteria.
3. WHEN an authenticated admin updates an order's status to a valid `OrderStatus` value, THE Admin_Service SHALL persist the new status and return HTTP 200 with the updated order.
4. WHEN a request is made to an admin order endpoint with a JWT whose role is not `'admin'`, THE Admin_Service SHALL return HTTP 403.
5. WHEN a request is made to an admin order endpoint without a valid JWT, THE Admin_Service SHALL return HTTP 401.
6. WHEN an admin requests a non-existent order by ID, THE Admin_Service SHALL return HTTP 404.

---

### Requirement 9: Admin — User Management

**User Story:** As an admin, I want to view user profiles and their order history, so that I can understand customer behaviour and resolve issues.

#### Acceptance Criteria

1. WHEN an authenticated admin requests the user list, THE Admin_Service SHALL return all registered users with their profile information.
2. WHEN an authenticated admin requests a specific user by ID, THE Admin_Service SHALL return the user's profile along with their full order history.
3. WHEN a request is made to an admin user endpoint with a JWT whose role is not `'admin'`, THE Admin_Service SHALL return HTTP 403.
4. WHEN an admin requests a non-existent user by ID, THE Admin_Service SHALL return HTTP 404.

---

### Requirement 10: Admin — Product Management

**User Story:** As an admin, I want to create, update, and delete products, so that I can maintain the product catalog.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a valid product creation request with a non-empty name, positive integer price (in cents), non-negative stock, category, and imageUrl, THE Admin_Service SHALL create a new `Product` record and return HTTP 201.
2. WHEN an authenticated admin submits a product update request for an existing product, THE Admin_Service SHALL update the specified fields and return HTTP 200 with the updated product.
3. WHEN an authenticated admin deletes an existing product, THE Admin_Service SHALL remove the product record and return HTTP 200.
4. WHEN a product creation or update request contains invalid data (e.g., negative price, empty name), THE Admin_Service SHALL return HTTP 422 without modifying the database.
5. WHEN a request is made to an admin product endpoint with a JWT whose role is not `'admin'`, THE Admin_Service SHALL return HTTP 403.

---

### Requirement 11: Authorization and Role Enforcement

**User Story:** As a system operator, I want all routes to enforce authentication and role-based access control, so that data is protected from unauthorised access.

#### Acceptance Criteria

1. THE Auth_Service SHALL enforce JWT validation on all protected routes before any business logic is executed.
2. WHEN a request is made to any `/api/admin/*` route with a non-admin JWT, THE Auth_Service SHALL return HTTP 403 before any data is read or written.
3. WHEN a request is made to any `/api/admin/*` route without a JWT, THE Auth_Service SHALL return HTTP 401.
4. WHILE a user has role `'user'`, THE Auth_Service SHALL permit access to all `/api/*` user-facing endpoints but SHALL deny access to all `/api/admin/*` endpoints.

---

### Requirement 12: Input Validation

**User Story:** As a system operator, I want all API inputs to be validated, so that malformed data never reaches the database.

#### Acceptance Criteria

1. WHEN any API endpoint receives a request with missing required fields, THE API SHALL return HTTP 422 before performing any database operation.
2. WHEN any API endpoint receives a request with a field that fails type or format constraints (e.g., invalid email, non-integer quantity), THE API SHALL return HTTP 422 with a descriptive error message.
3. THE API SHALL sanitize all user-supplied string inputs to prevent SQL injection and XSS attacks before persisting data.

---

### Requirement 13: Security

**User Story:** As a system operator, I want the platform to follow security best practices, so that user data and payments are protected.

#### Acceptance Criteria

1. THE Auth_Service SHALL apply rate limiting to all `/api/auth/*` endpoints to mitigate brute-force attacks.
2. THE API SHALL configure CORS to allow only the designated frontend origin in production.
3. THE Payment_Service SHALL create all Stripe payment intents server-side and SHALL NOT return the Stripe secret key in any API response.
4. THE Auth_Service SHALL hash all passwords using bcrypt with a minimum work factor of 12 before storing them.

---

### Requirement 14: Frontend User Experience

**User Story:** As a shopper, I want a responsive and intuitive interface, so that I can browse, cart, and checkout with ease.

#### Acceptance Criteria

1. THE System SHALL provide a product listing page with a grid layout, filters, and a search bar.
2. THE System SHALL provide a product detail page showing full product information and an add-to-cart action.
3. THE System SHALL provide a cart view (drawer or page) displaying all current cart items, quantities, and a total price.
4. THE System SHALL provide a checkout page with a Stripe payment form and a shipping address form.
5. THE System SHALL provide an order history page listing the authenticated user's past orders and their statuses.
6. WHEN a user is not authenticated and attempts to access a protected page, THE System SHALL redirect the user to the login page.
7. WHEN a payment fails, THE System SHALL display the Stripe error message and preserve the cart state so the user can retry.

---

### Requirement 15: Admin Dashboard

**User Story:** As an admin, I want a dedicated dashboard, so that I can monitor key business metrics and access management tools.

#### Acceptance Criteria

1. THE System SHALL provide an admin dashboard page displaying key performance indicators including total revenue and count of pending orders.
2. THE System SHALL provide an orders management table with filtering by status, sortable columns, and the ability to update order status in place.
3. THE System SHALL provide a user management table allowing an admin to view user profiles and navigate to individual order histories.
4. THE System SHALL provide a product management page with forms for creating, editing, and deleting products.
5. WHEN an unauthenticated or non-admin user attempts to access any admin page, THE System SHALL redirect the user to the login page.

---

### Requirement 16: Data Serialization and API Contract

**User Story:** As a developer, I want all API responses to follow a consistent JSON contract, so that the frontend can reliably parse and display data.

#### Acceptance Criteria

1. THE API SHALL serialize all monetary values (prices, totals) as integers representing cents in JSON responses.
2. THE API SHALL serialize all date/time values as ISO 8601 strings in JSON responses.
3. WHEN the API returns a paginated list, THE API SHALL include `products` (or equivalent array), `total`, `page`, and `limit` fields in the response body.
4. THE API SHALL serialize and deserialize `OrderStatus` values consistently using the string literals `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`.
5. FOR ALL valid data objects, serializing then deserializing SHALL produce an equivalent object (round-trip property).
