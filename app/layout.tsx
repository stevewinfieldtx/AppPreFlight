// /app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AppPreflight — Confidence before submission",
  description:
    "Scan your repo, run the AI interview, and generate privacy pages, support pages, marketing copy, and app store assets — all hosted and ready to link in App Store Connect and Google Play.",
  openGraph: {
    title: "AppPreflight",
    description: "Scan. Interview. Launch. Everything Apple and Google need in one sitting.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: "#050505",
          color: "#ffffff",
          WebkitFontSmoothing: "antialiased"
        }}
      >
        {children}
      </body>
    </html>
  );
}
