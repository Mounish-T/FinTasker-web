import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Filter, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const History: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    type: 'all',
    category: 'all',
    month: 'all',
    search: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setTransactionToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await api.delete(`/transactions/${transactionToDelete}`);
      setTransactions(transactions.filter(t => t._id !== transactionToDelete));
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (error) {
      alert('Error deleting transaction');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filter.type === 'all' || t.type === filter.type;
    const matchesCategory = filter.category === 'all' || t.category === filter.category;
    const matchesMonth = filter.month === 'all' || t.date.startsWith(filter.month);
    const matchesSearch = t.description.toLowerCase().includes(filter.search.toLowerCase()) || 
                          t.category.toLowerCase().includes(filter.search.toLowerCase());
    return matchesType && matchesCategory && matchesMonth && matchesSearch;
  });

  const categories = Array.from(new Set(transactions.map(t => t.category)));
  const months = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Transaction History</h1>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search description or category..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <select
            value={filter.month}
            onChange={(e) => setFilter({ ...filter, month: e.target.value })}
            className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
          >
            <option value="all">All Months</option>
            {months.map(m => (
              <option key={m} value={m}>
                {format(new Date(m + '-01'), 'MMMM yyyy')}
              </option>
            ))}
          </select>
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-slate-900">{t.date}</p>
                      <p className="text-xs text-slate-500">{t.time}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 line-clamp-1">{t.description || '-'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => handleDelete(t._id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No transactions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <Trash2 size={24} />
              <h2 className="text-2xl font-bold">Confirm Delete</h2>
            </div>
            <p className="text-slate-600 mb-8">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTransactionToDelete(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-lg shadow-red-100 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
