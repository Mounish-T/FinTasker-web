import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { User } from './src/server/models/User.js';
import { Transaction } from './src/server/models/Transaction.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-finance';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
    if (err) return res.status(401).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// User Settings
app.get('/api/user/settings', authenticateToken, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/user/settings', authenticateToken, async (req: any, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Transactions
app.get('/api/transactions', authenticateToken, async (req: any, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1, time: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/transactions', authenticateToken, async (req: any, res) => {
  try {
    const transaction = new Transaction({ ...req.body, userId: req.user.id });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/transactions/:id', authenticateToken, async (req: any, res) => {
  try {
    await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Reminder System (Cron Jobs) ---

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Reminder Cron (Runs every minute to check for users with matching reminder times)
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, '0');
  const currentMinute = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${currentHour}:${currentMinute}`;
  const currentDay = format(now, 'EEEE');
  const today = now.toISOString().split('T')[0];

  try {
    // 1. Daily Expense Reminders
    const expenseUsers = await User.find({ dailyExpenseReminderTime: currentTime });
    for (const user of expenseUsers) {
      const expenseCount = await Transaction.countDocuments({
        userId: user._id,
        type: 'expense',
        date: today
      });

      if (expenseCount === 0) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Smart Finance Reminder: Update Your Expenses',
          text: `Hi ${user.name},\n\nYou haven't added any expenses for today yet. Please update them in the app to keep your tracking accurate.\n\nBest regards,\nSmart Finance Team`,
        });
      }
    }

    // 2. Daily TruTime Reminders
    const trutimeUsers = await User.find({ 
      dailyTruTimeReminderTime: currentTime,
      enableTruTimeReminder: true 
    });
    for (const user of trutimeUsers) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Work Reminder: TruTime Update',
        text: `Hi ${user.name},\n\nThis is a friendly reminder to update today's TruTime in the OneCognizant portal.\n\nBest regards,\nSmart Finance Team`,
      });
    }

    // 3. Weekly Worksheet Reminders
    const weeklyUsers = await User.find({ 
      weeklyReminderDay: currentDay,
      weeklyReminderTime: currentTime,
      enableWeeklyWorksheetReminder: true 
    });
    for (const user of weeklyUsers) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Work Reminder: Weekly Worksheet',
        text: `Hi ${user.name},\n\nIt's time to update your weekly worksheet in the OneCognizant portal.\n\nBest regards,\nSmart Finance Team`,
      });
    }
  } catch (error) {
    console.error('Cron error:', error);
  }
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
