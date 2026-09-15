import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center mc-panel m-6">
          <div className="p-4 bg-[#3a1515] text-[#ff5555] border-2 border-[#aa0000] mb-4">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-minecraft text-white mb-2">Something went wrong</h2>
          <p className="text-xs text-[#a0a0a0] font-minecraft max-w-md mb-6">
            An unexpected error occurred while rendering this dashboard component. The rest of the dashboard remains operational.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mc-btn inline-flex items-center gap-2 font-minecraft text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
