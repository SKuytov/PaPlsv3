import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-slate-50 rounded-xl border-2 border-dashed border-red-200 text-center animate-in fade-in duration-300">
          <div className="bg-red-100 p-4 rounded-full mb-4 shadow-sm">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            The application encountered an unexpected error. Our team has been notified.
          </p>
          
          {/* Technical Details (Collapsed by default could be better, but simple here) */}
          {this.state.error && (
            <div className="bg-white p-4 rounded-lg border border-red-100 text-left w-full max-w-lg overflow-auto max-h-48 mb-6 shadow-inner">
              <p className="text-red-600 font-mono text-xs font-bold mb-2">Error: {this.state.error.toString()}</p>
              <pre className="text-slate-500 font-mono text-[10px] whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={this.handleReset} className="bg-teal-600 hover:bg-teal-700 shadow-md">
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="shadow-sm">
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;