import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dailySpendingLimit: { type: Number, default: 1000 },
  monthlySavingsTarget: { type: Number, default: 5000 },
  minimumBalance: { type: Number, default: 500 },
  dailyExpenseReminderTime: { type: String, default: '20:00' },
  dailyTruTimeReminderTime: { type: String, default: '18:00' },
  weeklyReminderDay: { type: String, default: 'Friday' },
  weeklyReminderTime: { type: String, default: '19:00' },
  enableTruTimeReminder: { type: Boolean, default: true },
  enableWeeklyWorksheetReminder: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export const User = mongoose.model('User', userSchema);
