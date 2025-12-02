import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mi-Foto",
  description: "App Mi-Foto con login y registro",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
