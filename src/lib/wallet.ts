export const SETTLEMENT_ADDRESS_LABEL = "Pre-Registered Payroll Settlement Wallet Address";

export function walletDisplayName(brand: string | null | undefined): string {
  const name = brand?.trim();
  if (!name) return "Blockchain Wallet";
  return /wallet$/i.test(name) ? name : `${name} Wallet`;
}
