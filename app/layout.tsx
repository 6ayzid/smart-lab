import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Survey Question - Material 3 Expressive",
  description: "Material 3 Expressive Survey Question Card",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-surface text-on-surface">
        {children}
      </body>
    </html>
  );
}
