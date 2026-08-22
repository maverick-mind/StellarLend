import { formatUSD, formatNumber, truncateAddress, formatPercent } from '../src/app/providers';

describe('Utility Functions', () => {
  describe('formatUSD', () => {
    it('formats numbers as USD currency', () => {
      expect(formatUSD(1000)).toBe('$1,000');
      expect(formatUSD(2450000)).toBe('$2,450,000');
      expect(formatUSD(0)).toBe('$0');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with specified decimals', () => {
      expect(formatNumber(1.4285, 2)).toBe('1.43');
      expect(formatNumber(50.2, 1)).toBe('50.2');
    });
  });

  describe('truncateAddress', () => {
    it('truncates long addresses', () => {
      const addr = 'GDXK4MFQN2OQHKLXM4QR5VQZJ7NBS3XWKUPH2Y6Q';
      const truncated = truncateAddress(addr, 4);
      expect(truncated).toBe('GDXK...H2Y6Q'.slice(0, 4) + '...' + addr.slice(-4));
    });

    it('handles short addresses gracefully', () => {
      expect(truncateAddress('AB')).toBe('AB');
    });
  });

  describe('formatPercent', () => {
    it('formats numbers as percentages', () => {
      expect(formatPercent(4.8)).toBe('4.80%');
      expect(formatPercent(50.2)).toBe('50.20%');
    });
  });
});
