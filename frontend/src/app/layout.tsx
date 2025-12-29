import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent12 - AI Voice Agents for Small Business",
  description: "Never miss a customer call. AI voice agents handle appointments, answer questions, and manage calls 24/7.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
