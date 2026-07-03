export interface AccumulatorContractInfo {
  barriers: number;
  contract_category: string;
  contract_type: string;
  default_stake: number;
  expiry_type: string;
  growth_rate_range: number[];
  high_barrier: string;
  low_barrier: string;
  market: string;
  max_contract_duration: string;
  min_contract_duration: string;
  sentiment: string;
  submarket: string;
  underlying_symbol: string;
}

export type GrowthRate = number;
