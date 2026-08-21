import React from 'react';
import { FaExclamationTriangle, FaRedo, FaArrowLeft } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled rendering error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50 font-sans">
          <div className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto shadow-sm">
              <FaExclamationTriangle />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Something went wrong loading this view
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              We encountered a display issue while rendering this section. You can reload the page or navigate back to the courses directory.
            </p>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-left font-mono text-[11px] text-slate-700 max-h-28 overflow-y-auto">
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FaArrowLeft className="text-xs" />
                <span>Go Back</span>
              </button>
              
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-xs font-black hover:from-purple-800 hover:to-indigo-800 transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <FaRedo className="text-xs" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
