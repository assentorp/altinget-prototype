import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Layout Prototype",
  description: "A responsive layout prototype with resizable sidebar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
