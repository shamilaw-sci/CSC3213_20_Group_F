import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  FaSms,
  FaToggleOn,
  FaToggleOff,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaServer,
  FaCoins,
  FaUserCheck,
  FaInfoCircle,
  FaBell,
  FaHistory
} from 'react-icons/fa';

const SmsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [settings, setSettings] = useState({
    smsEnabled: true,
    isConfigured: false,
    senderId: 'Kirula Edu',
    gateway: 'simulator',
    balance: null,
    profile: null,
    dashboardUrl: 'https://app.text.lk/dashboard'
  });

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Text.lk gateway integration from LuminaLearn Admin Portal.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Fetch Settings & Text.lk Status
  const fetchSettings = async (showToast = false) => {
    try {
      if (showToast) setRefreshingBalance(true);
      const res = await api.get('/settings/sms');
      if (res.data && res.data.success) {
        setSettings(res.data);
        if (showToast) {
          toast.success('SMS units and gateway status refreshed!');
        }
      }
    } catch (err) {
      console.error('Failed to load SMS settings:', err);
      toast.error(err.response?.data?.error || 'Failed to load SMS settings');
    } finally {
      setLoading(false);
      setRefreshingBalance(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle Toggle Switch
  const handleToggle = async () => {
    const nextState = !settings.smsEnabled;
    setToggling(true);

    // Optimistic UI update
    setSettings(prev => ({ ...prev, smsEnabled: nextState }));

    try {
      const res = await api.put('/settings/sms', { smsEnabled: nextState });
      if (res.data && res.data.success) {
        toast.success(res.data.message || `SMS Service turned ${nextState ? 'ON' : 'OFF'}`);
      }
    } catch (err) {
      // Revert on error
      setSettings(prev => ({ ...prev, smsEnabled: !nextState }));
      toast.error(err.response?.data?.error || 'Failed to update SMS setting');
    } finally {
      setToggling(false);
    }
  };

  // Handle Test SMS
  const handleSendTestSMS = async (e) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error('Please enter a recipient phone number and test message.');
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await api.post('/settings/sms/test', {
        phone: testPhone.trim(),
        message: testMessage.trim()
      });

      setTestResult({
        type: 'success',
        message: res.data.message || 'Test SMS sent successfully!',
        details: res.data.details
      });
      toast.success('Test SMS dispatched successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to dispatch test SMS.';
      setTestResult({
        type: 'error',
        message: errMsg
      });
      toast.error(errMsg);
    } finally {
      setSendingTest(false);
    }
  };

  // Parse remaining units
  const getRemainingUnits = () => {
    if (!settings.balance) return null;
    if (typeof settings.balance === 'object') {
      return settings.balance.remaining_balance ?? settings.balance.remaining_unit ?? settings.balance.unit ?? settings.balance.balance ?? JSON.stringify(settings.balance);
    }
    return settings.balance;
  };

  const getExpiryDate = () => {
    if (!settings.balance || typeof settings.balance !== 'object') return null;
    return settings.balance.expired_on || null;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200">

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl text-amber-400 shadow-inner border border-white/20">
                <FaSms />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">SMS Gateway Settings</h1>
                <p className="text-xs text-purple-200">Manage Text.lk SMS integration, master delivery switches, and live balance.</p>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border ${settings.smsEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
              : 'bg-red-500/20 text-red-300 border-red-400/40'
              }`}>
              {settings.smsEnabled ? <FaCheckCircle className="text-emerald-400" /> : <FaExclamationTriangle className="text-red-400" />}
              {settings.smsEnabled ? 'SMS SERVICE ACTIVE' : 'SMS SERVICE PAUSED'}
            </span>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border ${settings.isConfigured
              ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
              }`}>
              <FaServer />
              {settings.isConfigured ? 'Text.lk Live Gateway' : 'Simulator Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Master Switch & Gateway Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Master Toggle Card (Span 2) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Master Switch Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaShieldAlt className="text-purple-600 dark:text-purple-400" /> Master SMS Notification Switch
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Global toggle for automated SMS alerts across the entire LuminaLearn platform.
                </p>
              </div>

              {/* Big Interactive Toggle Switch */}
              <button
                type="button"
                onClick={handleToggle}
                disabled={toggling}
                className={`relative inline-flex h-10 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${settings.smsEnabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'
                  }`}
              >
                <span className="sr-only">Toggle SMS Service</span>
                <span
                  className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-xs font-bold ${settings.smsEnabled ? 'translate-x-10 text-emerald-700' : 'translate-x-0 text-gray-400'
                    }`}
                >
                  {settings.smsEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Explanatory Banner */}
            <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${settings.smsEnabled
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
              <FaInfoCircle className="text-base shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">
                  {settings.smsEnabled
                    ? 'All Automated SMS Alerts are Currently Enabled'
                    : 'SMS Notification Service is Temporarily Paused'}
                </p>
                <p className="mt-1 text-xs opacity-90 leading-relaxed">
                  {settings.smsEnabled
                    ? 'When active, LuminaLearn triggers SMS notifications for attendance updates, QR arrivals, payment confirmations, bank deposit slip approvals, broadcast notices, and security OTPs.'
                    : 'When toggled OFF, no automated SMS messages will be dispatched through the gateway. In-App notifications will continue to work normally.'}
                </p>
              </div>
            </div>

            {/* Notification Modules Status Matrix */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Managed SMS Notification Flows
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'Attendance Alerts', desc: 'Parent SMS upon marking or QR check-in' },
                  { title: 'Payment Confirmations', desc: 'Parent SMS for online, counter, & slips' },
                  { title: 'Teacher Broadcasts', desc: 'Bulk SMS for class postponement & notes' },
                  { title: 'Security OTPs', desc: 'Registration & password reset codes' }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-white">{item.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${settings.smsEnabled
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                      }`}>
                      {settings.smsEnabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SMS Dispatcher Tool */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaPaperPlane className="text-purple-600 dark:text-purple-400 text-sm" /> Manual SMS Dispatcher
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Send a SMS message to verify Text.lk gateway connectivity.
                </p>
              </div>
            </div>

            {testResult && (
              <div className={`p-4 rounded-2xl text-xs font-medium border flex items-start gap-2.5 ${testResult.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                }`}>
                {testResult.type === 'success' ? <FaCheckCircle className="text-base text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" /> : <FaExclamationTriangle className="text-base text-red-600 dark:text-red-400 shrink-0 mt-0.5" />}
                <div className="space-y-1">
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.details && (
                    <pre className="text-[11px] bg-white/60 dark:bg-slate-800 p-2 rounded-lg font-mono overflow-x-auto">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSendTestSMS} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                    Recipient Phone Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0771234567 or +94771234567"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-purple-500 outline-none transition"
                    required
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                    Auto-normalizes standard 07X, +94, or 94 formats.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                    Sender ID
                  </label>
                  <input
                    type="text"
                    value={settings.senderId || 'Kirula Edu'}
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  Message Content *
                </label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-purple-500 outline-none transition resize-none"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FaPaperPlane className="text-xs" />
                  {sendingTest ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: Text.lk Account & Balance Card */}
        <div className="space-y-6">

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FaCoins className="text-amber-500" /> Text.lk Account Status
              </h3>

              <button
                type="button"
                onClick={() => fetchSettings(true)}
                disabled={refreshingBalance}
                title="Refresh live balance"
                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <FaSyncAlt className={`text-xs ${refreshingBalance ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>

            {/* Units Balance Highlight */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-center space-y-1">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                Available SMS Units
              </span>
              <div className="text-4xl font-black text-amber-900 dark:text-amber-300 tracking-tight">
                {getRemainingUnits() !== null ? getRemainingUnits() : (settings.isConfigured ? 'Loading...' : '0')}
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium block">
                {settings.isConfigured ? 'Live balance from Text.lk Gateway' : 'Configure token in .env for live units'}
              </span>
            </div>

            {/* Account Details List */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-50 dark:border-slate-800">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Gateway Service</span>
                <span className="font-bold text-gray-800 dark:text-white font-mono">Text.lk (v3 / HTTP)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50 dark:border-slate-800">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Sender ID</span>
                <span className="font-bold text-purple-700 dark:text-purple-300 font-mono bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                  {settings.senderId || 'Kirula Edu'}
                </span>
              </div>
              {getExpiryDate() && (
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-slate-800">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Units Valid Until</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300">{getExpiryDate()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-50 dark:border-slate-800">
                <span className="text-gray-500 dark:text-gray-400 font-medium">API Token Status</span>
                <span className={`font-bold ${settings.isConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {settings.isConfigured ? '✓ Active & Connected' : '⚠ Missing in .env'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50 dark:border-slate-800">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Country Standard</span>
                <span className="font-bold text-gray-800 dark:text-white">Sri Lanka (+94)</span>
              </div>
            </div>

            {/* External Link to Text.lk Dashboard */}
            <div className="pt-2">
              <a
                href={settings.dashboardUrl || 'https://app.text.lk/dashboard'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>Visit Text.lk Dashboard</span>
                <FaExternalLinkAlt className="text-[10px] group-hover:translate-x-0.5 transition-transform" />
              </a>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center block mt-2">
                Top up units, register custom Sender IDs, and view delivery logs on Text.lk.
              </span>
            </div>

          </div>

          {/* Quick Help Card */}
          <div className="bg-purple-50/70 dark:bg-slate-800/80 rounded-3xl p-5 border border-purple-100 dark:border-slate-700 text-xs space-y-2 text-purple-900 dark:text-purple-300">
            <h4 className="font-bold flex items-center gap-1.5 text-purple-950 dark:text-white">
              <FaInfoCircle /> Need to top up or change Sender ID?
            </h4>
            <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300">
              Your SMS units and custom Sender ID requests (e.g. your institute's name) are managed directly inside the Text.lk dashboard.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default SmsSettings;
