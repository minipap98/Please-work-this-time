import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps one section's failure (the map, a chart) from taking the rest of the page down. */
export class SectionBoundary extends Component<Props & { fallback: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Bosun section failed", error, info.componentStack);
  }

  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Bosun crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Refresh the page. If this keeps happening, sign out and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign("/");
            }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }
}
