
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PaperCard, PaperButton } from './PaperComponents';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  // Explicitly declare props to avoid TS errors in strict environments
  // REMOVED: public readonly props: Readonly<Props> = this.props; 
  // React.Component already handles props typing via Generics.

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5] p-4 font-sans">
          <div className="max-w-md w-full">
            <PaperCard title="System Malfunction" className="border-red-500 shadow-hard-lg">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="p-4 bg-red-50 rounded-full text-red-500 border-2 border-red-500 shadow-sm">
                  <AlertTriangle size={32} />
                </div>
                
                <div className="space-y-2 w-full">
                  <h2 className="text-xl font-bold text-ink">Something went wrong.</h2>
                  <div className="text-xs text-left bg-gray-100 p-3 border-2 border-gray-200 font-mono overflow-auto max-h-32 text-red-600">
                    {this.state.error?.message || "Unknown error occurred"}
                  </div>
                </div>

                <PaperButton 
                  onClick={() => window.location.reload()} 
                  variant="danger"
                  icon={<RefreshCw size={16} />}
                  className="w-full"
                >
                  Reboot System
                </PaperButton>
              </div>
            </PaperCard>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
