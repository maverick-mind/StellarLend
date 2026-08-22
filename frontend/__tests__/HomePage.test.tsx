import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../src/app/page';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  );
});

describe('HomePage', () => {
  it('renders the hero title', () => {
    render(<HomePage />);
    expect(screen.getByText(/Decentralized Lending/i)).toBeInTheDocument();
  });

  it('renders the Start Lending CTA button', () => {
    render(<HomePage />);
    const ctaButtons = screen.getAllByText(/Start Lending/i);
    expect(ctaButtons.length).toBeGreaterThan(0);
  });

  it('displays protocol statistics', () => {
    render(<HomePage />);
    expect(screen.getByText(/Total Value Locked/i)).toBeInTheDocument();
    expect(screen.getByText(/Borrow APR/i)).toBeInTheDocument();
    expect(screen.getByText(/Supply APY/i)).toBeInTheDocument();
  });

  it('renders all 6 feature cards', () => {
    render(<HomePage />);
    expect(screen.getByText('Lending Pools')).toBeInTheDocument();
    expect(screen.getByText('Collateralized Borrowing')).toBeInTheDocument();
    expect(screen.getByText('Price Oracle')).toBeInTheDocument();
    expect(screen.getByText('Liquidation Engine')).toBeInTheDocument();
    expect(screen.getByText('DAO Governance')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Events')).toBeInTheDocument();
  });

  it('renders the architecture section', () => {
    render(<HomePage />);
    expect(screen.getByText('Production-Ready Architecture')).toBeInTheDocument();
  });
});
