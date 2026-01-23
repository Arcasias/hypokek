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
  monthlyBase: number;
  monthlyInsurances: number;
  monthlyInterests: number;
  monthlyPayments?: [string, number][];
  taeg: number;
  totalBase: number;
  totalInsurances: number;
  totalInterests: number;
  totalsPaid?: [string, number][];
}

function computeAnnuity(loan: number, rate: number, duration: number) {
  const monthlyRate = rate / 12 / 100;
  const amountOfPayments = duration * 12;
  const monthlyBase = loan / amountOfPayments;

  const totalMonthlyRate = (1 + monthlyRate) ** amountOfPayments;
  const fixedMonthlyPayment =
    (loan * monthlyRate * totalMonthlyRate) / (totalMonthlyRate - 1);

  const totalWithInterests = fixedMonthlyPayment * amountOfPayments;
  const totalInterests = totalWithInterests - loan;
  const monthlyInterests = fixedMonthlyPayment - monthlyBase;

  return {
    amountOfPayments,
    monthlyBase,
    monthlyInterests,
    totalBase: loan,
    totalInterests,
  };
}

/**
 * @param loan - principal amount in €
 * @param rate - yearly nominal rate (e.g. 3.2 for 3.2%)
 * @param duration - in years
 * @param monthlyInsurances - mandatory insurance per month in €
 * @param upfrontFees - in €
 */
function computeAnnuityWithTAEG(
  loan: number,
  rate: number,
  duration: number,
  monthlyInsurances: number,
): MortgageResult {
  const annuity = computeAnnuity(loan, rate, duration);
  const totalInsurances = monthlyInsurances * annuity.amountOfPayments;
  const grandTotal =
    annuity.totalBase + annuity.totalInterests + totalInsurances;

  const targetMin = grandTotal - 1;
  const targetMax = grandTotal + 1;

  let taeg = 0;
  let maxIter = 0;
  let min = rate;
  let max = min * 2;
  let current = (min + max) / 2;
  while (maxIter++ < 1e6) {
    const testAnnuity = computeAnnuity(loan, current, duration);
    const testTotal = testAnnuity.totalBase + testAnnuity.totalInterests;
    if (testTotal < targetMin) {
      min = current;
    } else if (testTotal > targetMax) {
      max = current;
    } else {
      taeg = current / 100;
      break;
    }
    current = (min + max) / 2;
  }

  return {
    ...annuity,
    monthlyInsurances,
    totalBase: loan,
    totalInsurances,
    taeg,
  };
}

/**
 * Computes the Belgian mortgage parameters for buying a property.
 * It should take into account a basic implementation of the TAEG.
 */
export function computeMortgage(
  {
    asrd,
    asrdPeriod,
    duration,
    fixedRate,
    loaners,
    incendie,
    principal,
  }: {
    asrd: number;
    asrdPeriod: number;
    duration: number;
    fixedRate: number;
    incendie: number;
    loaners: Loaner[];
    principal: number;
  },
  fees: Record<string, number>,
) {
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
    ...fees,
  };

  const equityMinusFixedFees = totalEquity - sum(Object.values(allUpfrontFees));
  const loanTotal = principal - equityMinusFixedFees;
  let upfrontFees = 0;

  for (const loaner of loanerInfos) {
    loaner.split =
      totalRemaining > 0
        ? loaner.remaining! / totalRemaining
        : 1 / (loaners.length || 1);
  }

  let mandatoryInsurances = 0;
  if (incendie > 0) {
    mandatoryInsurances += incendie;
  }
  if (asrd > 0) {
    if (asrdPeriod > 0) {
      mandatoryInsurances += asrd / (asrdPeriod * 12);
    } else {
      upfrontFees += asrd;
    }
  }

  const result = computeAnnuityWithTAEG(
    loanTotal,
    fixedRate,
    duration,
    mandatoryInsurances,
  );
  const totalPaid =
    result.totalBase + result.totalInterests + result.totalInsurances;
  const monthlyTotal =
    result.monthlyBase + result.monthlyInterests + mandatoryInsurances;
  if (loanerInfos.length > 1) {
    result.totalsPaid = [];
    result.monthlyPayments = [];
    for (const { name, split } of loanerInfos) {
      const nameShort = name.split(/\s+/)[0];
      result.totalsPaid.push([nameShort, split * totalPaid]);
      result.monthlyPayments.push([nameShort, split * monthlyTotal]);
    }
  }
  return {
    ...result,
    duration,
    equity: equityMinusFixedFees,
    fees: allUpfrontFees,
    principal: loanTotal,
  };
}

export function sum(list: number[]) {
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    total += list[i];
  }
  return total;
}
