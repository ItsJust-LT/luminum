export const TranslationKey = {
  invoice: "invoice",
  quote: "quote",
  invoiceNumber: "invoice_number",
  quoteNumber: "quote_number",
  date: "date",
  dueDate: "due_date",
  validUntil: "valid_until",
  billTo: "bill_to",
  quoteTo: "quote_to",
  from: "from",
  description: "description",
  quantity: "quantity",
  rate: "rate",
  amount: "amount",
  subtotal: "subtotal",
  tax: "tax",
  discount: "discount",
  shipping: "shipping",
  grandTotal: "grand_total",
  totalDue: "total_due",
  notes: "notes",
  terms: "terms",
  thankYou: "thank_you",
  thankYouQuote: "thank_you_quote",
} as const;

type TranslationMap = Record<string, string>;

const translations: Record<string, TranslationMap> = {
  en: {
    invoice: "Invoice",
    quote: "Quote",
    invoice_number: "Invoice number",
    quote_number: "Quote number",
    date: "Date",
    due_date: "Due date",
    valid_until: "Valid until",
    bill_to: "Bill to",
    quote_to: "Quote for",
    from: "FROM",
    description: "Description",
    quantity: "Qty",
    rate: "Rate",
    amount: "Amount",
    subtotal: "Subtotal",
    tax: "Tax",
    discount: "Discount",
    shipping: "Shipping",
    grand_total: "Grand Total",
    total_due: "Total Due",
    notes: "Notes",
    terms: "Terms & Conditions",
    thank_you: "Thank you for your business!",
    thank_you_quote: "Thank you for considering our services!",
  },
  es: {
    invoice: "FACTURA", quote: "COTIZACIÓN",
    invoice_number: "Número de Factura", quote_number: "Número de Cotización",
    date: "Fecha", due_date: "Fecha de Vencimiento", valid_until: "Válido Hasta",
    bill_to: "FACTURAR A", quote_to: "COTIZAR A", from: "DE",
    description: "Descripción", quantity: "Cant.", rate: "Tarifa", amount: "Monto",
    subtotal: "Subtotal", tax: "Impuesto", discount: "Descuento", shipping: "Envío",
    grand_total: "Total General", total_due: "Total a Pagar",
    notes: "Notas", terms: "Términos y Condiciones",
    thank_you: "¡Gracias por su negocio!", thank_you_quote: "¡Gracias por considerar nuestros servicios!",
  },
  fr: {
    invoice: "FACTURE", quote: "DEVIS",
    invoice_number: "Numéro de Facture", quote_number: "Numéro de Devis",
    date: "Date", due_date: "Date d'Échéance", valid_until: "Valide Jusqu'au",
    bill_to: "FACTURER À", quote_to: "DEVIS POUR", from: "DE",
    description: "Description", quantity: "Qté", rate: "Taux", amount: "Montant",
    subtotal: "Sous-total", tax: "Taxe", discount: "Remise", shipping: "Expédition",
    grand_total: "Total Général", total_due: "Total Dû",
    notes: "Notes", terms: "Conditions Générales",
    thank_you: "Merci pour votre affaire!", thank_you_quote: "Merci de considérer nos services!",
  },
  de: {
    invoice: "RECHNUNG", quote: "ANGEBOT",
    invoice_number: "Rechnungsnummer", quote_number: "Angebotsnummer",
    date: "Datum", due_date: "Fälligkeitsdatum", valid_until: "Gültig Bis",
    bill_to: "RECHNUNG AN", quote_to: "ANGEBOT FÜR", from: "VON",
    description: "Beschreibung", quantity: "Mge.", rate: "Satz", amount: "Betrag",
    subtotal: "Zwischensumme", tax: "Steuer", discount: "Rabatt", shipping: "Versand",
    grand_total: "Gesamtsumme", total_due: "Fälliger Betrag",
    notes: "Notizen", terms: "Geschäftsbedingungen",
    thank_you: "Vielen Dank für Ihr Geschäft!", thank_you_quote: "Vielen Dank für Ihre Anfrage!",
  },
  it: {
    invoice: "FATTURA", quote: "PREVENTIVO",
    invoice_number: "Numero Fattura", quote_number: "Numero Preventivo",
    date: "Data", due_date: "Data Scadenza", valid_until: "Valido Fino Al",
    bill_to: "FATTURA A", quote_to: "PREVENTIVO PER", from: "DA",
    description: "Descrizione", quantity: "Qtà", rate: "Tariffa", amount: "Importo",
    subtotal: "Subtotale", tax: "Imposta", discount: "Sconto", shipping: "Spedizione",
    grand_total: "Totale Generale", total_due: "Totale Dovuto",
    notes: "Note", terms: "Termini e Condizioni",
    thank_you: "Grazie per il vostro business!", thank_you_quote: "Grazie per aver considerato i nostri servizi!",
  },
  pt: {
    invoice: "FATURA", quote: "ORÇAMENTO",
    invoice_number: "Número da Fatura", quote_number: "Número do Orçamento",
    date: "Data", due_date: "Data de Vencimento", valid_until: "Válido Até",
    bill_to: "FATURAR PARA", quote_to: "ORÇAMENTO PARA", from: "DE",
    description: "Descrição", quantity: "Qtde.", rate: "Taxa", amount: "Valor",
    subtotal: "Subtotal", tax: "Imposto", discount: "Desconto", shipping: "Envio",
    grand_total: "Total Geral", total_due: "Total a Pagar",
    notes: "Notas", terms: "Termos e Condições",
    thank_you: "Obrigado pelo seu negócio!", thank_you_quote: "Obrigado por considerar nossos serviços!",
  },
  ja: {
    invoice: "請求書", quote: "見積書",
    invoice_number: "請求書番号", quote_number: "見積書番号",
    date: "日付", due_date: "支払期限", valid_until: "有効期限",
    bill_to: "請求先", quote_to: "見積先", from: "発行元",
    description: "説明", quantity: "数量", rate: "料金", amount: "金額",
    subtotal: "小計", tax: "税金", discount: "割引", shipping: "配送",
    grand_total: "総計", total_due: "お支払い合計",
    notes: "備考", terms: "利用規約",
    thank_you: "ご利用ありがとうございます！", thank_you_quote: "ご検討ありがとうございます！",
  },
  zh: {
    invoice: "发票", quote: "报价单",
    invoice_number: "发票号码", quote_number: "报价单号码",
    date: "日期", due_date: "到期日期", valid_until: "有效期至",
    bill_to: "账单地址", quote_to: "报价对象", from: "发件人",
    description: "描述", quantity: "数量", rate: "费率", amount: "金额",
    subtotal: "小计", tax: "税费", discount: "折扣", shipping: "运费",
    grand_total: "总金额", total_due: "应付总额",
    notes: "备注", terms: "条款和条件",
    thank_you: "感谢您的业务！", thank_you_quote: "感谢您考虑我们的服务！",
  },
  ru: {
    invoice: "СЧЁТ", quote: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ",
    invoice_number: "Номер Счёта", quote_number: "Номер Предложения",
    date: "Дата", due_date: "Срок Оплаты", valid_until: "Действителен До",
    bill_to: "СЧЁТ НА", quote_to: "ПРЕДЛОЖЕНИЕ ДЛЯ", from: "ОТ",
    description: "Описание", quantity: "Кол.", rate: "Ставка", amount: "Сумма",
    subtotal: "Промежуточный Итог", tax: "Налог", discount: "Скидка", shipping: "Доставка",
    grand_total: "Общая Сумма", total_due: "К Оплате",
    notes: "Примечания", terms: "Условия",
    thank_you: "Спасибо за ваш бизнес!", thank_you_quote: "Спасибо за рассмотрение!",
  },
  ar: {
    invoice: "فاتورة", quote: "عرض سعر",
    invoice_number: "رقم الفاتورة", quote_number: "رقم عرض السعر",
    date: "التاريخ", due_date: "تاريخ الاستحقاق", valid_until: "صالح حتى",
    bill_to: "فاتورة إلى", quote_to: "عرض سعر إلى", from: "من",
    description: "الوصف", quantity: "الكمية", rate: "المعدل", amount: "المبلغ",
    subtotal: "المجموع الفرعي", tax: "الضريبة", discount: "الخصم", shipping: "الشحن",
    grand_total: "المجموع الكلي", total_due: "المبلغ المستحق",
    notes: "ملاحظات", terms: "الشروط والأحكام",
    thank_you: "شكراً لعملكم!", thank_you_quote: "شكراً لاهتمامكم!",
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
