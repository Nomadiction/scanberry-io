import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { translate, type Locale } from '../lib/i18n';

interface Props {
  children: ReactNode;
}

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem('locale');
    if (stored === 'ru' || stored === 'en' || stored === 'es' || stored === 'de') {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return 'en';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const locale = readLocale();
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {translate('common.somethingWentWrong', locale)}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {translate('common.unexpectedError', locale)}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {translate('common.tryAgain', locale)}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
