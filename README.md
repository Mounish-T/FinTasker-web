# 📘 FinTasker

FinTasker is a full-stack personal finance and task management
application designed to help users track expenses, manage financial
activities, and receive automated reminders.

It provides secure authentication, an interactive dashboard with
financial insights, and scheduled email notifications to keep users
financially organized.

------------------------------------------------------------------------

## 📖 Table of Contents

-   Introduction
-   Features
-   Tech Stack
-   Project Structure
-   Installation
-   Environment Variables
-   Usage
-   Build for Production
-   Deployment (Render Example)
-   Reminder System
-   Email Configuration (Gmail)
-   Security
-   Troubleshooting
-   Contributors
-   License

------------------------------------------------------------------------

## 📌 Introduction

FinTasker helps users:

-   Track expenses and transactions\
-   Visualize financial data through interactive charts\
-   Manage financial activities and reminders\
-   Receive automated daily and weekly email notifications

------------------------------------------------------------------------

## 🚀 Features

-   🔐 User Registration & Login (JWT Authentication)\
-   🔒 Secure Password Hashing (bcrypt)\
-   💰 Expense & Transaction Tracking\
-   📊 Interactive Charts & Financial Insights\
-   ⏰ Automated Daily & Weekly Reminders\
-   📧 Email Notifications via Gmail\
-   🗄 MongoDB Atlas Integration\
-   ⚡ Fullstack Deployment (Vite + Express)

------------------------------------------------------------------------

## 🛠 Tech Stack

### Frontend

-   React\
-   Vite\
-   Tailwind CSS\
-   Chart.js\
-   React Router

### Backend

-   Node.js\
-   Express\
-   MongoDB (Mongoose)\
-   JSON Web Token (JWT)\
-   bcryptjs\
-   Nodemailer\
-   node-cron

------------------------------------------------------------------------

## 📂 Project Structure

    FinTasker/
    │
    ├── server.ts
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    │
    ├── dist/
    │   ├── client/
    │   └── server/
    │
    └── src/
        ├── components/
        ├── pages/
        ├── models/
        ├── routes/

------------------------------------------------------------------------

## 💻 Installation

### Clone the Repository

git clone https://github.com/your-username/your-repository.git\
cd FinTasker

### Install Dependencies

npm install

### Run Development Server

npm run dev

Application runs at: http://localhost:3000

------------------------------------------------------------------------

## ⚙️ Environment Variables

Create a `.env` file:

MONGODB_URI=your_mongodb_connection_string\
EMAIL_USER=your_email@gmail.com\
EMAIL_PASS=your_gmail_app_password\
JWT_SECRET=your_secret_key\
NODE_ENV=development\
PORT=3000

⚠️ Never commit your .env file.

------------------------------------------------------------------------

## 🏗 Build for Production

npm run build

### Start Production Server

npm start

------------------------------------------------------------------------

## 🌍 Deployment (Render Example)

Build Command: npm install && npm run build

Start Command: npm start

Ensure MongoDB Atlas allows external access (0.0.0.0/0).

------------------------------------------------------------------------

## ⏰ Reminder System

-   Daily expense reminder checks\
-   Daily TruTime updates\
-   Weekly worksheet reminders

Cron runs every minute to match user-configured times.

------------------------------------------------------------------------

## 📧 Email Configuration (Gmail)

1.  Enable 2-Step Verification\
2.  Generate an App Password\
3.  Use App Password as EMAIL_PASS

------------------------------------------------------------------------

## 🔐 Security

-   Password hashing with bcrypt\
-   JWT-based authentication\
-   Protected API routes\
-   Secure environment variable handling

------------------------------------------------------------------------

## 🛠 Troubleshooting

Email issues: - Verify App Password\
- Ensure environment variables are loaded

MongoDB issues: - Check MONGODB_URI\
- Verify IP whitelist

Cron issues: - Free hosting may sleep during inactivity

------------------------------------------------------------------------

## 👥 Contributors

Maintained by the project owner.

------------------------------------------------------------------------

## 📄 License

Intended for educational and personal use.
