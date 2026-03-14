import type { Metadata } from "next";
import { Geist_Mono, League_Spartan } from "next/font/google";
import "./globals.css";

const leagueSpartan = League_Spartan({
  variable: "--font-league-spartan",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QR Inspector Prototype",
  description: "Scan, upload, or paste QR payloads to classify and inspect them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${leagueSpartan.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
