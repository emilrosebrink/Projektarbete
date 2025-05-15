import customerOrders from "@/lib/mockdata/customer-orders.json";
import customerService from "@/lib/mockdata/customer-service-complaints.json";
import customerQuotation from "@/lib/mockdata/customer-orders-quotation.json";
import customerDelivery from "@/lib/mockdata/customer-delivery.json";
import customerReceipts from "@/lib/mockdata/customer-orders-receipts.json";
import magicLink from "@/lib/mockdata/magic-link-links.json";
import payments from "@/lib/mockdata/pay-payments.json";

export const mockResults = [
  { source: "customer-orders", data: customerOrders },
  { source: "customer-service-complaints", data: customerService },
  { source: "customer-orders-quotation", data: customerQuotation },
  { source: "customer-delivery", data: customerDelivery },
  { source: "customer-orders-receipts", data: customerReceipts },
  { source: "magic-link-links", data: magicLink },
  { source: "pay-payments", data: payments },
];
