import React from 'react';
import { FaExclamationTriangle, FaTrashAlt, FaInfoCircle, FaSpinner } from 'react-icons/fa';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'primary' | 'info'
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <FaTrashAlt className="text-red-500 text-xl" />,
          iconBg: 'bg-red-100 dark:bg-red-950/60 border-red-200 dark:border-red-900/50',
          btnClass: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
        };
      case 'warning':
        return {
          icon: <FaExclamationTriangle className="text-amber-500 text-xl" />,
          iconBg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/50',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
        };
      case 'primary':
        return {
          icon: <FaInfoCircle className="text-purple-500 text-xl" />,
          iconBg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900/50',
          btnClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
        };
      case 'info':
      default:
        return {
          icon: <FaInfoCircle className="text-blue-500 text-xl" />,
          iconBg: 'bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/50',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 shadow-2xl transition-all border border-gray-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border shrink-0 ${theme.iconBg}`}>
            {theme.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-gray-300 dark:border-slate-700 px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2 ${theme.btnClass}`}
          >
            {isLoading && <FaSpinner className="animate-spin text-sm" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
