import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaCreditCard, FaSearch, FaCheckCircle, FaBookOpen, FaReceipt, FaGraduationCap, FaPlusCircle, FaBuilding, FaStore } from 'react-icons/fa';
import RecordPhysicalPaymentModal from '../components/RecordPhysicalPaymentModal';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPhysicalPaymentModal, setShowPhysicalPaymentModal] = useState(false);

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = isAdmin 
        ? 'http://localhost:5000/api/payments/all'
        : 'http://localhost:5000/api/payments/my-payments';

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast.error('Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhysicalPaymentSuccess = (newPayment) => {
    fetchPayments(); // Refresh list
  };

  // Filter payments by course title, transaction ID, student name, method, or grade
  const filteredPayments = payments.filter((item) => {
    const query = searchQuery.toLowerCase();
    const courseTitle = item.course?.title?.toLowerCase() || '';
    const txId = item.transactionId?.toLowerCase() || '';
    const studentName = item.student?.name?.toLowerCase() || '';
    const regNo = item.student?.registrationNumber?.toLowerCase() || '';
    const grade = item.student?.grade?.toLowerCase() || '';
    const method = item.paymentMethod?.toLowerCase() || '';

    return courseTitle.includes(query) || txId.includes(query) || studentName.includes(query) || regNo.includes(query) || grade.includes(query) || method.includes(query);
  });

  const totalSpent = filteredPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d1b64]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans text-gray-800 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-8 rounded-[30px] text-white shadow-xl">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-white/10 rounded-2xl text-amber-400 text-2xl">💳</span>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Course Payment History</h2>
                <p className="text-indigo-200 text-sm mt-1">
                  {isAdmin 
                    ? 'Administrative audit view of all student course fee transactions (Online & Counter Payments)' 
                    : 'Track and manage your enrolled course fee payment receipts'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Total Collected Badge */}
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-right">
              <span className="text-xs text-indigo-200 uppercase tracking-wider block font-semibold">Total Paid</span>
              <span className="text-2xl font-extrabold text-amber-400">LKR {totalSpent.toLocaleString()}</span>
            </div>

            {/* Admin Action Button: Record Counter Payment */}
            {isAdmin && (
              <button
                onClick={() => setShowPhysicalPaymentModal(true)}
                className="px-5 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-extrabold text-xs rounded-2xl shadow-lg transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <FaPlusCircle className="text-base" /> Record Counter Payment (Physical)
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-[#2d1b64] rounded-2xl flex items-center justify-center text-xl font-bold">
              <FaReceipt />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Transactions</p>
              <p className="text-2xl font-extrabold text-gray-800">{filteredPayments.length}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl font-bold">
              <FaCheckCircle />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Payment Status</p>
              <p className="text-2xl font-extrabold text-emerald-600">Settled ✓</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl font-bold">
              <FaGraduationCap />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Enrolled Grade</p>
              <p className="text-2xl font-extrabold text-indigo-900">
                {user?.grade ? (user.grade.toLowerCase().startsWith('grade') ? user.grade : `Grade ${user.grade}`) : 'Grade Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="relative w-full md:w-96">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by course title, receipt ID, student name, or grade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium transition"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Showing <span className="text-gray-800 font-bold">{filteredPayments.length}</span> payment records
          </span>
        </div>

        {/* Payments Table */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-[30px] p-16 text-center border border-gray-200/80 shadow-sm">
            <div className="w-20 h-20 bg-purple-50 text-[#2d1b64] rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              💳
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Payment Records Found</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {searchQuery ? 'No payment transactions matched your search criteria.' : 'You have not made any course fee payments yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[30px] shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Course Name</th>
                    <th className="py-4 px-6">Payment Mode & Method</th>
                    {isAdmin && <th className="py-4 px-6">Student</th>}
                    <th className="py-4 px-6">Receipt / Transaction ID</th>
                    <th className="py-4 px-6">Payment Date</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredPayments.map((item) => {
                    const isCounterPayment = item.paymentMethod === 'CASH_COUNTER' || item.paymentMethod === 'POS_CARD' || item.paymentMethod === 'BANK_TRANSFER' || item.transactionId?.startsWith('REC-PHYS');
                    const studentGrade = item.student?.grade || user?.grade || 'N/A';
                    const formattedGrade = studentGrade.toLowerCase().startsWith('grade') ? studentGrade : `Grade ${studentGrade}`;
                    const formattedDate = item.paymentDate || item.createdAt 
                      ? new Date(item.paymentDate || item.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A';

                    return (
                      <tr key={item._id} className="hover:bg-purple-50/30 transition-colors">
                        {/* Course Name */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-[#2d1b64] rounded-xl flex items-center justify-center text-lg font-bold">
                              📖
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{item.course?.title || 'Course Fee'}</p>
                              <span className="text-[11px] text-purple-700 font-bold block">
                                {formattedGrade}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Payment Mode & Method Badge */}
                        <td className="py-4 px-6">
                          {isCounterPayment ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 font-bold rounded-lg text-xs border border-amber-200">
                                🏫 Counter Payment (Physical)
                              </span>
                              <span className="text-[10px] text-amber-800 font-semibold block mt-1">
                                Method: {item.paymentMethod || 'CASH'}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-900 font-bold rounded-lg text-xs border border-blue-200">
                                💳 Online Gateway Payment
                              </span>
                              <span className="text-[10px] text-blue-700 font-semibold block mt-1">
                                Card ending in {item.cardLastFour || '4242'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Student Name (Admin only) */}
                        {isAdmin && (
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-bold text-gray-800 flex items-center gap-1">
                                {item.student?.name || 'Student'}
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-700">
                                  {item.student?.studentType === 'physical' ? '🏫 Physical' : '💻 Online'}
                                </span>
                              </p>
                              <p className="text-xs text-gray-400">{item.student?.registrationNumber || item.student?.email}</p>
                            </div>
                          </td>
                        )}

                        {/* Transaction ID */}
                        <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-700">
                          {item.transactionId || 'N/A'}
                        </td>

                        {/* Date */}
                        <td className="py-4 px-6 text-gray-600 font-medium text-xs">
                          {formattedDate}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-6">
                          <span className="font-extrabold text-emerald-700">
                            LKR {(item.amount || 2500).toLocaleString()}.00
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Record Physical Payment Modal for Admin */}
      <RecordPhysicalPaymentModal
        isOpen={showPhysicalPaymentModal}
        onClose={() => setShowPhysicalPaymentModal(false)}
        onSuccess={handlePhysicalPaymentSuccess}
      />
    </div>
  );
};

export default Payments;
