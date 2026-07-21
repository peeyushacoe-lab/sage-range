import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Content-Type-Options",     value: "nosniff" },
  { key: "X-Frame-Options",            value: "DENY" },
  { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: 2 years, include subdomains. Only sent over HTTPS so safe for local dev.
  { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
  // CSP in report-only mode while we baseline violations before enforcing.
  // Upgrade to Content-Security-Policy once violations from monitoring are zero.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // unsafe-* needed for Next.js — tighten after baseline
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
      "font-src 'self'",
      "connect-src 'self' https://*.sentry.io https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      // Vercel Blob storage
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Required for source map upload. Set SENTRY_AUTH_TOKEN in your deployment environment.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  // Route client events through /monitoring to bypass ad blockers and corporate firewalls.
  tunnelRoute: "/monitoring",
  // Upload source maps to Sentry then delete them from the build output —
  // stack traces are readable in Sentry but source is never served to browsers.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Never fail the build if Sentry is unconfigured
  errorHandler(err, _invokeErr, compilation) {
    compilation.warnings.push("Sentry: " + err.message);
  },
});
