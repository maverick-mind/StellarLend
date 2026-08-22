import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '../src/app/dashboard/page';

// Mock the providers module
jest.mock('../src/app/providers', () => ({
  useWallet: () => ({
    address: 'GDXK4MFQN2OQHKLXM4QR5VQZJ7NBS3XWKUPH2Y6Q',
    isConnected: true,
    isConnecting: false,
    network: 'testnet',
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
  }),
  formatUSD: (n: number) => `$${n.toLocaleString()}`,
  formatPercent: (n: number) => `${n.toFixed(2)}%`,
  formatNumber: (n: number, d = 2) => n.toFixed(d),
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`,
  MOCK_POOL_STATE: {
    totalDeposits: 2450000,
    totalBorrows: 1230000,
    totalReserves: 45000,
    utilizationRate: 50.2,
    borrowRate: 4.8,
    supplyRate: 2.1,
  },
  MOCK_USER_POSITION: {
    deposited: 50000,
    borrowed: 25000,
    healthFactor: 1.42,
    collateralValue: 50000,
    borrowLimit: 37500,
    netAPY: 1.2,
  },
  MOCK_EVENTS: [
    { id: 1, type: 'deposit', user: 'GDXK...M4QR', amount: 5000, token: 'USDC', time: '2 min ago' },
    { id: 2, type: 'borrow', user: 'GBXH...W7PJ', amount: 2500, token: 'USDC', time: '5 min ago' },
  ],
}));

describe('DashboardPage', () => {
  it('renders the dashboard title', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows protocol statistics', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Total Value Locked')).toBeInTheDocument();
    expect(screen.getByText('Total Borrowed')).toBeInTheDocument();
    expect(screen.getByText('Utilization Rate')).toBeInTheDocument();
  });

  it('shows user position when connected', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Your Position')).toBeInTheDocument();
    expect(screen.getByText('Health Factor')).toBeInTheDocument();
  });

  it('shows live activity feed', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Live Activity')).toBeInTheDocument();
    expect(screen.getByText(/Real-time/)).toBeInTheDocument();
  });
});
