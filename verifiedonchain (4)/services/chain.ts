import { Blockchain, WalletStats, TokenAsset, LatestTransaction } from '../types';

// API Constants
const ETHERSCAN_API_KEY = 'CBB2PBXCWB9AD7N1S7JZT235Q5YGB6QBGQ'; // Provided key
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const SOLANA_RPC = 'https://solana-rpc.publicnode.com'; // Robust public RPC

// Price Cache to avoid hitting CoinGecko rate limits too hard
let priceCache: { [key: string]: { price: number; timestamp: number } } = {};
const PRICE_CACHE_TTL = 60 * 1000; // 1 minute

// --- HELPER: REAL PRICE FETCHING ---

const getCoingeckoId = (chain: Blockchain): string => {
  switch (chain) {
    case Blockchain.BTC: return 'bitcoin';
    case Blockchain.ETH: return 'ethereum';
    case Blockchain.SOL: return 'solana';
    case Blockchain.BNB: return 'binancecoin';
    default: return 'ethereum';
  }
};

const fetchTokenPrices = async (ids: string[]): Promise<Record<string, number>> => {
  const now = Date.now();
  const missingIds = ids.filter(id => !priceCache[id] || (now - priceCache[id].timestamp > PRICE_CACHE_TTL));

  if (missingIds.length > 0) {
    try {
      // Fetch in chunks to be safe, though here we usually just fetch main coins
      const response = await fetch(`${COINGECKO_API}/simple/price?ids=${missingIds.join(',')}&vs_currencies=usd`);
      if (response.ok) {
        const data = await response.json();
        Object.keys(data).forEach(key => {
          priceCache[key] = { price: data[key].usd, timestamp: now };
        });
      }
    } catch (e) {
      console.warn("CoinGecko Error:", e);
    }
  }

  const result: Record<string, number> = {};
  ids.forEach(id => {
    result[id] = priceCache[id]?.price || 0;
  });
  return result;
};

// --- HELPER: FORMATTING ---

export const formatUSD = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const maskAddress = (address: string): string => {
  if (address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const isValidAddress = (address: string, chain: Blockchain): boolean => {
  if (!address) return false;
  switch (chain) {
    case Blockchain.BTC: return /^(1|3|bc1)[a-zA-Z0-9]{25,59}$/.test(address);
    case Blockchain.ETH:
    case Blockchain.BNB: return /^0x[a-fA-F0-9]{40}$/.test(address);
    case Blockchain.SOL: return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    default: return false;
  }
};

export const getExchangeRate = (chain: Blockchain): number => {
  return priceCache[getCoingeckoId(chain)]?.price || 0;
};

export const getExplorerLink = (address: string, chain: Blockchain): string => {
  switch (chain) {
    case Blockchain.BTC: return `https://mempool.space/address/${address}`;
    case Blockchain.ETH: return `https://etherscan.io/address/${address}`;
    case Blockchain.SOL: return `https://solscan.io/account/${address}`;
    case Blockchain.BNB: return `https://bscscan.com/address/${address}`;
  }
};

// --- REAL DATA FETCHING LOGIC ---

// 1. BITCOIN (via mempool.space public API)
const fetchBTCStats = async (address: string): Promise<WalletStats> => {
  const stats: WalletStats = {
    balance: 0,
    txCount: 0,
    firstTxDate: new Date().toISOString(),
    lastUpdated: Date.now(),
    history: [],
    tokens: [],
    latestTransaction: undefined
  };

  if (!isValidAddress(address, Blockchain.BTC)) {
      return stats;
  }

  try {
    // Get Balance & Stats
    const res = await fetch(`https://mempool.space/api/address/${address}`);
    if (!res.ok) {
        return stats; 
    }
    const data = await res.json();
    
    // Satoshis to BTC
    const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
    const spent = (data.chain_stats?.spent_txo_sum || 0) + (data.mempool_stats?.spent_txo_sum || 0);
    stats.balance = (funded - spent) / 100000000;
    stats.txCount = (data.chain_stats?.tx_count || 0) + (data.mempool_stats?.tx_count || 0);

    // Get Transactions
    const txRes = await fetch(`https://mempool.space/api/address/${address}/txs`);
    if (txRes.ok) {
        const txData = await txRes.json();
        if (Array.isArray(txData) && txData.length > 0) {
            // LATEST Tx (Index 0)
            const lastTx = txData[0];
            const isReceive = lastTx.vout.some((out: any) => out.scriptpubkey_address === address);
            
            let amount = 0;
            if (isReceive) {
                amount = lastTx.vout.reduce((acc: number, out: any) => out.scriptpubkey_address === address ? acc + out.value : acc, 0);
            } else {
                amount = lastTx.vin.reduce((acc: number, inp: any) => inp.prevout.scriptpubkey_address === address ? acc + inp.prevout.value : acc, 0);
            }

            const fee = lastTx.fee ? lastTx.fee / 100000000 : 0;
            let from = '';
            let to = '';
            if (isReceive) {
               from = lastTx.vin[0]?.prevout?.scriptpubkey_address || 'Unknown';
               to = address;
            } else {
               from = address;
               const recipient = lastTx.vout.find((out: any) => out.scriptpubkey_address !== address);
               to = recipient?.scriptpubkey_address || 'Multiple/Unknown';
            }

            const prices = await fetchTokenPrices(['bitcoin']);
            const btcPrice = prices['bitcoin'];

            stats.latestTransaction = {
                hash: lastTx.txid,
                timestamp: lastTx.status.block_time * 1000,
                type: isReceive ? 'receive' : 'send',
                token: {
                    symbol: 'BTC',
                    name: 'Bitcoin',
                    balance: 0,
                    decimals: 8,
                    contractAddress: 'native',
                    chain: Blockchain.BTC,
                    priceUSD: btcPrice
                },
                amount: amount / 100000000,
                amountUSD: (amount / 100000000) * btcPrice,
                from,
                to,
                fee
            };

            // FIRST Tx (Last in the list from mempool.space for default page)
            // Note: Mempool.space paginates, so if >50 txs, this is just the oldest of the *latest page*.
            // To be accurate we'd need to fetch the last page, but for this demo, we'll use what we have
            // or default to current time if list is empty.
            const oldestLoaded = txData[txData.length - 1];
            stats.firstTxDate = new Date(oldestLoaded.status.block_time * 1000).toISOString();
        }
    }

    return stats;

  } catch (e) {
    console.error("BTC Fetch Error", e);
    return stats;
  }
};

// 2. EVM (ETH & BNB) via Etherscan/BscScan
const fetchEVMStats = async (address: string, chain: Blockchain): Promise<WalletStats> => {
  const baseUrl = chain === Blockchain.ETH ? 'https://api.etherscan.io/api' : 'https://api.bscscan.com/api';
  const apiKey = chain === Blockchain.ETH ? ETHERSCAN_API_KEY : 'YourBscKey'; 
  const cgId = getCoingeckoId(chain);
  
  const stats: WalletStats = {
    balance: 0,
    txCount: 0,
    firstTxDate: new Date().toISOString(),
    lastUpdated: Date.now(),
    history: [],
    tokens: [],
    latestTransaction: undefined
  };

  if (!isValidAddress(address, chain)) {
      return stats;
  }

  try {
    // 1. Native Balance
    const balRes = await fetch(`${baseUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`);
    if (balRes.ok) {
        const balData = await balRes.json();
        if (balData.status === '1') {
            stats.balance = parseFloat(balData.result) / 1e18;
        }
    }

    // 2. Prices
    const prices = await fetchTokenPrices([cgId]);
    const nativePrice = prices[cgId];

    // 3. Last Transaction (Sort Descending)
    const txRes = await fetch(`${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc&apikey=${apiKey}`);
    if (txRes.ok) {
        const txData = await txRes.json();

        if (txData.status === '1' && txData.result.length > 0) {
            const tx = txData.result[0];
            stats.txCount = parseInt(tx.nonce) + 1; // Approx
            
            const fee = (parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)) / 1e18;

            stats.latestTransaction = {
                hash: tx.hash,
                timestamp: parseInt(tx.timeStamp) * 1000,
                type: tx.to.toLowerCase() === address.toLowerCase() ? 'receive' : 'send',
                token: {
                    symbol: chain,
                    name: chain === Blockchain.ETH ? 'Ethereum' : 'BNB Chain',
                    balance: 0,
                    decimals: 18,
                    contractAddress: 'native',
                    chain: chain,
                    priceUSD: nativePrice
                },
                amount: parseFloat(tx.value) / 1e18,
                amountUSD: (parseFloat(tx.value) / 1e18) * nativePrice,
                from: tx.from,
                to: tx.to,
                fee: fee
            };
        }
    }

    // 4. First Transaction (Sort Ascending to get Genesis Date)
    // We do a separate call to get the accurate wallet age
    const firstTxRes = await fetch(`${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${apiKey}`);
    if (firstTxRes.ok) {
        const firstTxData = await firstTxRes.json();
        if (firstTxData.status === '1' && firstTxData.result.length > 0) {
            const firstTx = firstTxData.result[0];
            stats.firstTxDate = new Date(parseInt(firstTx.timeStamp) * 1000).toISOString();
        }
    }
    
    return stats;
  } catch (e) {
    console.error("EVM Fetch Error", e);
    return stats;
  }
};

// 3. SOLANA (via RPC)
const fetchSolanaStats = async (address: string): Promise<WalletStats> => {
  const stats: WalletStats = {
    balance: 0,
    txCount: 0,
    firstTxDate: new Date().toISOString(),
    lastUpdated: Date.now(),
    history: [],
    tokens: [],
    latestTransaction: undefined
  };

  if (!isValidAddress(address, Blockchain.SOL)) {
      return stats;
  }

  try {
    // 1. Native Balance
    const balRes = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] })
    });
    
    if (balRes.ok) {
        const balData = await balRes.json();
        stats.balance = (balData.result?.value || 0) / 1e9;
    }

    // 2. Price
    const prices = await fetchTokenPrices(['solana']);
    const solPrice = prices['solana'];

    // 3. Transaction History (Signatures) - Getting accurate "First" on Solana is hard without indexer
    // We will just fetch the latest for activity, and default First Date to "Unknown" or estimate
    const sigRes = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [address, { limit: 1 }] })
    });
    
    if (sigRes.ok) {
        const sigData = await sigRes.json();

        if (sigData.result && sigData.result.length > 0) {
        const tx = sigData.result[0];
        stats.txCount = 100; // Solana doesn't give total count easily
        
        // For Solana, getting the TRUE first transaction requires walking the hash chain back to genesis.
        // For this demo, we will leave firstTxDate as current (or undefined) and the UI handles it,
        // unless we want to mock a random past date for visuals.
        // Let's set it to a static date relative to the latest tx to simulate "age" for the demo,
        // or just leave it.
        
        stats.latestTransaction = {
            hash: tx.signature,
            timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
            type: 'send', 
            token: {
                symbol: 'SOL',
                name: 'Solana',
                balance: 0,
                decimals: 9,
                contractAddress: 'native',
                chain: Blockchain.SOL,
                priceUSD: solPrice
            },
            amount: 0, 
            amountUSD: 0,
            from: address,
            to: 'Solana Program/Wallet',
            fee: 0.000005 
        };
        }
    }

    // 4. SPL Tokens (Real)
    const tokenRes = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
          params: [address, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }]
        })
    });
    
    if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        
        if (tokenData.result?.value) {
            stats.tokens = tokenData.result.value.map((t: any) => {
                const info = t.account.data.parsed.info;
                const amount = info.tokenAmount.uiAmount;
                if (amount < 0.01) return null;
                
                return {
                    symbol: 'SPL',
                    name: 'Solana Token',
                    balance: amount,
                    decimals: info.tokenAmount.decimals,
                    contractAddress: info.mint,
                    chain: Blockchain.SOL
                };
            }).filter((t: any) => t !== null).slice(0, 10);
        }
    }

    return stats;
  } catch (e) {
    console.error("Solana Fetch Error", e);
    return stats;
  }
};

// --- MAIN EXPORT ---

export const fetchWalletStats = async (address: string, chain: Blockchain): Promise<WalletStats> => {
  let stats: WalletStats;

  // ROUTER
  if (chain === Blockchain.BTC) {
    stats = await fetchBTCStats(address);
  } else if (chain === Blockchain.SOL) {
    stats = await fetchSolanaStats(address);
  } else {
    stats = await fetchEVMStats(address, chain);
  }

  // --- HISTORY GENERATION (Anchored to Real Reality) ---
  const currentTotalValueUSD = stats.balance * (priceCache[getCoingeckoId(chain)]?.price || 0);
  const history = [];
  const days = 365;
  let simulatedVal = currentTotalValueUSD; // Start from NOW (Real) and walk backwards
  
  for (let i = 0; i < days; i++) {
     history.unshift({
       date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
       value: Math.max(0, simulatedVal)
     });
     
     // Random daily volatility between -5% and +5%
     const change = 1 + ((Math.random() * 0.1) - 0.05); 
     simulatedVal = simulatedVal / change; // Reverse calculation
  }
  
  history[history.length - 1].value = currentTotalValueUSD;
  stats.history = history;
  stats.isSimulatedHistory = true;

  return stats;
};