import { Prisma } from "@prisma/client";

/**
 * Converts any Decimal, number, or numeric string to an exact 2-decimal string.
 */
export function toDecimalString(val: Prisma.Decimal | number | string): string {
  if (val instanceof Prisma.Decimal) {
    return val.toFixed(2);
  }
  const d = new Prisma.Decimal(val);
  return d.toFixed(2);
}

/**
 * Converts a currency value into total cents as an integer.
 * Avoids JS floating point inaccuracies (e.g. 10.33 -> 1033).
 */
export function toCents(val: Prisma.Decimal | number | string): number {
  const d = new Prisma.Decimal(val);
  return Math.round(d.times(100).toNumber());
}

/**
 * Converts integer cents back into a Prisma.Decimal.
 */
export function fromCents(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(cents).dividedBy(100);
}

export interface PartnerAllocationTarget {
  membershipId: string;
  percentage: number; // e.g. 33.33
}

export interface FinalizedAllocation {
  membershipId: string;
  profitSharePercentage: Prisma.Decimal;
  allocatedAmount: Prisma.Decimal;
}

/**
 * Calculates deterministic, decimal-safe profit distribution.
 *
 * Algorithm:
 * 1. Convert total amount to exact integer cents.
 * 2. Calculate baseline allocation for each partner: floor(totalCents * (percentage / 100)).
 * 3. Compute remaining undistributed cents: totalCents - sum(baselineAllocations).
 * 4. Deterministically distribute 1 cent sequentially to partners ordered by membershipId ascending
 *    until remainder is 0.
 *
 * Result: Exactly sum(allocatedAmount) === totalDistributableAmount with ZERO lost cents.
 */
export function calculateDeterministicAllocations(
  totalDistributable: Prisma.Decimal | number | string,
  targets: PartnerAllocationTarget[]
): FinalizedAllocation[] {
  const totalCents = toCents(totalDistributable);

  if (totalCents <= 0 || targets.length === 0) {
    return targets.map((t) => ({
      membershipId: t.membershipId,
      profitSharePercentage: new Prisma.Decimal(t.percentage),
      allocatedAmount: new Prisma.Decimal(0),
    }));
  }

  // Sort partners deterministically by membershipId
  const sorted = [...targets].sort((a, b) => a.membershipId.localeCompare(b.membershipId));

  let allocatedSumCents = 0;
  const initialAllocations = sorted.map((t) => {
    // Exact baseline cents using integer arithmetic
    const partnerCents = Math.floor((totalCents * t.percentage) / 100);
    allocatedSumCents += partnerCents;
    return {
      membershipId: t.membershipId,
      percentage: new Prisma.Decimal(t.percentage),
      cents: partnerCents,
    };
  });

  // Minor-currency remainder cents to assign
  let remainderCents = totalCents - allocatedSumCents;

  // Deterministically assign remainder 1 cent at a time
  let idx = 0;
  while (remainderCents > 0 && idx < initialAllocations.length) {
    initialAllocations[idx].cents += 1;
    remainderCents -= 1;
    idx = (idx + 1) % initialAllocations.length;
  }

  return initialAllocations.map((a) => ({
    membershipId: a.membershipId,
    profitSharePercentage: a.percentage,
    allocatedAmount: fromCents(a.cents),
  }));
}
