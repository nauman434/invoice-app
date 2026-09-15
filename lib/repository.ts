import { prisma } from "@/lib/prisma";
import { InvoiceInput } from "@/lib/types";

function computeTotals(input: InvoiceInput) {
  const categories = input.categories.map((cat) => {
    const lineItems = cat.lineItems.map((li) => {
      const total = li.isManualTotal ? li.total : Math.round(li.hours * input.rate * 100) / 100;
      return { ...li, total };
    });
    const subtotalHours = lineItems.reduce((s, li) => s + li.hours, 0);
    const subtotalAmount = lineItems.reduce((s, li) => s + li.total, 0);
    return { ...cat, lineItems, subtotalHours, subtotalAmount };
  });
  const totalHours = categories.reduce((s, c) => s + c.subtotalHours, 0);
  const totalAmount = categories.reduce((s, c) => s + c.subtotalAmount, 0);
  return { categories, totalHours, totalAmount };
}

/** Finds or creates a Client row by name for this user (case-insensitive match). */
async function upsertClientFromInvoice(userId: string, input: InvoiceInput) {
  const existing = await prisma.client.findFirst({
    where: { userId, name: { equals: input.billedTo, mode: "insensitive" } },
  });

  const data = {
    name: input.billedTo,
    defaultRate: input.rate,
    currency: input.currency,
    bankAccountTitle: input.bankAccountTitle,
    bankSwiftCode: input.bankSwiftCode,
    bankIban: input.bankIban,
    bankName: input.bankName,
    bankBranchCode: input.bankBranchCode,
    bankAccountNumber: input.bankAccountNumber,
  };

  if (existing) {
    return prisma.client.update({ where: { id: existing.id }, data });
  }
  return prisma.client.create({ data: { ...data, userId } });
}

export async function listInvoices(
  userId: string,
  opts?: { clientName?: string; from?: string; to?: string; currency?: string; status?: "DRAFT" | "FINAL" }
) {
  return prisma.invoice.findMany({
    where: {
      userId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.clientName ? { billedTo: { contains: opts.clientName, mode: "insensitive" } } : {}),
      ...(opts?.currency ? { currency: opts.currency } : {}),
      ...(opts?.from || opts?.to
        ? {
            invoiceDate: {
              ...(opts?.from ? { gte: new Date(opts.from) } : {}),
              ...(opts?.to ? { lte: new Date(opts.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { invoiceDate: "desc" },
    include: { categories: { include: { lineItems: true } } },
  });
}

export async function getInvoice(userId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, userId },
    include: { categories: { include: { lineItems: true }, orderBy: { sortOrder: "asc" } } },
  });
}

type InvoiceBaseData = {
  clientId: string | null;
  invoiceNumber: string;
  status: "DRAFT" | "FINAL";
  periodLabel: string;
  billedTo: string;
  fromName: string;
  invoiceDate: Date;
  currency: string;
  rate: number;
  bankAccountTitle: string | null;
  bankSwiftCode: string | null;
  bankIban: string | null;
  bankName: string | null;
  bankBranchCode: string | null;
  bankAccountNumber: string | null;
  footerNote: string;
  totalHours: number;
  totalAmount: number;
};

export async function saveInvoice(userId: string, input: InvoiceInput) {
  const { categories, totalHours, totalAmount } = computeTotals(input);
  const client = await upsertClientFromInvoice(userId, input);

  const baseData: InvoiceBaseData = {
    clientId: client.id,
    invoiceNumber: input.invoiceNumber,
    status: input.status ?? "DRAFT",
    periodLabel: input.periodLabel,
    billedTo: input.billedTo,
    fromName: input.fromName,
    invoiceDate: new Date(input.invoiceDate),
    currency: input.currency,
    rate: input.rate,
    bankAccountTitle: input.bankAccountTitle ?? null,
    bankSwiftCode: input.bankSwiftCode ?? null,
    bankIban: input.bankIban ?? null,
    bankName: input.bankName ?? null,
    bankBranchCode: input.bankBranchCode ?? null,
    bankAccountNumber: input.bankAccountNumber ?? null,
    footerNote: input.footerNote ?? "Thank you!",
    totalHours,
    totalAmount,
  };

  if (input.id) {
    // Replace categories/line items wholesale on edit - simplest correct approach.
    await prisma.category.deleteMany({ where: { invoiceId: input.id } });
    return prisma.invoice.update({
      where: { id: input.id },
      data: {
        ...baseData,
        categories: {
          create: categories.map((cat, ci) => ({
            name: cat.name,
            sortOrder: ci,
            subtotalHours: cat.subtotalHours,
            subtotalAmount: cat.subtotalAmount,
            lineItems: {
              create: cat.lineItems.map((li, li_i) => ({
                description: li.description,
                hours: li.hours,
                total: li.total,
                isManualTotal: li.isManualTotal,
                sortOrder: li_i,
              })),
            },
          })),
        },
      },
      include: { categories: { include: { lineItems: true } } },
    });
  }

  return prisma.invoice.create({
    data: {
      userId,
      ...baseData,
      categories: {
        create: categories.map((cat, ci) => ({
          name: cat.name,
          sortOrder: ci,
          subtotalHours: cat.subtotalHours,
          subtotalAmount: cat.subtotalAmount,
          lineItems: {
            create: cat.lineItems.map((li, li_i) => ({
              description: li.description,
              hours: li.hours,
              total: li.total,
              isManualTotal: li.isManualTotal,
              sortOrder: li_i,
            })),
          },
        })),
      },
    },
    include: { categories: { include: { lineItems: true } } },
  });
}

export async function deleteInvoice(userId: string, id: string) {
  return prisma.invoice.deleteMany({ where: { id, userId } });
}

/** Suggests the next invoice number as YYYY-MM-### based on today's invoices this month. */
export async function nextInvoiceNumber(userId: string) {
  const now = new Date();
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const count = await prisma.invoice.count({
    where: { userId, invoiceNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

/** Returns the most recent invoice for a client name, used to autofill a new invoice. */
export async function getClientAutofill(userId: string, name: string) {
  if (!name.trim()) return null;
  const client = await prisma.client.findFirst({
    where: { userId, name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (!client) return null;

  const lastFinal = await prisma.invoice.findFirst({
    where: { userId, clientId: client.id, status: "FINAL" },
    orderBy: { invoiceDate: "desc" },
    include: { categories: { include: { lineItems: true }, orderBy: { sortOrder: "asc" } } },
  });
  const lastInvoice =
    lastFinal ??
    (await prisma.invoice.findFirst({
      where: { userId, clientId: client.id },
      orderBy: { invoiceDate: "desc" },
      include: { categories: { include: { lineItems: true }, orderBy: { sortOrder: "asc" } } },
    }));

  return { client, lastInvoice };
}

export async function listClientNames(userId: string) {
  const clients = await prisma.client.findMany({
    where: { userId },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return clients.map((c: { name: string }) => c.name);
}

export async function getAnalytics(userId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { userId, status: "FINAL" },
    orderBy: { invoiceDate: "asc" },
  });

  const byMonth = new Map<string, { hours: number; amount: number }>();
  const byClient = new Map<string, { hours: number; amount: number }>();

  for (const inv of invoices) {
    const monthKey = `${inv.invoiceDate.getFullYear()}-${String(inv.invoiceDate.getMonth() + 1).padStart(2, "0")}`;
    const m = byMonth.get(monthKey) ?? { hours: 0, amount: 0 };
    m.hours += Number(inv.totalHours);
    m.amount += Number(inv.totalAmount);
    byMonth.set(monthKey, m);

    const c = byClient.get(inv.billedTo) ?? { hours: 0, amount: 0 };
    c.hours += Number(inv.totalHours);
    c.amount += Number(inv.totalAmount);
    byClient.set(inv.billedTo, c);
  }

  return {
    totalInvoices: invoices.length,
    totalEarned: invoices.reduce((s: number, i: (typeof invoices)[number]) => s + Number(i.totalAmount), 0),
    totalHours: invoices.reduce((s: number, i: (typeof invoices)[number]) => s + Number(i.totalHours), 0),
    monthly: Array.from(byMonth.entries())
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => (a.month < b.month ? -1 : 1)),
    clients: Array.from(byClient.entries())
      .map(([client, v]) => ({ client, ...v }))
      .sort((a, b) => b.amount - a.amount),
  };
}