import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "10K Intelligence Terminal",
  description: "Multi-model AI debate analyzing Alphabet, Amazon, and Microsoft 10-K filings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
