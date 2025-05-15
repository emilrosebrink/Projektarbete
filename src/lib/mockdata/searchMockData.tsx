import customerOrders from "@/lib/mockdata/customer-orders.json";
import customerService from "@/lib/mockdata/customer-service-complaints.json";
import customerQuotation from "@/lib/mockdata/customer-orders-quotation.json";
import customerDelivery from "@/lib/mockdata/customer-delivery.json";
import customerReceipts from "@/lib/mockdata/customer-orders-receipts.json";
import magicLink from "@/lib/mockdata/magic-link-links.json";
import payments from "@/lib/mockdata/pay-payments.json";

// Hjälpfunktion för att slå ihop för- och efternamn.
// Används där data lagras uppdelat men ska behandlas som ett namn.
const fullName = (first?: string, last?: string) =>
  [first, last].filter(Boolean).join(" ");

// Parsar payload från Magic Link som kommer som JSON-sträng.
// Returnerar undefined om payload saknas eller är ogiltig JSON.
function parsePayload(payload?: string) {
  if (!payload) return undefined;

  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

// Hjälpfunktion för att bygga en lista av alla personuppgiftsfält som finns i en källa.
// Används för att visa ALL lagrad data om en person, inte bara det matchade fältet.
export function getAllPersonalData(
  source: string,
): { type: string; value: string }[] {
  const fields: { type: string; value: string }[] = [];

  const add = (type: string, value: string | string[] | undefined | null) => {
    if (!value) return;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v && String(v).trim()) fields.push({ type, value: String(v) });
    }
  };

  switch (source) {
    case "customer-orders":
      add(
        "name",
        fullName(
          customerOrders.customer.firstName,
          customerOrders.customer.lastName,
        ),
      );
      add("email", customerOrders.customer.email);
      add("phone", customerOrders.customer.phone);
      break;

    case "customer-service-complaints":
      add("name", customerService.Customer.Name);
      add("email", customerService.Customer.Email);
      add("phone", customerService.Customer.Phone);
      add("address", customerService.Customer.Address);
      break;

    case "customer-orders-quotation":
      add(
        "name",
        fullName(
          customerQuotation.customer.firstName,
          customerQuotation.customer.lastName,
        ),
      );
      add("email", customerQuotation.customer.email);
      add("phone", customerQuotation.customer.phone);
      add("address", customerQuotation.customer.address);
      break;

    case "customer-delivery":
      add("name", customerDelivery.CustomerName);
      add("phone", customerDelivery.MobilePhone);
      add("phone", customerDelivery.HomePhone);
      add("address", customerDelivery.CustomerAddress1);
      break;

    case "customer-orders-receipts":
      add("memberId", customerReceipts.customer.memberNumber);
      break;

    case "magic-link-links": {
      const parsed = parsePayload(magicLink.payload);
      if (parsed) {
        add("name", parsed.customerName);
        add("email", parsed.email);
        add("phone", parsed.mobilePhone);
        add("phone", parsed.homePhone);
        add("address", parsed.customerAddress1);
        add("orderNumber", parsed.orderNumber);
      }
      break;
    }

    case "pay-payments":
      add("email", payments.customer.email);
      add("phone", payments.customer.phone);
      add("personalIdentityNumber", payments.customer.personalIdentityNumber);
      break;

  }

  return fields;
}

// Returnerar ett jämförbart värde från respektive datakälla baserat på vald söktyp (phone, name, email, etc).
// Funktionen innehåller ingen UI-logik och kan senare bytas ut mot riktig backend-data utan att UI påverkas.
export function searchMockData(
  source: string,
  type: string,
): string | string[] | undefined {
  switch (source) {
    case "customer-orders":
      return {
        phone: customerOrders.customer.phone,
        email: customerOrders.customer.email,
        name: fullName(
          customerOrders.customer.firstName,
          customerOrders.customer.lastName,
        ),
      }[type];

    case "customer-service-complaints":
      return {
        phone: customerService.Customer.Phone,
        email: customerService.Customer.Email,
        name: customerService.Customer.Name,
        address: customerService.Customer.Address,
      }[type];

    case "customer-orders-quotation":
      return {
        phone: customerQuotation.customer.phone,
        email: customerQuotation.customer.email,
        name: fullName(
          customerQuotation.customer.firstName,
          customerQuotation.customer.lastName,
        ),
        address: customerQuotation.customer.address,
      }[type];

    case "customer-delivery":
      return {
        phone: [
          customerDelivery.MobilePhone,
          customerDelivery.HomePhone,
        ].filter(Boolean),
        name: customerDelivery.CustomerName,
        address: customerDelivery.CustomerAddress1,
      }[type];

    case "customer-orders-receipts":
      return {
        memberId: customerReceipts.customer.memberNumber,
      }[type];

    case "magic-link-links": {
      // Magic Link har payload som JSON-sträng och måste parsas

      const parsed = parsePayload(magicLink.payload);

      if (!parsed) return undefined;

      return {
        phone: [parsed.mobilePhone, parsed.homePhone],
        email: parsed.email,
        name: parsed.customerName,
        address: parsed.customerAddress1,
        orderNumber: parsed.orderNumber,
      }[type];
    }

    case "pay-payments":
      return {
        email: payments.customer.email,
        phone: payments.customer.phone,
        personalIdentityNumber: payments.customer.personalIdentityNumber,
      }[type];

    default:
      return undefined;
  }
}
