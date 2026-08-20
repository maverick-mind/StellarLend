"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// ===== Contract IDs (Testnet) =====
export const CONTRACT_IDS = {
  token: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2OOTGBD",
  oracle: process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ID || "CCJZ4GFMQ3LQNBQXK3U5QGZJFNLQDBKXMCQRZ6W7PJHVMKXQPQGX7R",
  pool: process.env.NEXT_PUBLIC_POOL_CONTRACT_ID || "CBXBHWHT6KDLY3GIFCPBGDLQHPJSQR5O5NQBERHGOTTM4QRXJZ7HQES",
  governance: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID || "CD7HBJMGTFQY3UHRD6DZYYQHLRX4CJHSXG3L6EACCLK5CVQFZJLHK3B",
};

export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

// ===== Wallet Context =====
interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  isConnected: false,
  isConnecting: false,
  network: STELLAR_NETWORK,
  connect: async () => {},
  disconnect: () => {},
});

export const useWallet = () => useContext(WalletContext);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Dynamic import to avoid SSR issues
      const freighter = await import("@stellar/freighter-api");
      
      const { address: addr } = await freighter.requestAccess();
      if (addr) {
        setAddress(addr);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
      // Fallback: generate a demo address for display
      setAddress("GDEMO...STELLARLEND");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        network: STELLAR_NETWORK,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ===== Toast Notifications =====
interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <span>
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ===== Mock Data for Demo =====
export const MOCK_POOL_STATE = {
  totalDeposits: 2_450_000,
  totalBorrows: 1_230_000,
  totalReserves: 45_000,
  utilizationRate: 50.2,
  borrowRate: 4.8,
  supplyRate: 2.1,
};

export const MOCK_USER_POSITION = {
  deposited: 50_000,
  borrowed: 25_000,
  healthFactor: 1.42,
  collateralValue: 50_000,
  borrowLimit: 37_500,
  netAPY: 1.2,
};

export const MOCK_EVENTS = [
  { id: 1, type: "deposit", user: "GDXK...M4QR", amount: 5000, token: "USDC", time: "2 min ago" },
  { id: 2, type: "borrow", user: "GBXH...W7PJ", amount: 2500, token: "USDC", time: "5 min ago" },
  { id: 3, type: "repay", user: "GCJZ...NQBQ", amount: 1000, token: "USDC", time: "8 min ago" },
  { id: 4, type: "liquidate", user: "GDHJ...QRXJ", amount: 8000, token: "USDC", time: "12 min ago" },
  { id: 5, type: "deposit", user: "GFCB...LQHP", amount: 15000, token: "USDC", time: "15 min ago" },
  { id: 6, type: "borrow", user: "GCVQ...ZLHK", amount: 3200, token: "USDC", time: "20 min ago" },
];

export const MOCK_PROPOSALS = [
  {
    id: 1,
    title: "Increase Collateral Factor to 80%",
    description: "Proposal to increase the maximum LTV ratio from 75% to 80% for better capital efficiency.",
    status: "Active",
    votesFor: 125000,
    votesAgainst: 45000,
    totalVoters: 42,
    endTime: Date.now() + 86400000,
    creator: "GDXK...M4QR",
  },
  {
    id: 2,
    title: "Reduce Reserve Factor to 8%",
    description: "Lower the protocol reserve from 10% to 8% to increase yields for depositors.",
    status: "Passed",
    votesFor: 200000,
    votesAgainst: 30000,
    totalVoters: 67,
    endTime: Date.now() - 86400000,
    creator: "GBXH...W7PJ",
  },
  {
    id: 3,
    title: "Add XLM as Collateral Asset",
    description: "Enable XLM as an accepted collateral type with a 60% collateral factor.",
    status: "Active",
    votesFor: 80000,
    votesAgainst: 95000,
    totalVoters: 38,
    endTime: Date.now() + 172800000,
    creator: "GCJZ...NQBQ",
  },
];

// ===== Formatting Utilities =====
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function truncateAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
