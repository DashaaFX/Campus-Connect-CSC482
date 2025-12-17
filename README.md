# Campus Connect Marketplace


Campus Connect is a modern, full-stack serverless marketplace for digital and physical products, engineered for reliability, scalability, and security. Built with AWS Lambda, DynamoDB, S3, Stripe, and React, it delivers seamless transactions, instant digital delivery, and robust admin workflows. 

---

## Features

- **Digital & Physical Products:** Buy, sell, and instantly download digital files or manage physical inventory. Advanced entitlement checks ensure only authorized users access digital assets.
- **Secure Payments:** Stripe integration for checkout, payment intent, full refunds, and webhook-driven order updates. Suspicious payments are flagged and downloads blocked until reviewed.
- **Admin Dashboard:** Approve/reject products, manage categories/subcategories, clean duplicates, and oversee all listings. Admins have privileged access to digital downloads and product management.
- **Authentication:** JWT-based user authentication, profile management, and Firebase support for secure, scalable user access.
- **Chat & Notifications:** Real-time chat , order status updates, and notifications for seamless user experience.
- **Digital Delivery:** S3 storage with presigned download links (default expiry: 120s), entitlement checks, and instant access for buyers, sellers, and admins.
- **Infrastructure as Code:** AWS SAM/CloudFormation templates for automated deployment, scaling, and CI/CD integration.
- **Testing:** Vitest, Testing Library, and backend test instructions for reliability and maintainability.

---

## Technologies Used

- **Backend:** AWS Lambda (serverless compute), API Gateway (REST API), DynamoDB (NoSQL data), S3 (secure storage), Stripe (payments), Secrets Manager (secure config)
- **Frontend:** React (SPA), Zustand (state management), Vite (build tool), Tailwind CSS (UI)
- **Auth:** JWT (secure tokens), Firebase (user management)
- **DevOps:** AWS SAM, CloudFormation, CI/CD pipelines
- **Testing:** Vitest, Testing Library (unit/integration)

---

## Architecture Overview

- **Serverless-first:** All backend logic runs on Lambda; no servers to manage. Scales automatically with demand.
- **Domain-driven design:** Backend organized by domain (`admin`, `auth`, `cart`, `orders`, `products`, etc.), each with its own Lambda entrypoint and helpers.
- **Data:** DynamoDB tables for users, products, orders, categories, carts, and logs. NoSQL design for scalability and performance.
- **Storage:** S3 for images and digital assets, with private access and presigned URLs for secure, time-limited downloads.
- **Payments:** Stripe Checkout and PaymentIntent, with webhook for real-time updates and refund handling.
- **Security:** Entitlement checks, JWT authentication, CORS, and IAM policies for robust access control.

---

## Setup & Deployment

1. **Clone the repo:**
   ```sh
   git clone https://github.com/Baljinnyam23/Campus-Connect-CSC482.git
   ```
2. **Frontend:**
   - Install dependencies: `cd Frontend && npm install`
   - Set `VITE_API_BASE_URL` in `.env` to your API Gateway endpoint.
   - Run: `npm run dev`
3. **Backend:**
   - Configure AWS credentials.
   - Deploy with AWS SAM/CloudFormation using `template.yaml`.
   - Set environment variables for S3, Stripe, JWT, etc.
4. **Testing:**
   - Run frontend tests: `npm run test`
   - See `TESTING.md` and `BACKEND-OPERATIONS.md` for backend test instructions.

---

## Usage

- **Buy/Sell Products:** Register, list products, purchase, and download digital files. Digital delivery is instant and secure.
- **Admin:** Approve/reject products, manage categories/subcategories, and view/download digital assets. Admins can clean duplicates and oversee all listings.
- **Payments:** Complete checkout via Stripe, receive instant access to digital products. Full refunds supported; suspicious payments flagged for review.
- **Chat:** Real-time messaging for buyers and sellers, enhancing user engagement.

---

## Security Highlights

- All digital assets stored privately in S3; download links are presigned and expire (default: 120s).
- Only entitled users (buyers, sellers, admins) can access digital downloads; unauthorized access is blocked.
- Stripe webhook events are verified for authenticity before updating orders, ensuring secure payment flows.
- JWT authentication for all protected endpoints; Firebase supported for user management.

---

## Notable Skills & Contributions

- Full-stack development: React, AWS Lambda, DynamoDB, S3, Stripe
- Cloud infrastructure automation: AWS SAM, CloudFormation, CI/CD
- Secure digital delivery, payment integration, and admin workflows
- Advanced serverless architecture and domain-driven backend design
- Real-time features (chat, notifications) and robust entitlement logic

---

## Contact

- **Author:** Dashnyam Puntsagnorov, Baljinnyam Puntsagnorov
- **Email:** dadhaap@gmail.com, baljaa367@gmail.com
- **LinkedIn:** [https://www.linkedin.com/in/dashnyam-puntsagnorov-a5647b267/](https://www.linkedin.com/in/dashnyam-puntsagnorov-a5647b267/)
- **LinkedIn:** [https://www.linkedin.com/in/baljinnyam-puntsagnorov/](https://www.linkedin.com/in/baljinnyam-puntsagnorov/)

---

## License
MIT
