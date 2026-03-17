import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "MSQ Sustainability Data Manager",
  description: "Sustainability data upload, transformation, and push to Cozero for MSQ Partners agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
