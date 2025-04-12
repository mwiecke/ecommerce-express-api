# E-Commerce API Design Document

## Project Overview
### Objective:
Build a scalable E-Commerce API that allows users to browse products, manage orders, and process payments securely. The backend will be built using **Express.js** and **TypeScript**, with **PostgreSQL** as the database and **AWS services** for deployment.

---

## Tech Stack
- **Backend:** Express.js (TypeScript)
- **Database:** PostgreSQL (Initially local, later AWS RDS)
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Token), bcrypt
- **Validation:** Zod
- **Caching:** Redis (For product caching & rate limiting)
- **Payment Integration:** Stripe
- **Cloud Storage:** AWS S3 (For product images)
- **Deployment:** AWS (EC2, RDS, S3)
- **Monitoring & Logging:** AWS CloudWatch

---

## Database Schema
### Users Table
| Column       | Type       | Constraints       |
|--------------|------------|-------------------|
| id           | UUID       | Primary Key       |
| Username     | VARCHAR    | Not Null          |
| First name   | VARCHAR    | Not Null          |
| Last name    | VARCHAR    | Not Null          |
| email        | VARCHAR    | Unique, Not Null  |
| password     | VARCHAR    | Nullable (for Google login) |
| google_id    | VARCHAR    | Unique, Nullable  |
| isVerified   | Boolean    |   |
| verifyToken  | VARCHAR    |  Nullable, random  |
| role         | ENUM(user, admin) | Default 'user' |
| created_at   | TIMESTAMP  | Default Now()     |

### Products Table
| Column       | Type       | Constraints       |
|--------------|------------|-------------------|
| id           | UUID       | Primary Key       |
| name         | VARCHAR    | Not Null          |
| description  | TEXT       |                   |
| price        | DECIMAL    | Not Null          |
| stock        | INT        | Default 0         |
| image_url    | VARCHAR    | AWS S3 URL        |
| created_at   | TIMESTAMP  | Default Now()     |

### Reviews Table
| Column      | Type     | Description                               |
|-------------|----------|-------------------------------------------|
| id          | UUID     | Unique review ID                          |
| product_id  | UUID     | Foreign key to the `products` table       |
| user_id     | UUID     | Foreign key to the `users` table (reviewer) |
| rating      | INT      | Rating of the product (1-5 scale)         |
| comment     | TEXT     | Comment or feedback about the product     |
| created_at  | TIMESTAMP| Timestamp when the review was created     |

### Orders Table
| Column       | Type       | Constraints       |
|--------------|------------|-------------------|
| id           | UUID       | Primary Key       |
| user_id      | UUID       | Foreign Key (Users) |
| total_price  | DECIMAL    | Not Null          |
| status       | ENUM(pending, paid, shipped) | Default 'pending' |
| created_at   | TIMESTAMP  | Default Now()     |

### Order Details Table
| Column       | Type       | Constraints       |
|--------------|------------|-------------------|
| id           | UUID       | Primary Key       |
| order_id     | UUID       | Foreign Key (Orders) |
| product_id   | UUID       | Foreign Key (Products) |
| quantity     | INT        | Not Null          |
| price        | DECIMAL    | Not Null          |

### Payment Details Table
| Column       | Type       | Constraints       |
|--------------|------------|-------------------|
| id           | UUID       | Primary Key       |
| order_id     | UUID       | Foreign Key (Orders) |
| Payment_method   | ENUM(stripe, paypal, cod)   | Default 'stripe' |
| transaction_id    | VARCHAR    | 	Unique, Not Null     |
| status   | ENUM(pending, completed, failed)   | Default 'pending'|
| created_at   | TIMESTAMP  | Default Now()     |

---

## API Endpoints
### Auth Routes
- `POST /auth/register` → Register a new user (supporting Google login)
- `POST /auth/login` → Login 
- `POST /auth/google-login` → Handle Google login
- `POST /auth/verify-email` → after login to check email
- `POST /auth/reset-password` → Handle reset-password
- `POST /auth/forgot-password` → Handle forgot-password

### Product Routes
- `GET /products` → Get all products (supports caching)
- `POST /products` → Add a new product (Admin only)
- `PUT /products/:id` → Update product (Admin only)
- `DELETE /products/:id` → Delete product (Admin only)

### Order Routes
- `get /orders` → Get all orders (Admin only)
- `GET /orders/:id` → Get order details 
- `POST /orders` → Create an order
- `PUT /orders/:id/status` → Update order status (Admin only)

### Reviews Routes
- `get /reviews` → Handle Stripe checkout
- `post /reviews` → Create a new review
- `post /reviews/:id` →  Update a review
- `DELETE /reviews/:id` → DELETE a review


### Payment Routes
- `POST /payments/checkout` → Handle Stripe checkout

---

## Authentication & Security
- Users authenticate using **JWT tokens**.
- **Bcrypt** is used to hash passwords.
- **Role-based access control** (RBAC) for admin functionalities.
- **Rate limiting** with Redis to prevent abuse.
- AWS IAM roles for secure AWS resource access.

---

## Caching & Optimization
- **Redis caching** for frequently accessed product listings.
- **Database indexing** for faster queries.
- **Lazy loading & pagination** for large datasets.

---

## Deployment Plan
### Phase 1: Local Development
- Develop and test API with PostgreSQL (pgAdmin).
- Implement authentication, products, and orders.

### Phase 2: Cloud Migration
- Move database to **AWS RDS (PostgreSQL)**.
- Deploy API on **AWS EC2**.
- Use **AWS S3** for storing product images.

### Phase 3: Scaling & Optimization
- Implement **Redis caching & rate limiting**.
- Enable **CloudWatch monitoring & logging**.
- Optimize database queries and indexing.

---

## Next Steps
1. Set up the Express.js project with TypeScript.
2. Implement user authentication with JWT and Zod validation.
3. Design database models using Prisma.
4. Develop the product and order management features.
