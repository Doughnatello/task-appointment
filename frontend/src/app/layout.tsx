// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Task Appointment",
  description: "Enterprise Task Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {/* React Hot Toast is safe, but ensure it's at the very end */}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}