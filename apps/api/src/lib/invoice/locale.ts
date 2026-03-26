export const TranslationKey = {
  invoice: "invoice",
  invoiceNumber: "invoice_number",
  date: "date",
  dueDate: "due_date",
  billTo: "bill_to",
  description: "description",
  quantity: "quantity",
  rate: "rate",
  amount: "amount",
  subtotal: "subtotal",
  tax: "tax",
  discount: "discount",
  shipping: "shipping",
  grandTotal: "grand_total",
  notes: "notes",
  terms: "terms",
  thankYou: "thank_you",
} as const;

type TranslationMap = Record<string, string>;

const translations: Record<string, TranslationMap> = {
  en: {
    invoice: "INVOICE",
    invoice_number: "Invoice Number",
    date: "Date",
    due_date: "Due Date",
    bill_to: "Bill To",
    description: "Description",
    quantity: "Quantity",
    rate: "Rate",
    amount: "Amount",
    subtotal: "Subtotal",
    tax: "Tax",
    discount: "Discount",
    shipping: "Shipping",
    grand_total: "Grand Total",
    notes: "Notes",
    terms: "Terms",
    thank_you: "Thank you for your business!",
  },
  es: {
    invoice: "FACTURA",
    invoice_number: "Número de Factura",
    date: "Fecha",
    due_date: "Fecha de Vencimiento",
    bill_to: "Facturar a",
    description: "Descripción",
    quantity: "Cantidad",
    rate: "Tarifa",
    amount: "Cantidad",
    subtotal: "Subtotal",
    tax: "Impuesto",
    discount: "Descuento",
    shipping: "Envío",
    grand_total: "Total General",
    notes: "Notas",
    terms: "Términos",
    thank_you: "¡Gracias por su negocio!",
  },
  fr: {
    invoice: "FACTURE",
    invoice_number: "Numéro de Facture",
    date: "Date",
    due_date: "Date d'Échéance",
    bill_to: "Facturer à",
    description: "Description",
    quantity: "Quantité",
    rate: "Taux",
    amount: "Montant",
    subtotal: "Sous-total",
    tax: "Taxe",
    discount: "Remise",
    shipping: "Expédition",
    grand_total: "Total Général",
    notes: "Notes",
    terms: "Conditions",
    thank_you: "Merci pour votre affaire!",
  },
  de: {
    invoice: "RECHNUNG",
    invoice_number: "Rechnungsnummer",
    date: "Datum",
    due_date: "Fälligkeitsdatum",
    bill_to: "Rechnung an",
    description: "Beschreibung",
    quantity: "Menge",
    rate: "Satz",
    amount: "Betrag",
    subtotal: "Zwischensumme",
    tax: "Steuer",
    discount: "Rabatt",
    shipping: "Versand",
    grand_total: "Gesamtsumme",
    notes: "Notizen",
    terms: "Bedingungen",
    thank_you: "Vielen Dank für Ihr Geschäft!",
  },
  it: {
    invoice: "FATTURA",
    invoice_number: "Numero Fattura",
    date: "Data",
    due_date: "Data Scadenza",
    bill_to: "Fattura a",
    description: "Descrizione",
    quantity: "Quantità",
    rate: "Tariffa",
    amount: "Importo",
    subtotal: "Subtotale",
    tax: "Imposta",
    discount: "Sconto",
    shipping: "Spedizione",
    grand_total: "Totale Generale",
    notes: "Note",
    terms: "Termini",
    thank_you: "Grazie per il vostro business!",
  },
  pt: {
    invoice: "FATURA",
    invoice_number: "Número da Fatura",
    date: "Data",
    due_date: "Data de Vencimento",
    bill_to: "Faturar para",
    description: "Descrição",
    quantity: "Quantidade",
    rate: "Taxa",
    amount: "Valor",
    subtotal: "Subtotal",
    tax: "Imposto",
    discount: "Desconto",
    shipping: "Envio",
    grand_total: "Total Geral",
    notes: "Notas",
    terms: "Termos",
    thank_you: "Obrigado pelo seu negócio!",
  },
  ja: {
    invoice: "請求書",
    invoice_number: "請求書番号",
    date: "日付",
    due_date: "支払期限",
    bill_to: "請求先",
    description: "説明",
    quantity: "数量",
    rate: "料金",
    amount: "金額",
    subtotal: "小計",
    tax: "税金",
    discount: "割引",
    shipping: "配送",
    grand_total: "総計",
    notes: "備考",
    terms: "条件",
    thank_you: "ご利用ありがとうございます！",
  },
  zh: {
    invoice: "发票",
    invoice_number: "发票号码",
    date: "日期",
    due_date: "到期日期",
    bill_to: "账单地址",
    description: "描述",
    quantity: "数量",
    rate: "费率",
    amount: "金额",
    subtotal: "小计",
    tax: "税费",
    discount: "折扣",
    shipping: "运费",
    grand_total: "总金额",
    notes: "备注",
    terms: "条款",
    thank_you: "感谢您的业务！",
  },
  ru: {
    invoice: "СЧЕТ",
    invoice_number: "Номер Счета",
    date: "Дата",
    due_date: "Срок Оплаты",
    bill_to: "Счет на",
    description: "Описание",
    quantity: "Количество",
    rate: "Ставка",
    amount: "Сумма",
    subtotal: "Промежуточный Итог",
    tax: "Налог",
    discount: "Скидка",
    shipping: "Доставка",
    grand_total: "Общая Сумма",
    notes: "Примечания",
    terms: "Условия",
    thank_you: "Спасибо за ваш бизнес!",
  },
  ar: {
    invoice: "فاتورة",
    invoice_number: "رقم الفاتورة",
    date: "التاريخ",
    due_date: "تاريخ الاستحقاق",
    bill_to: "فاتورة إلى",
    description: "الوصف",
    quantity: "الكمية",
    rate: "المعدل",
    amount: "المبلغ",
    subtotal: "المجموع الفرعي",
    tax: "الضريبة",
    discount: "الخصم",
    shipping: "الشحن",
    grand_total: "المجموع الكلي",
    notes: "ملاحظات",
    terms: "الشروط",
    thank_you: "شكراً لعملكم!",
  },
};

export function translate(language: string, key: string): string {
  const lang = language.toLowerCase().split("-")[0]!;
  return translations[lang]?.[key] ?? translations["en"]![key] ?? key;
}

interface CurrencyConfig {
  symbol: string;
  position: "before" | "after";
  separator: string;
  decimals: number;
}

function getCurrencyConfig(currency: string, locale: string): CurrencyConfig {
  const cfg: CurrencyConfig = { symbol: currency, position: "before", separator: ",", decimals: 2 };
  const loc = locale.toLowerCase().split("-")[0]!;

  switch (loc) {
    case "de": case "at": cfg.separator = "."; cfg.position = "after"; break;
    case "fr": case "be": cfg.separator = " "; cfg.position = "after"; break;
    case "es": case "it": case "pt": cfg.separator = "."; cfg.position = "after"; break;
    case "ru": cfg.separator = " "; cfg.position = "after"; break;
    case "ar": cfg.separator = ","; cfg.position = "after"; break;
  }

  switch (currency.toUpperCase()) {
    case "USD": case "MXN": cfg.symbol = "$"; cfg.position = "before"; break;
    case "EUR": cfg.symbol = "€"; cfg.position = loc === "en" ? "before" : "after"; break;
    case "GBP": cfg.symbol = "£"; cfg.position = "before"; break;
    case "JPY": cfg.symbol = "¥"; cfg.position = "before"; cfg.decimals = 0; break;
    case "CNY": cfg.symbol = "¥"; cfg.position = "before"; break;
    case "RUB": cfg.symbol = "₽"; cfg.position = "after"; break;
    case "INR": cfg.symbol = "₹"; cfg.position = "before"; break;
    case "BRL": cfg.symbol = "R$"; cfg.position = "before"; break;
    case "KRW": cfg.symbol = "₩"; cfg.position = "before"; cfg.decimals = 0; break;
    case "ZAR": cfg.symbol = "R"; cfg.position = "before"; break;
    case "CHF": cfg.symbol = "CHF"; cfg.position = "after"; cfg.separator = " "; break;
    case "SEK": case "NOK": case "DKK": cfg.symbol = currency; cfg.position = "after"; cfg.separator = " "; break;
    case "PLN": cfg.symbol = "zł"; cfg.position = "after"; break;
    case "THB": cfg.symbol = "฿"; cfg.position = "before"; break;
  }

  return cfg;
}

function addThousandSeparators(s: string, sep: string): string {
  if (s.length <= 3) return s;
  let result = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) result += sep;
    result += s[i];
  }
  return result;
}

export function formatCurrency(amount: number, currency: string, locale: string): string {
  const cfg = getCurrencyConfig(currency, locale);
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const fixed = abs.toFixed(cfg.decimals);
  const [intPart, decPart] = fixed.split(".");
  const formatted = addThousandSeparators(intPart!, cfg.separator) + (decPart ? "." + decPart : "");
  const sign = isNeg ? "-" : "";

  if (cfg.position === "before") return sign + cfg.symbol + formatted;
  return sign + formatted + " " + cfg.symbol;
}

export function formatDate(dateStr: string, language: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;

  const lang = language.toLowerCase().split("-")[0]!;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  switch (lang) {
    case "en": return `${months[d.getMonth()]} ${day}, ${year}`;
    case "de": case "ru": return `${day}.${month}.${year}`;
    case "ja": case "zh": return `${year}年${month}月${day}日`;
    default: return `${day}/${month}/${year}`;
  }
}
