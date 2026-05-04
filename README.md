# Service Hub Backend

This is the main REST API for Service Hub / Proxxi. It powers the consumer mobile app, the provider mobile app, and the future web/admin experience.

## What It Does

- Handles phone OTP authentication for consumers and providers.
- Manages JWT sessions, refresh tokens, logout, and role-based access.
- Stores users, consumers, providers, bookings, payments, wallets, transactions, disputes, ratings, wishlists, and OTP records in MongoDB.
- Supports provider onboarding, profile updates, services, availability, payout details, shop location, service areas, and dashboard data.
- Supports consumer profile setup, address management, provider discovery, provider details, and booking requests.
- Manages booking lifecycle actions, booking details, rescheduling data, payment prompts, and status transitions.
- Integrates Paystack payment initialization and webhook handling.
- Sends push notifications through Expo push tokens.
- Uses Cloudinary for uploaded media and Mailjet/Twilio-related utilities for communication flows.
- Includes wallet migration and provider seeding scripts.

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- JWT authentication
- Paystack integration
- Expo Server SDK
- Cloudinary
- Mailjet
- Twilio utilities
- Node Cron

## Folder Structure

- `src/controllers`: HTTP request handlers grouped by domain.
- `src/services`: Business logic for auth, bookings, payments, providers, consumers, search, wallet, notifications, and email.
- `src/models`: Mongoose models and schemas.
- `src/routes`: API routes for auth, users, consumers, providers, bookings, search, admin, and webhooks.
- `src/middlewares`: Auth and upload middleware.
- `src/configs`: Database, server, JWT, Cloudinary, Mailjet, and OTP policy configuration.
- `src/utils`: Shared helpers for tokens, OTP, booking status, ranking, routing, and responses.
- `src/scripts`: One-off scripts such as provider seeding and wallet migration.
- `src/cron`: Scheduled jobs.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the API in development:

```bash
npm run dev
```

Build TypeScript:

```bash
npm run build
```

Run the compiled server:

```bash
npm start
```

Run the API with a local tunnel:

```bash
npm run server:tunnel
```

## Useful Scripts

- `npm run dev`: Start the development server with Nodemon.
- `npm run build`: Compile TypeScript into `dist`.
- `npm start`: Run the compiled API.
- `npm run tunnel`: Expose port `6000` with LocalTunnel.
- `npm run server:tunnel`: Run the API and tunnel together.
- `npm run seed:providers`: Seed provider data.
- `npm run migrate:wallets`: Run wallet migration.

## Notes

This API is the source of truth for the mobile apps and should remain compatible with both `Consumer-app` and `Provider-app`. Web and admin functionality should also build against this API as the web folder grows.
