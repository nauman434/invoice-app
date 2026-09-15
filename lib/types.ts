export type LineItemInput = {
  id?: string;
  description: string;
  hours: number;
  total: number;
  isManualTotal: boolean;
};

export type CategoryInput = {
  id?: string;
  name: string;
  lineItems: LineItemInput[];
};

export type BankDetails = {
  bankAccountTitle?: string;
  bankSwiftCode?: string;
  bankIban?: string;
  bankName?: string;
  bankBranchCode?: string;
  bankAccountNumber?: string;
};

export type InvoiceStatus = "DRAFT" | "FINAL";

export type InvoiceInput = {
  id?: string;
  invoiceNumber: string;
  status?: InvoiceStatus;
  periodLabel: string;
  billedTo: string;
  fromName: string;
  invoiceDate: string; // ISO date
  currency: string;
  rate: number;
  footerNote?: string;
  categories: CategoryInput[];
} & BankDetails;

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "PKR", symbol: "Rs", label: "Pakistani Rupee" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "AED", symbol: "AED", label: "UAE Dirham" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "AU$", label: "Australian Dollar" },
] as const;

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
