export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_percent?: number;
  tax_exempt?: boolean;
  special_tax_rate?: number;
  sort_order?: number;
}

export interface CustomAdjustment {
  label: string;
  amount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  totalTax: number;
  discount: number;
  shipping: number;
  grandTotal: number;
}

/**
 * Port of Go CalculateTotals — computes financial totals with item-level taxes,
 * global fallback tax, shipping, discount, and custom adjustments.
 */
export function calculateTotals(
  items: InvoiceItem[],
  opts: {
    globalTaxPercent?: number;
    globalDiscountAmount?: number;
    shippingAmount?: number;
    taxInclusive?: boolean;
    customAdjustments?: CustomAdjustment[];
  } = {},
): InvoiceTotals {
  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const lineTotal = item.quantity * item.unit_price;
    subtotal += lineTotal;

    if (!item.tax_exempt) {
      const rate = (item.special_tax_rate && item.special_tax_rate > 0)
        ? item.special_tax_rate
        : (item.tax_percent && item.tax_percent > 0)
          ? item.tax_percent
          : 0;

      if (rate > 0) {
        if (opts.taxInclusive) {
          totalTax += lineTotal * (rate / (100 + rate));
        } else {
          totalTax += lineTotal * (rate / 100);
        }
      }
    }
  }

  if ((opts.globalTaxPercent ?? 0) > 0 && totalTax === 0) {
    const gtp = opts.globalTaxPercent!;
    if (opts.taxInclusive) {
      totalTax += subtotal * (gtp / (100 + gtp));
    } else {
      totalTax += subtotal * (gtp / 100);
    }
  }

  const discount = Math.max(opts.globalDiscountAmount ?? 0, 0);
  const shipping = Math.max(opts.shippingAmount ?? 0, 0);

  let customAdj = 0;
  if (opts.customAdjustments) {
    for (const adj of opts.customAdjustments) {
      customAdj += adj.amount;
    }
  }

  let grandTotal: number;
  if (opts.taxInclusive) {
    grandTotal = subtotal + shipping - discount + customAdj;
  } else {
    grandTotal = subtotal + totalTax + shipping - discount + customAdj;
  }
  if (grandTotal < 0) grandTotal = 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}
