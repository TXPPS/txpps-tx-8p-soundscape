/**
 * Neutral runtime error reporter for the TXPPS TX-8P.
 *
 * Replaces the previous editor-preview telemetry shim. Keeps a small,
 * self-contained surface so error boundaries and global handlers have a
 * single place to funnel diagnostics. Logs to the console; never phones
 * home to any third party.
 */

export interface ErrorContext {
  boundary?: string;
  route?: string;
  [key: string]: unknown;
}

export function reportError(error: unknown, context: ErrorContext = {}): void {
  if (typeof window === "undefined") return;
  const route = context.route ?? window.location?.pathname;
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  // Local-only diagnostics. No external reporting.
  console.error("[TX-8P] runtime error", { message, route, ...context }, error);
}
