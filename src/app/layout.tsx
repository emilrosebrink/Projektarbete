import "./globals.css";
import GlobalProviders from "@/providers/global-providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/favicon-32x32.png" />
        <script src="/env-config.js" />
      </head>
      <body>
        <GlobalProviders>{children}</GlobalProviders>
      </body>
    </html>
  );
}
