export interface PurityDefinition {
  id: string;
  name?: string;
  fineness: number;
}

export interface GoldWeightMetrics {
  grossWeight: number;
  netWeight: number;
  purity: string;
  fineGoldWeight: number;
  fineGoldPercentage: number;
  equivalent22K: number;
  equivalent18K: number;
}

const STANDARD_FINESS: Record<string, number> = {
  "24K": 1,
  "22K": 22 / 24,
  "18K": 18 / 24,
};
const FINE_TO_22K = 22 / 24;
const FINE_TO_18K = 18 / 24;

export function purityFineness(purity: string, configured: readonly PurityDefinition[] = []): number {
  const configuredPurity = configured.find((item) => item.id === purity || item.name === purity);
  if (configuredPurity) {
    if (!Number.isFinite(configuredPurity.fineness) || configuredPurity.fineness <= 0 || configuredPurity.fineness > 1) {
      throw new Error(`Purity ${purity} has an invalid fineness.`);
    }
    return configuredPurity.fineness;
  }
  const standard = STANDARD_FINESS[purity.toUpperCase()];
  if (standard) return standard;
  const karat = purity.match(/^(\d+(?:\.\d+)?)\s*K$/i);
  if (!karat) throw new Error(`Purity ${purity} is not configured.`);
  const value = Number(karat[1]) / 24;
  if (!Number.isFinite(value) || value <= 0 || value > 1) throw new Error(`Purity ${purity} is outside the valid 0–24K range.`);
  return value;
}

export function calculateFineGoldWeight(netWeight: number, purity: string, configured: readonly PurityDefinition[] = []) {
  if (!Number.isFinite(netWeight) || netWeight < 0) throw new Error("Net weight must be a non-negative number.");
  return netWeight * purityFineness(purity, configured);
}

export function calculateFineGoldAtFineness(netWeight: number, fineness: number) {
  if (!Number.isFinite(netWeight) || netWeight < 0 || !Number.isFinite(fineness) || fineness <= 0 || fineness > 1) {
    throw new Error("Weight and fineness must be valid non-negative values.");
  }
  return netWeight * fineness;
}

export function calculateGoldMetricsAtFineness(grossWeight: number, netWeight: number, purity: string, fineness: number): GoldWeightMetrics {
  if (!Number.isFinite(grossWeight) || grossWeight < 0 || !Number.isFinite(netWeight) || netWeight < 0 || netWeight > grossWeight) {
    throw new Error("Gross and net weights must be valid, and net weight cannot exceed gross weight.");
  }
  const fineGoldWeight = calculateFineGoldAtFineness(netWeight, fineness);
  return {
    grossWeight,
    netWeight,
    purity,
    fineGoldWeight,
    fineGoldPercentage: fineness * 100,
    equivalent22K: fineGoldWeight / FINE_TO_22K,
    equivalent18K: fineGoldWeight / FINE_TO_18K,
  };
}

export function calculateGoldWeightMetrics(input: {
  grossWeight: number;
  netWeight?: number;
  purity: string;
  configured?: readonly PurityDefinition[];
}): GoldWeightMetrics {
  const netWeight = input.netWeight ?? input.grossWeight;
  if (!Number.isFinite(input.grossWeight) || input.grossWeight < 0 || !Number.isFinite(netWeight) || netWeight < 0 || netWeight > input.grossWeight) {
    throw new Error("Gross and net weights must be valid, and net weight cannot exceed gross weight.");
  }
  const fineness = purityFineness(input.purity, input.configured);
  const fineGoldWeight = netWeight * fineness;
  return {
    grossWeight: input.grossWeight,
    netWeight,
    purity: input.purity,
    fineGoldWeight,
    fineGoldPercentage: fineness * 100,
    equivalent22K: fineGoldWeight / FINE_TO_22K,
    equivalent18K: fineGoldWeight / FINE_TO_18K,
  };
}

export function convertGoldWeight(weight: number, fromPurity: string, toPurity: string, configured: readonly PurityDefinition[] = []) {
  if (!Number.isFinite(weight) || weight < 0) throw new Error("Weight must be a non-negative number.");
  return (weight * purityFineness(fromPurity, configured)) / purityFineness(toPurity, configured);
}

export function goldRateForPurity(rate22: number, rate18: number, purity: string, configured: readonly PurityDefinition[] = []) {
  if (!Number.isFinite(rate22) || rate22 <= 0 || !Number.isFinite(rate18) || rate18 <= 0) throw new Error("Gold rates must be greater than zero.");
  if (purity === "18K") return rate18;
  return goldRateFrom22K(rate22, purity, configured);
}

export function goldRateFrom22K(rate22: number, purity: string, configured: readonly PurityDefinition[] = []) {
  if (!Number.isFinite(rate22) || rate22 <= 0) throw new Error("The 22K gold rate must be greater than zero.");
  return rate22 * purityFineness(purity, configured) / FINE_TO_22K;
}
