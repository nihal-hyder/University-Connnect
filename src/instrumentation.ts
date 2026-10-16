import * as Sentry from "@sentry/nextjs";

/**
 * Server-side error reporting. Inert unless NEXT_PUBLIC_SENTRY_DSN is set.
 * No personal data is sent: only stack traces, the route and the error digest
 * shown on the error page.
 */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Collect nothing personal: no user info, cookies, headers, bodies (they
    // could hold passwords) or query strings. Stack traces and routes only.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
