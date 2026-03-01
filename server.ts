import express from "express";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cron from "node-cron";
import nodemailer from "nodemailer";
import { format } from "date-fns";
import { fileURLToPath } from "url";

import { User } from "./src/server/models/User";
import { Transaction } from "./src/server/models/Transaction";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Needed for ES modules (__dirname replacement)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

/* ===========================
   MongoDB Connection
=========================== */

const MONGODB_URI =
  process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ===========================
   Auth Middleware
=========================== */

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ message: "No token provided" });

  jwt.verify(
    token,
    process.env.JWT_SECRET || "secret",
    (err: any, user: any) => {
      if (err)
        return res.status(403).json({ message: "Invalid token" });
      req.user = user;
      next();
    }
  );
};

/* ===========================
   API Routes
=========================== */

/* -------- Auth -------- */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* -------- User Settings -------- */

app.get("/api/user/settings", authenticateToken, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/user/settings", authenticateToken, async (req: any, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      { returnDocument: "after" }
    ).select("-password");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* -------- Transactions -------- */

app.get("/api/transactions", authenticateToken, async (req: any, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user.id,
    }).sort({ date: -1, time: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/transactions", authenticateToken, async (req: any, res) => {
  try {
    const transaction = new Transaction({
      ...req.body,
      userId: req.user.id,
    });

    await transaction.save();

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/transactions/:id", authenticateToken, async (req: any, res) => {
  try {
    await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    res.json({ message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ===========================
   Reminder System (Cron Jobs)
=========================== */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Runs every minute
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const currentDay = format(now, "EEEE");
  const currentTime = now.toTimeString().slice(0, 5);
  const today = new Date().toLocaleDateString("en-CA");

  try {
    /* ---- 1. Daily Expense Reminders ---- */

    const expenseUsers = await User.find({
      dailyExpenseReminderTime: currentTime,
    });

    for (const user of expenseUsers) {
      const expenseCount = await Transaction.countDocuments({
        userId: user._id,
        type: "expense",
        date: today,
      });
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject:
            "Smart Finance Reminder: Update Your Expenses",
          text: `Hi ${user.name},

If you want add any expenses for today, Please update them in the app to keep your tracking accurate otherwise ignore this mail.

Best regards,
FinTasker Team`,
        });
    }

    /* ---- 2. Daily TruTime Reminders ---- */

    const trutimeUsers = await User.find({
      dailyTruTimeReminderTime: currentTime,
      enableTruTimeReminder: true,
    });

    for (const user of trutimeUsers) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Work Reminder: TruTime Update",
        text: `Hi ${user.name},

This is a friendly reminder to update today's TruTime in the OneCognizant portal.

Best regards,
FinTasker Team`,
      });
    }

    /* ---- 3. Weekly Worksheet Reminders ---- */

    const weeklyUsers = await User.find({
      weeklyReminderDay: currentDay,
      weeklyReminderTime: currentTime,
      enableWeeklyWorksheetReminder: true,
    });

    for (const user of weeklyUsers) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Work Reminder: Weekly Worksheet",
        text: `Hi ${user.name},

It's time to update your weekly worksheet in the OneCognizant portal.

Best regards,
FinTasker Team`,
      });
    }
  } catch (error) {
    console.error("Cron error:", error);
  }
});

/* ===========================
   Vite + Production Setup
=========================== */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const clientPath = path.join(__dirname, "../client");

    app.use(express.static(clientPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();