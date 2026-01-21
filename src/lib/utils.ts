export interface Loaner {
  name: string;
  equity: number;
  owner: boolean;
  share: number;
}

interface LoanerInfo extends Loaner {
  remaining: number;
  split: number;
}

interface MortgageResult {
  duration: number;
  monthlyPayment: number;
  monthlyPayments?: [string, number][];
  totalInterest: number;
  totalInsurance: number;
  totalPaid: number;
  totalsPaid?: [string, number][];
  taeg: number;
}

/**
 * @param loan - principal amount in €
 * @param rate - yearly nominal rate (e.g. 3.2 for 3.2%)
 * @param duration - in years
 * @param monthlyMandatoryInsurance - mandatory insurance per month in €
 * @param upfrontFees - in €
 */
function computeAnnuityWithTAEG(
  loan: number,
  rate: number,
  duration: number,
  monthlyMandatoryInsurance: number,
  upfrontFees: number
): MortgageResult {
  const monthlyRate = rate / 12 / 100;
  const amountOfPayments = duration * 12;
  const totalMonthlyRate = (1 + monthlyRate) ** amountOfPayments;
  const fixedMonthlyPayment =
    (loan * monthlyRate * totalMonthlyRate) / (totalMonthlyRate - 1);

  const totalInterest = fixedMonthlyPayment * amountOfPayments - loan;
  const totalInsurance = monthlyMandatoryInsurance * amountOfPayments;

  // Cash flows for TAEG (borrower perspective)
  const cashFlows = [
    loan - upfrontFees, // t = 0
  ].concat(
    Array(amountOfPayments).fill(
      -(fixedMonthlyPayment + monthlyMandatoryInsurance)
    )
  );

  const monthlyIRR = computeIRR(cashFlows);
  const taeg = (1 + monthlyIRR) ** 12 - 1;

  return {
    duration,
    monthlyPayment: fixedMonthlyPayment + monthlyMandatoryInsurance,
    totalInterest,
    totalInsurance,
    totalPaid:
      fixedMonthlyPayment * amountOfPayments + totalInsurance + upfrontFees,
    taeg,
  };
}

function computeIRR(cashFlows: number[], guess = 0.002) {
  const maxIterations = 1_000;
  const precision = 1e-9;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const df = (1 + rate) ** t;
      npv += cashFlows[t] / df;
      if (t > 0) {
        const denom = (1 + rate) ** (t + 1);
        dNpv -= (t * cashFlows[t]) / denom;
      }
    }
    if (Math.abs(dNpv) < 1e-12) {
      break;
    }
    const newRate = rate - npv / dNpv;
    if (!isFinite(newRate) || newRate <= -0.999 || newRate > 1) {
      break;
    }
    if (Math.abs(newRate - rate) < precision) {
      return newRate;
    }
    rate = newRate;
  }

  // Fallback: bisection method
  let low = -0.9;
  let high = 0.05; // 5% monthly = ~80% annual
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    let npv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / (1 + mid) ** t;
    }
    if (Math.abs(npv) < precision) {
      return mid;
    }
    if (npv > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  throw new Error("IRR did not converge");
}

const FIXED_FEES = {
  ["Droit pour les annexes"]: 100,
  ["Honoraires"]: 2878.24,
  ["Frais administratifs"]: 855,
  ["Débours"]: 304,
  ["Transcription hypothécaire"]: 285,
  ["Droit d'écriture"]: 100,
  ["TVA"]: 868,
};

/**
 * Computes the Belgian mortgage parameters for buying a property.
 * It should take into account a basic implementation of the TAEG.
 */
export function computeMortgage(
  principal: number,
  durations: number | number[],
  fixedRate: number,
  mandatoryInsurance: number,
  loaners: Loaner[]
) {
  if (!Array.isArray(durations)) {
    durations = [durations];
  }

  const defaultShare = 100 / (loaners.length || 1);
  const loanerInfos: LoanerInfo[] = [];
  let totalRegisteringRights = 0;
  let totalEquity = 0;
  let totalRemaining = 0;

  for (const loaner of loaners) {
    const sharePercent = (loaner.share || defaultShare) / 100;
    const loanerInfo = {
      ...loaner,
      remaining: Math.max(0, principal * sharePercent - loaner.equity),
      split: 0,
    };
    // Droits d'enregistrement en Belgique depuis janvier 2025:
    // - 3% si aucune autre pleine propriété
    // - 12.5% si pleine propriété à 100% déjà existante
    totalRegisteringRights +=
      sharePercent * principal * (loaner.owner ? 0.125 : 0.03);
    totalEquity += loaner.equity;
    totalRemaining += loanerInfo.remaining;
    loanerInfos.push(loanerInfo);
  }

  const allUpfrontFees = {
    ["Droits d'enregistrement"]: totalRegisteringRights,
    ...FIXED_FEES,
  };

  const upfrontFees = sum(Object.values(allUpfrontFees));
  const equityMinusUpfrontFees = totalEquity - upfrontFees;
  const loanPrincipal = principal - equityMinusUpfrontFees;

  for (const loaner of loanerInfos) {
    loaner.split =
      totalRemaining > 0
        ? loaner.remaining! / totalRemaining
        : 1 / (loaners.length || 1);
  }

  const loans = durations.map((duration) => {
    const result = computeAnnuityWithTAEG(
      loanPrincipal,
      fixedRate,
      duration,
      mandatoryInsurance,
      upfrontFees
    );
    if (loanerInfos.length > 1) {
      result.totalsPaid = [];
      result.monthlyPayments = [];
      for (const { name, split } of loanerInfos) {
        const nameShort = name.split(/\s+/)[0];
        result.totalsPaid.push([nameShort, split * result.totalPaid]);
        result.monthlyPayments.push([nameShort, split * result.monthlyPayment]);
      }
    }
    return result;
  });

  return { fees: allUpfrontFees, loans };
}

export function sum(list: number[]) {
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    total += list[i];
  }
  return total;
}
