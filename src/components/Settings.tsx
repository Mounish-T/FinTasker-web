import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, Bell, Shield, Target, Clock } from 'lucide-react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    dailySpendingLimit: 1000,
    monthlySavingsTarget: 5000,
    minimumBalance: 500,
    dailyExpenseReminderTime: '20:00',
    dailyTruTimeReminderTime: '18:00',
    weeklyReminderDay: 'Friday',
    weeklyReminderTime: '19:00',
    enableTruTimeReminder: true,
    enableWeeklyWorksheetReminder: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/user/settings');
      setSettings(res.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put('/user/settings', settings);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Settings</h1>

      {message.text && (
        <div className={`p-4 rounded-2xl border ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 pb-12">
        {/* Financial Targets */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Target size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Financial Targets</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Spending Limit (₹)</label>
              <input
                type="number"
                value={settings.dailySpendingLimit}
                onChange={(e) => setSettings({ ...settings, dailySpendingLimit: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Monthly Savings Target (₹)</label>
              <input
                type="number"
                value={settings.monthlySavingsTarget}
                onChange={(e) => setSettings({ ...settings, monthlySavingsTarget: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Minimum Balance (₹)</label>
              <input
                type="number"
                value={settings.minimumBalance}
                onChange={(e) => setSettings({ ...settings, minimumBalance: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Reminder Settings */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Bell size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Reminder Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Expense Reminder Time</label>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <input
                    type="time"
                    value={settings.dailyExpenseReminderTime}
                    onChange={(e) => setSettings({ ...settings, dailyExpenseReminderTime: e.target.value })}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">TruTime Reminder</p>
                    <p className="text-xs text-slate-500">Daily notification for OneCognizant</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, enableTruTimeReminder: !settings.enableTruTimeReminder })}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.enableTruTimeReminder ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableTruTimeReminder ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                {settings.enableTruTimeReminder && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">TruTime Reminder Time</label>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      <input
                        type="time"
                        value={settings.dailyTruTimeReminderTime}
                        onChange={(e) => setSettings({ ...settings, dailyTruTimeReminderTime: e.target.value })}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Weekly Worksheet Reminder</p>
                  <p className="text-xs text-slate-500">Weekly notification for OneCognizant</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, enableWeeklyWorksheetReminder: !settings.enableWeeklyWorksheetReminder })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.enableWeeklyWorksheetReminder ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableWeeklyWorksheetReminder ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {settings.enableWeeklyWorksheetReminder && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Worksheet Day</label>
                    <select
                      value={settings.weeklyReminderDay}
                      onChange={(e) => setSettings({ ...settings, weeklyReminderDay: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      <option>Monday</option>
                      <option>Tuesday</option>
                      <option>Wednesday</option>
                      <option>Thursday</option>
                      <option>Friday</option>
                      <option>Saturday</option>
                      <option>Sunday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Worksheet Time</label>
                    <input
                      type="time"
                      value={settings.weeklyReminderTime}
                      onChange={(e) => setSettings({ ...settings, weeklyReminderTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
