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
import { User } from './src/server/models/User';
import { Transaction } from './src/server/models/Transaction';

import { fileURLToPath } from 'url';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const { name, username, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username.toLowerCase();
    
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) return res.status(400).json({ message: 'Username already exists' });

    const user = new User({ name, username: normalizedUsername, email: normalizedEmail, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { loginId, password } = req.body; // loginId can be email or username
    const normalizedLoginId = loginId.toLowerCase();
    const user = await User.findOne({ $or: [{ email: normalizedLoginId }, { username: normalizedLoginId }] });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, username: user.username } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'FinTasker Password Reset Code',
      text: `Your password reset code is: ${resetCode}. It will expire in 1 hour.`,
    });

    res.json({ message: 'Reset code sent to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ 
      email: normalizedEmail, 
      resetPasswordCode: code, 
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset code' });

    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
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
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1, time: -1, createdAt: -1 });
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
          subject: 'FinTasker Reminder: Update Your Expenses',
          text: `Hi ${user.name},\n\nYou haven't added any expenses for today yet. Please update them in the app to keep your tracking accurate.\n\nBest regards,\nFinTasker Team`,
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
        text: `Hi ${user.name},\n\nThis is a friendly reminder to update today's TruTime in the OneCognizant portal.\n\nBest regards,\nFinTasker Team`,
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
        text: `Hi ${user.name},\n\nIt's time to update your weekly worksheet in the OneCognizant portal.\n\nBest regards,\nFinTasker Team`,
      });
    }
  } catch (error) {
    console.error('Cron error:', error);
  }
});

// --- Vite Integration ---

export { app };

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.NETLIFY) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  if (!process.env.NETLIFY) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.NETLIFY) {
  startServer();
}
