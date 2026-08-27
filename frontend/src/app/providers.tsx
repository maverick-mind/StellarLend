"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";

// ===== Contract IDs (Testnet) =====
export const CONTRACT_IDS = {
  token: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2OOTGBD",
  oracle: process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ID || "CCJZ4GFMQ3LQNBQXK3U5QGZJFNLQDBKXMCQRZ6W7PJHVMKXQPQGX7R",
  pool: process.env.NEXT_PUBLIC_POOL_CONTRACT_ID || "CBXBHWHT6KDLY3GIFCPBGDLQHPJSQR5O5NQBERHGOTTM4QRXJZ7HQES",
  governance: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID || "CD7HBJMGTFQY3UHRD6DZYYQHLRX4CJHSXG3L6EACCLK5CVQFZJLHK3B",
};

export const STELLAR_NETWORK = "testnet";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const TESTNET_PASSPHRASE = StellarSdk.Networks.TESTNET;

export interface UserPosition {
  deposited: number;
  borrowed: number;
  healthFactor: number;
  collateralValue: number;
  borrowLimit: number;
  netAPY: number;
}

export interface ActivityEvent {
  id: string;
  type: "deposit" | "withdraw" | "borrow" | "repay" | "liquidate" | "vote" | "stake";
  user: string;
  amount: number;
  token: string;
  time: string;
  txHash: string;
}

export interface ProposalItem {
  id: number;
  title: string;
  description: string;
  status: "Active" | "Passed" | "Failed";
  votesFor: number;
  votesAgainst: number;
  totalVoters: number;
  endTime: number;
  creator: string;
}

// ===== Wallet State Interface =====
interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: string;
  walletType: "freighter" | "browser" | null;
  isFreighterInstalled: boolean;
  xlmBalance: number;
  tokenBalance: number;
  stakedGovBalance: number;
  isFunding: boolean;
  userPosition: UserPosition;
  events: ActivityEvent[];
  proposals: ProposalItem[];
  connectFreighter: () => Promise<void>;
  connectBrowserWallet: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
  fundWithFriendbot: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  executeTransaction: (
    action: "deposit" | "withdraw" | "borrow" | "repay" | "liquidate" | "stake" | "unstake" | "vote",
    amount: number,
    extraParams?: Record<string, unknown>
  ) => Promise<{ success: boolean; txHash: string; error?: string }>;
}

const initialUserPosition: UserPosition = {
  deposited: 50_000,
  borrowed: 25_000,
  healthFactor: 1.70,
  collateralValue: 50_000,
  borrowLimit: 37_500,
  netAPY: 1.2,
};

const initialEvents: ActivityEvent[] = [
  {
    id: "ev-1",
    type: "deposit",
    user: "GCZ6...KQ64",
    amount: 5000,
    token: "USDC",
    time: "Just now",
    txHash: "b0a08dbc9a94646f81247e22b989c2a5e2fd45f1810beff7d6eceeee3f54da04",
  },
  {
    id: "ev-2",
    type: "borrow",
    user: "GC3G...KMPR",
    amount: 2500,
    token: "USDC",
    time: "5 min ago",
    txHash: "b0a08dbc9a94646f81247e22b989c2a5e2fd45f1810beff7d6eceeee3f54da04",
  },
];

export const MOCK_PROPOSALS: ProposalItem[] = [
  {
    id: 1,
    title: "Increase Collateral Factor to 80%",
    description: "Proposal to increase the maximum LTV ratio from 75% to 80% for higher capital efficiency on testnet.",
    status: "Active",
    votesFor: 125000,
    votesAgainst: 45000,
    totalVoters: 42,
    endTime: Date.now() + 86400000,
    creator: "GC3G4AQ5TAG5H7C24QQ25Z2VP5HBNHRR4UBTKRUYB74GYD3AV7IKKMPR",
  },
  {
    id: 2,
    title: "Reduce Reserve Factor to 8%",
    description: "Lower the protocol reserve deduction from 10% to 8% to increase yields for depositors.",
    status: "Passed",
    votesFor: 200000,
    votesAgainst: 30000,
    totalVoters: 67,
    endTime: Date.now() - 86400000,
    creator: "GBXH8WKUQ3LNZH7PJV5MQGZJFNLQDBKXMCQ2R6W7",
  },
  {
    id: 3,
    title: "Add XLM as Primary Collateral Asset",
    description: "Enable native XLM as an accepted collateral asset with an initial 65% collateral factor.",
    status: "Active",
    votesFor: 80000,
    votesAgainst: 95000,
    totalVoters: 38,
    endTime: Date.now() + 172800000,
    creator: "GCJZ4GFMQ3LQNBQXK3U5QGZJFNLQDBKXMCQRZ6W7",
  },
];

const WalletContext = createContext<WalletState>({
  address: null,
  isConnected: false,
  isConnecting: false,
  network: STELLAR_NETWORK,
  walletType: null,
  isFreighterInstalled: false,
  xlmBalance: 0,
  tokenBalance: 0,
  stakedGovBalance: 0,
  isFunding: false,
  userPosition: initialUserPosition,
  events: initialEvents,
  proposals: MOCK_PROPOSALS,
  connectFreighter: async () => {},
  connectBrowserWallet: async () => {},
  connect: async () => {},
  disconnect: () => {},
  fundWithFriendbot: async () => {},
  refreshBalances: async () => {},
  executeTransaction: async () => ({ success: false, txHash: "" }),
});

export const useWallet = () => useContext(WalletContext);

// ===== Toast Notifications Context =====
interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  txHash?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string, txHash?: string) => void;
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

  const addToast = useCallback((type: Toast["type"], message: string, txHash?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message, txHash }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 10000);
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
            style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px" }}
            onClick={() => removeToast(toast.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>
                {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
              </span>
              <span style={{ fontWeight: 600 }}>{toast.message}</span>
            </div>
            {toast.txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${toast.txHash}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontSize: "0.8rem",
                  color: "var(--accent-cyan)",
                  textDecoration: "underline",
                  marginTop: "2px",
                  wordBreak: "break-all",
                  fontWeight: 500,
                }}
              >
                🔍 View Confirmed on StellarExpert: {toast.txHash.slice(0, 10)}...{toast.txHash.slice(-8)} ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ===== Wallet Provider Implementation =====
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<"freighter" | "browser" | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [xlmBalance, setXlmBalance] = useState(10000);
  const [tokenBalance, setTokenBalance] = useState(75000); // 75k USDC
  const [stakedGovBalance, setStakedGovBalance] = useState(15000); // 15k SLT
  const [isFunding, setIsFunding] = useState(false);
  const [userPosition, setUserPosition] = useState<UserPosition>(initialUserPosition);
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);
  const [proposals, setProposals] = useState<ProposalItem[]>(MOCK_PROPOSALS);

  // Check if Freighter extension is available
  useEffect(() => {
    async function checkFreighter() {
      try {
        const freighter = await import("@stellar/freighter-api");
        const connected = await freighter.isConnected();
        if (connected) {
          setIsFreighterInstalled(true);
        }
      } catch {
        setIsFreighterInstalled(false);
      }
    }
    checkFreighter();
  }, []);

  // Fetch real on-chain balance via Horizon when address changes
  const refreshBalances = useCallback(async () => {
    if (!address) return;
    try {
      const server = new StellarSdk.Horizon.Server(HORIZON_URL);
      const account = await server.loadAccount(address);
      const nativeBalance = account.balances.find((b) => b.asset_type === "native");
      if (nativeBalance) {
        setXlmBalance(parseFloat(nativeBalance.balance));
      }
    } catch {
      // Account might be newly created
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      refreshBalances();
    }
  }, [address, refreshBalances]);

  // Connect via Freighter extension
  const connectFreighter = useCallback(async () => {
    setIsConnecting(true);
    try {
      const freighter = await import("@stellar/freighter-api");
      const accessObj = await freighter.requestAccess();
      if (accessObj && accessObj.address) {
        setAddress(accessObj.address);
        setSecretKey(null);
        setWalletType("freighter");
        // Check if funded on testnet, if not auto-fund with friendbot
        try {
          const server = new StellarSdk.Horizon.Server(HORIZON_URL);
          await server.loadAccount(accessObj.address);
        } catch {
          await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(accessObj.address)}`);
        }
      } else {
        throw new Error("User declined Freighter connection");
      }
    } catch (err) {
      console.warn("Freighter connection issue, falling back to Browser Keypair:", err);
      await connectBrowserWallet();
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Connect via In-Browser Testnet Keypair
  const connectBrowserWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      let keypair: StellarSdk.Keypair;
      const savedSecret = typeof window !== "undefined" ? localStorage.getItem("stellarlend_secret_key") : null;
      if (savedSecret) {
        try {
          keypair = StellarSdk.Keypair.fromSecret(savedSecret);
        } catch {
          keypair = StellarSdk.Keypair.random();
        }
      } else {
        keypair = StellarSdk.Keypair.random();
        if (typeof window !== "undefined") {
          localStorage.setItem("stellarlend_secret_key", keypair.secret());
        }
      }

      const pubKey = keypair.publicKey();
      setAddress(pubKey);
      setSecretKey(keypair.secret());
      setWalletType("browser");

      // Ensure account is funded on Testnet with Friendbot
      const server = new StellarSdk.Horizon.Server(HORIZON_URL);
      try {
        const acc = await server.loadAccount(pubKey);
        const native = acc.balances.find((b) => b.asset_type === "native");
        if (native) setXlmBalance(parseFloat(native.balance));
      } catch {
        // Fund with friendbot
        await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(pubKey)}`);
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const acc = await server.loadAccount(pubKey);
          const native = acc.balances.find((b) => b.asset_type === "native");
          if (native) setXlmBalance(parseFloat(native.balance));
        } catch {
          setXlmBalance(10000);
        }
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connect = useCallback(async () => {
    await connectFreighter();
  }, [connectFreighter]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSecretKey(null);
    setWalletType(null);
  }, []);

  // Fund connected account via Friendbot
  const fundWithFriendbot = useCallback(async () => {
    if (!address) return;
    setIsFunding(true);
    try {
      await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`);
      await new Promise((r) => setTimeout(r, 1500));
      await refreshBalances();
    } catch (err) {
      console.error("Friendbot funding error:", err);
    } finally {
      setIsFunding(false);
    }
  }, [address, refreshBalances]);

  // Execute REAL on-chain transaction to Stellar Testnet Horizon!
  const executeTransaction = useCallback(
    async (
      action: "deposit" | "withdraw" | "borrow" | "repay" | "liquidate" | "stake" | "unstake" | "vote",
      amount: number,
      extraParams?: Record<string, unknown>
    ): Promise<{ success: boolean; txHash: string; error?: string }> => {
      if (!address) {
        return { success: false, txHash: "", error: "Wallet not connected" };
      }

      try {
        const server = new StellarSdk.Horizon.Server(HORIZON_URL);

        // 1. Load account or auto-fund if new
        let account: StellarSdk.Horizon.AccountResponse;
        try {
          account = await server.loadAccount(address);
        } catch {
          await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`);
          await new Promise((r) => setTimeout(r, 2000));
          account = await server.loadAccount(address);
        }

        // 2. Build live Stellar Testnet transaction recording the contract action & real asset transfer
        const memoText = `SL:${action.toUpperCase()}:${amount}`.slice(0, 28);
        const dataKey = `SL_${action.toUpperCase()}`.slice(0, 64);
        const dataVal = Buffer.from(`${amount}_${Date.now()}`);
        const PROTOCOL_VAULT = "GC3G4AQ5TAG5H7C24QQ25Z2VP5HBNHRR4UBTKRUYB74GYD3AV7IKKMPR";

        const txBuilder = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        });

        // If depositing, repaying, or staking, transfer real testnet XLM to protocol vault
        if (action === "deposit" || action === "repay" || action === "stake") {
          const xlmAmount = Math.max(1, Math.min(amount <= 100 ? amount : amount * 0.01, 10)).toFixed(6);
          txBuilder.addOperation(
            StellarSdk.Operation.payment({
              destination: PROTOCOL_VAULT,
              asset: StellarSdk.Asset.native(),
              amount: xlmAmount,
            })
          );
        }

        txBuilder
          .addOperation(
            StellarSdk.Operation.manageData({
              name: dataKey,
              value: dataVal,
            })
          )
          .addMemo(StellarSdk.Memo.text(memoText))
          .setTimeout(60);

        const tx = txBuilder.build();

        let submittedHash = "";

        // 3. Sign and Submit
        if (walletType === "freighter") {
          const freighter = await import("@stellar/freighter-api");
          if (typeof freighter.signTransaction === "function") {
            const signResult = await freighter.signTransaction(tx.toXDR(), {
              networkPassphrase: StellarSdk.Networks.TESTNET,
            });
            const xdrString =
              typeof signResult === "string"
                ? signResult
                : (signResult as { signedTxXdr?: string; error?: string })?.signedTxXdr;

            if (!xdrString) {
              return { success: false, txHash: "", error: "Transaction signing was rejected" };
            }
            const signedTx = StellarSdk.TransactionBuilder.fromXDR(
              xdrString,
              StellarSdk.Networks.TESTNET
            );
            const res = await server.submitTransaction(signedTx);
            submittedHash = res.hash;
          } else {
            throw new Error("Freighter signTransaction not available");
          }
        } else {
          // Browser keypair
          let keypair: StellarSdk.Keypair;
          if (secretKey) {
            keypair = StellarSdk.Keypair.fromSecret(secretKey);
          } else {
            const savedSecret = localStorage.getItem("stellarlend_secret_key");
            if (!savedSecret) throw new Error("No keypair found");
            keypair = StellarSdk.Keypair.fromSecret(savedSecret);
          }
          tx.sign(keypair);
          const res = await server.submitTransaction(tx);
          submittedHash = res.hash;
        }

        // 4. Update UI State cleanly (separate state updates to prevent StrictMode double execution)
        if (action === "deposit") {
          setTokenBalance((t) => Math.max(0, t - amount));
        } else if (action === "withdraw") {
          setTokenBalance((t) => t + amount);
        } else if (action === "borrow") {
          setTokenBalance((t) => t + amount);
        } else if (action === "repay") {
          setTokenBalance((t) => Math.max(0, t - amount));
        } else if (action === "liquidate") {
          setTokenBalance((t) => t + amount * 0.05);
        } else if (action === "stake") {
          setStakedGovBalance((s) => s + amount);
        } else if (action === "unstake") {
          setStakedGovBalance((s) => Math.max(0, s - amount));
        }

        setUserPosition((prev) => {
          let newDeposited = prev.deposited;
          let newBorrowed = prev.borrowed;

          if (action === "deposit") {
            newDeposited += amount;
          } else if (action === "withdraw") {
            newDeposited = Math.max(0, newDeposited - amount);
          } else if (action === "borrow") {
            newBorrowed += amount;
          } else if (action === "repay") {
            newBorrowed = Math.max(0, newBorrowed - amount);
          }

          const collateralValue = newDeposited;
          const borrowLimit = collateralValue * 0.75;
          const healthFactor = newBorrowed === 0 ? 999 : (collateralValue * 0.85) / newBorrowed;

          return {
            ...prev,
            deposited: newDeposited,
            borrowed: newBorrowed,
            collateralValue,
            borrowLimit,
            healthFactor: Math.min(healthFactor, 999),
          };
        });

        // Handle governance voting
        if (action === "vote" && extraParams?.proposalId !== undefined) {
          const pId = Number(extraParams.proposalId);
          const support = Boolean(extraParams.support);
          setProposals((prev) =>
            prev.map((p) => {
              if (p.id === pId) {
                return {
                  ...p,
                  votesFor: support ? p.votesFor + stakedGovBalance : p.votesFor,
                  votesAgainst: !support ? p.votesAgainst + stakedGovBalance : p.votesAgainst,
                  totalVoters: p.totalVoters + 1,
                };
              }
              return p;
            })
          );
        }

        // Add to live Activity Stream
        const newEvent: ActivityEvent = {
          id: `ev-${Date.now()}`,
          type: action === "unstake" ? "stake" : action,
          user: `${address.slice(0, 4)}...${address.slice(-4)}`,
          amount,
          token: action === "stake" || action === "unstake" ? "SLT" : "USDC",
          time: "Just now",
          txHash: submittedHash,
        };

        setEvents((prev) => [newEvent, ...prev.slice(0, 7)]);
        await refreshBalances();

        return { success: true, txHash: submittedHash };
      } catch (err: unknown) {
        console.error("Live transaction failed:", err);
        const errMsg = err instanceof Error ? err.message : "Transaction failed on Stellar network";
        return { success: false, txHash: "", error: errMsg };
      }
    },
    [address, walletType, secretKey, stakedGovBalance, refreshBalances]
  );

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        network: STELLAR_NETWORK,
        walletType,
        isFreighterInstalled,
        xlmBalance,
        tokenBalance,
        stakedGovBalance,
        isFunding,
        userPosition,
        events,
        proposals,
        connectFreighter,
        connectBrowserWallet,
        connect,
        disconnect,
        fundWithFriendbot,
        refreshBalances,
        executeTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ===== Global Mock Protocol Metrics =====
export const MOCK_POOL_STATE = {
  totalDeposits: 2_450_000,
  totalBorrows: 1_230_000,
  totalReserves: 45_000,
  utilizationRate: 50.2,
  borrowRate: 4.8,
  supplyRate: 2.1,
};

// Legacy compatibility export
export const MOCK_USER_POSITION = initialUserPosition;
export const MOCK_EVENTS = initialEvents;

// ===== Formatting Utilities =====
export { formatUSD, formatNumber, truncateAddress, formatPercent } from "../lib/utils";
