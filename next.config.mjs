import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
