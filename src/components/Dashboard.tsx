import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title 
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [formData, setFormData] = useState({
    amount: '',
    category: 'FN Breakfast',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, settingsRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/user/settings')
      ]);
      setTransactions(transRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayTransactions = transactions.filter(t => t.date === today);
  
  const todayIncome = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const todayExpense = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
  
  const monthIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthBalance = monthIncome - monthExpense;
  const totalBalance = totalIncome - totalExpense;
  const savings = Math.max(0, monthBalance);
  const savingsProgress = settings ? (savings / settings.monthlySavingsTarget) * 100 : 0;

  const categoryData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = {
    labels: Object.keys(categoryData),
    datasets: [{
      data: Object.values(categoryData),
      backgroundColor: [
        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
      ],
    }]
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date();
      const time = format(now, 'HH:mm');
      await api.post('/transactions', {
        ...formData,
        amount: parseFloat(formData.amount),
        type: modalType,
        time
      });
      setShowAddModal(false);
      setFormData({
        amount: '',
        category: modalType === 'income' ? 'Income' : 'FN Breakfast',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      fetchData();
    } catch (error) {
      alert('Error adding transaction');
    }
  };

  const barData = {
    labels: ['Income', 'Expense', 'Savings'],
    datasets: [{
      label: 'Monthly Overview (₹)',
      data: [monthIncome, monthExpense, savings],
      backgroundColor: ['rgba(16, 185, 129, 0.6)', 'rgba(239, 68, 68, 0.6)', 'rgba(59, 130, 246, 0.6)'],
      borderColor: ['#10b981', '#ef4444', '#3b82f6'],
      borderWidth: 1,
    }]
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { 
              setModalType('income'); 
              setFormData(prev => ({ ...prev, category: 'Income' }));
              setShowAddModal(true); 
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus size={20} /> Add Income
          </button>
          <button 
            onClick={() => { 
              setModalType('expense'); 
              setFormData(prev => ({ ...prev, category: 'FN Breakfast' }));
              setShowAddModal(true); 
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus size={20} /> Add Expense
          </button>
        </div>
      </div>

      {/* Alerts */}
      {settings && todayExpense > settings.dailySpendingLimit && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700 animate-pulse">
          <AlertCircle className="shrink-0" />
          <p className="font-medium">Warning: You have exceeded your daily spending limit of ₹{settings.dailySpendingLimit}!</p>
        </div>
      )}
      {settings && monthBalance < settings.minimumBalance && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 text-amber-700">
          <AlertCircle className="shrink-0" />
          <p className="font-medium">Alert: Your monthly balance is below the minimum required balance of ₹{settings.minimumBalance}.</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Today's Income" 
          value={`₹${todayIncome}`} 
          icon={<TrendingUp className="text-emerald-600" />} 
          color="bg-emerald-50" 
        />
        <StatCard 
          title="Today's Expense" 
          value={`₹${todayExpense}`} 
          icon={<TrendingDown className="text-red-600" />} 
          color="bg-red-50" 
        />
        <StatCard 
          title="Month Balance" 
          value={`₹${monthBalance}`} 
          icon={<Wallet className="text-blue-600" />} 
          color="bg-blue-50" 
        />
        <StatCard 
          title="Total Balance" 
          value={`₹${totalBalance}`} 
          icon={<Wallet className="text-indigo-600" />} 
          color="bg-indigo-50" 
        />
        <StatCard 
          title="Daily Limit" 
          value={`₹${settings?.dailySpendingLimit || 0}`} 
          icon={<Target className="text-purple-600" />} 
          color="bg-purple-50" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Savings Progress */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900">Monthly Savings Progress</h2>
            <div className="text-right">
              <p className="text-sm text-slate-500">Target: ₹{settings?.monthlySavingsTarget}</p>
              <p className="text-lg font-bold text-emerald-600">₹{savings} saved</p>
            </div>
          </div>
          <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div 
              className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-1000"
              style={{ width: `${Math.min(100, savingsProgress)}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 text-center">
            {savingsProgress >= 100 ? 'Goal achieved! 🎉' : `${Math.round(savingsProgress)}% of your monthly goal`}
          </p>
        </div>

        {/* Reminder Status */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Reminder Status</h2>
          <div className="space-y-4">
            <ReminderItem 
              label="Daily Expense Entry" 
              status={todayExpense > 0} 
              time={settings?.dailyReminderTime} 
            />
            <ReminderItem 
              label="TruTime Update" 
              status={settings?.enableTruTimeReminder} 
              isToggle 
            />
            <ReminderItem 
              label="Weekly Worksheet" 
              status={settings?.enableWeeklyWorksheetReminder} 
              isToggle 
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Monthly Overview</h2>
          <div className="h-64">
            <Bar data={barData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Expense Categories</h2>
          <div className="h-64 flex items-center justify-center">
            {Object.keys(categoryData).length > 0 ? (
              <Pie data={pieData} options={{ maintainAspectRatio: false }} />
            ) : (
              <p className="text-slate-400">No expenses recorded yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {transactions.slice(0, 5).map((t) => (
              <div key={t._id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{t.category}</p>
                    <p className="text-xs text-slate-500">{t.time} • {t.date}</p>
                  </div>
                </div>
                <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}₹{t.amount}
                </p>
              </div>
            ))}
          </div>
        </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Add {modalType}</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              {modalType === 'expense' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option>FN Breakfast</option>
                    <option>AN Lunch</option>
                    <option>Tea / Snacks</option>
                    <option>Dinner</option>
                    <option>Travel</option>
                    <option>Shopping</option>
                    <option>Bills</option>
                    <option>Others</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="What was this for?"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

const ReminderItem = ({ label, status, time, isToggle }: any) => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
    <div className="flex items-center gap-3">
      {status ? <CheckCircle2 className="text-emerald-500" size={20} /> : <XCircle className="text-slate-300" size={20} />}
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {time && <p className="text-xs text-slate-500">Scheduled: {time}</p>}
      </div>
    </div>
    {isToggle && (
      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
        {status ? 'Enabled' : 'Disabled'}
      </div>
    )}
  </div>
);

export default Dashboard;
