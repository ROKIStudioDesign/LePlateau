'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CanvasErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0A0A0F] text-center px-6">
          <AlertTriangle size={32} className="text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-[#F1F5F9]">
              Une erreur s&apos;est produite
            </p>
            <p className="mt-1 text-xs text-[#64748B] max-w-xs">
              {this.state.message || "Le plateau a rencontré un problème inattendu."}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 rounded-lg bg-[#1E1E2E] px-4 py-2 text-sm text-[#F1F5F9] hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
