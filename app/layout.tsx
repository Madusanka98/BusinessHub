import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "BusinessHub SaaS",
  description: "Multi-tenant business management and specialized operations platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
