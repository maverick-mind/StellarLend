import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider, ToastProvider } from "./providers";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "StellarLend | DeFi Lending Protocol on Stellar",
  description:
    "A production-ready decentralized lending and borrowing protocol built on Stellar Soroban. Deposit collateral, borrow assets, earn yield, and participate in governance.",
  keywords: ["Stellar", "Soroban", "DeFi", "Lending", "Borrowing", "Web3", "Blockchain"],
  openGraph: {
    title: "StellarLend — DeFi Lending on Stellar",
    description: "Deposit, borrow, and earn on the Stellar network.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <WalletProvider>
          <ToastProvider>
            <Navbar />
            <main>{children}</main>
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
