# ShelbyInvoice

Decentralized invoice protocol built on **Aptos** with metadata stored on **Shelby** decentralized storage.

## Features

- 📄 **Create Invoices** — Issue USDC invoices with full metadata on Shelby
- 💱 **Invoice Marketplace** — Buy and sell invoices (invoice factoring)
- ⚖️ **Arbitration NFTs** — 3-tier NFT system (Gold / Diamond / Platinum)
- 🔍 **Dispute Resolution** — On-chain disputes with Shelby evidence

## Tech Stack

- **Blockchain**: Aptos (Move smart contracts)
- **Storage**: Shelby decentralized hot storage
- **Frontend**: Next.js 15 + Tailwind CSS v4
- **Wallet**: Aptos Wallet Adapter (Petra, Martian, etc.)
- **Payment Token**: USDC FA token on Aptos

---

## Setup

### 1. Deploy Move Contracts

```bash
cd shelby-invoice  # root of this repo (contains Move.toml)

# Initialize Aptos account
aptos init --network testnet

# Fund your account
aptos account fund-with-faucet --account default

# Deploy all contracts
aptos move publish --named-addresses shelby_invoice=default
```

After deploying, note your account address — this is your `CONTRACT_ADDRESS`.

### 2. Initialize Contracts On-Chain

After deployment, call the init functions once:

```bash
# Initialize Invoice Registry
aptos move run \
  --function-id "<CONTRACT_ADDRESS>::invoice_registry::initialize" \
  --named-addresses shelby_invoice=<CONTRACT_ADDRESS>

# Initialize Marketplace (fee = 50 bps = 0.5%, fee collector = your address)
aptos move run \
  --function-id "<CONTRACT_ADDRESS>::invoice_marketplace::initialize" \
  --args "address:<CONTRACT_ADDRESS>" "u64:50" "address:<YOUR_ADDRESS>" \
  --named-addresses shelby_invoice=<CONTRACT_ADDRESS>

# Initialize Arbitrator Registry
aptos move run \
  --function-id "<CONTRACT_ADDRESS>::arbitrator_nft::initialize" \
  --args "address:<YOUR_ADDRESS>" \
  --named-addresses shelby_invoice=<CONTRACT_ADDRESS>

# Set marketplace on registry
aptos move run \
  --function-id "<CONTRACT_ADDRESS>::invoice_registry::set_marketplace" \
  --args "address:<CONTRACT_ADDRESS>" \
  --named-addresses shelby_invoice=<CONTRACT_ADDRESS>
```

### 3. Frontend Setup

```bash
cd frontend
npm install

cp .env.example .env.local
# Fill in your contract addresses and API keys in .env.local

npm run dev
```

### 4. Deploy to Vercel

```bash
# Push to GitHub, then connect repo to Vercel
# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_APTOS_API_KEY
# - NEXT_PUBLIC_CONTRACT_ADDRESS
# - NEXT_PUBLIC_REGISTRY_ADDRESS
# - NEXT_PUBLIC_MARKETPLACE_ADDRESS
# - NEXT_PUBLIC_ARBITRATOR_ADDRESS
# - NEXT_PUBLIC_SHELBY_API_KEY
```

---

## Contract Architecture

```
invoice_registry.move
├── create_invoice()       — vendor creates invoice
├── pay_invoice()          — payer pays in USDC
├── cancel_invoice()       — vendor cancels
├── raise_dispute()        — vendor or payer raises dispute
├── resolve_dispute()      — arbitrator resolves
└── transfer_beneficiary() — marketplace transfers ownership

invoice_marketplace.move
├── list_invoice()         — vendor lists at discount
├── buy_invoice()          — buyer purchases, becomes beneficiary
└── cancel_listing()       — seller cancels listing

arbitrator_nft.move
├── mint_gold()            — mint Gold tier (100 USDC)
├── upgrade_to_diamond()   — upgrade to Diamond (500 USDC, 10 disputes, 80% rep)
├── upgrade_to_platinum()  — upgrade to Platinum (2000 USDC, 50 disputes, 95% rep)
├── record_resolution()    — update reputation after dispute
└── slash()                — admin slashes for misconduct
```

---

## USDC Token

This project uses USDC as a Fungible Asset (FA) on Aptos:
```
0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832
```

Get testnet USDC from the Shelby faucet:
```
https://docs.shelby.xyz/apis/faucet/shelbyusd?address=<YOUR_ADDRESS>
```

---

## Shelby Storage

Invoice metadata (description, notes, parties) is stored on Shelby and hashed on-chain for integrity. Anyone can verify a document by:
1. Fetching the `shelby_url` from the invoice
2. Hashing the content with SHA-256
3. Comparing to the `metadata_hash` stored on-chain

---

Built with ❤️ on Aptos + Shelby
