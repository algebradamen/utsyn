export const runtime = 'nodejs';
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2C5530',
};

export const metadata: Metadata = {
  title: "Restaurant Utsyn | Tangen VGS",
  description: "Bestill bord hos Restaurant Utsyn på Tangen videregående skole. Book a table at Restaurant Utsyn at Tangen Upper Secondary School.",
  keywords: "restaurant, utsyn, tangen, vgs, bestilling, booking, mat, food",
  openGraph: {
    title: "Restaurant Utsyn",
    description: "Opplæringsrestaurant på Tangen videregående skole",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
