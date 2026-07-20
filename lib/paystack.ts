// Plan catalogue for TvicGlobal's flat-rate subscription.
// Safe to import from client components - no secrets here.

export const PLANS = {
  monthly: { label: "Monthly", amount: 5000, days: 30 },
  quarterly: { label: "3 Months", amount: 14000, days: 90 },
  biannual: { label: "6 Months", amount: 25000, days: 180 },
  yearly: { label: "Yearly", amount: 45000, days: 365 },
} as const;

export type PlanKey = keyof typeof PLANS;
