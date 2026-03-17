export type Invoice = {
  id: number;
  vendor: string;
  payer: string;
  arbitrator: string;
  beneficiary: string;
  amount: number;
  due_date: number;
  status: number;
  metadata_hash: string;
  shelby_url: string;
  description: string;
  created_at: number;
  paid_at: number;
  dispute_reason: string;
};

export type Listing = {
  id: number;
  invoice_id: number;
  seller: string;
  price: number;
  status: number;
  created_at: number;
  sold_at: number;
  buyer: string;
};

export type ArbitratorProfile = {
  owner: string;
  tier: number;
  disputes_resolved: number;
  disputes_total: number;
  reputation_score: number;
  minted_at: number;
  last_active: number;
  shelby_url: string;
};

export type CreateInvoiceParams = {
  payer: string;
  arbitrator: string;
  amount: string;
  due_date: string;
  description: string;
  notes?: string;
};

export type DisputeParams = {
  invoice_id: number;
  reason: string;
};

export type ResolveParams = {
  invoice_id: number;
  winner: string;
};
