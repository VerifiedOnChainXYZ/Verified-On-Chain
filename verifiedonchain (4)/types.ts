export enum Blockchain {
  BTC = 'BTC',
  ETH = 'ETH',
  SOL = 'SOL',
  BNB = 'BNB',
}

export interface TokenAsset {
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  contractAddress: string;
  chain: Blockchain;
  logoUrl?: string;
  valueUSD?: number; // Added: Market value in USD
  priceUSD?: number; // Added: Unit price
}

export interface LatestTransaction {
  hash: string;
  timestamp: number;
  type: 'buy' | 'sell' | 'send' | 'receive';
  token: TokenAsset;
  amount: number;
  amountUSD: number;
  from?: string; // New: Sender address
  to?: string;   // New: Receiver address
  fee?: number;  // New: Transaction fee in native currency
}

export interface WalletStats {
  balance: number;
  txCount: number;
  firstTxDate: string; // ISO Date string
  lastUpdated: number; // Timestamp
  history: { date: string; value: number }[]; // For charts
  tokens?: TokenAsset[]; // Real-time token list
  latestTransaction?: LatestTransaction; // Added: Last user activity
  isSimulatedHistory?: boolean; // Explicitly mark history as simulated for transparency
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  threads?: string;
  reddit?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  address: string;
  chain: Blockchain;
  createdAt: number;
  logoUrl?: string;
  socials?: SocialLinks;
  cachedStats?: WalletStats; 
}

export type TimeRange = '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

export interface SearchFilters {
  query: string;
  chain?: Blockchain;
}

export const SUPPORTED_CHAINS = [
  { code: Blockchain.BTC, name: 'Bitcoin', symbol: 'BTC', color: 'text-orange-500' },
  { code: Blockchain.ETH, name: 'Ethereum', symbol: 'ETH', color: 'text-indigo-500' },
  { code: Blockchain.SOL, name: 'Solana', symbol: 'SOL', color: 'text-emerald-500' },
  { code: Blockchain.BNB, name: 'BNB Chain', symbol: 'BNB', color: 'text-yellow-500' },
];