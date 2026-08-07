import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  // Optional label shown in the fallback (e.g. the page name) — helps whoever
  // reports the bug say more than just "the page went blank".
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// React only supports error boundaries as class components — there's no
// hook equivalent. Without one, a single unexpected throw during render
// (e.g. a bad date field) unmounts the whole page with nothing on screen.
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Caught by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-destructive/40 p-10 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
          <p className="font-medium text-foreground">
            {i18n.t("common.errorBoundaryTitle", {
              label: this.props.label || i18n.t("common.errorBoundaryDefaultLabel"),
            })}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {this.state.error.message}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => this.setState({ error: null })}
          >
            {i18n.t("common.errorBoundaryRetry")}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
