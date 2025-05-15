import { CosmosClient, type Container } from "@azure/cosmos"

let cosmosClient: CosmosClient | null = null

const DATABASE_NAME = process.env.COSMOS_DATABASE || "mio-cosmos-db"

export function isCosmosEnabled(): boolean {
	return !!(process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY)
}

function getCosmosClient(): CosmosClient {
	if (!cosmosClient) {
		if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
			throw new Error("Cosmos DB credentials not configured")
		}
		cosmosClient = new CosmosClient({
			endpoint: process.env.COSMOS_ENDPOINT,
			key: process.env.COSMOS_KEY,
		})
	}
	return cosmosClient
}

const containerNameMap: Record<string, string> = {
	"customer-orders": "customer-orders",
	"customer-service-complaints": "customer-service-complaint",
	"customer-orders-quotation": "customer-orders-quotations",
	"customer-delivery": "customer-delivery",
	"customer-orders-receipts": "customer-orders-receipts",
	"magic-link-links": "magic-link-links",
	"pay-payments": "pay-payments",
	"customer-client-complaints": "customer-client-complaints",
	"payments": "payments",
}

const partitionKeyMap: Record<string, string> = {
	"customer-orders": "orderId",
	"customer-orders-quotation": "contactId",
	"customer-orders-receipts": "receiptId",
	"customer-delivery": "contactId",
}

export function getPartitionKey(source: string, doc: Record<string, unknown>): string {
	const field = partitionKeyMap[source]
	if (field) return String(doc[field])
	return String(doc.id)
}

export function getContainer(source: string): Container {
	const containerName = containerNameMap[source] ?? source
	return getCosmosClient().database(DATABASE_NAME).container(containerName)
}

export const CONTAINER_NAMES = [
	"customer-orders",
	"customer-service-complaints",
	"customer-orders-quotation",
	"customer-delivery",
	"customer-orders-receipts",
	"magic-link-links",
	"pay-payments",
	"customer-client-complaints",
	"payments",
] as const

const searchFieldPaths: Record<string, Record<string, string[]>> = {
	"customer-orders": {
		name: ["c.customer.firstName", "c.customer.lastName"],
		email: ["c.customer.email"],
		phone: ["c.customer.phone"],
	},
	"customer-service-complaints": {
		name: ["c.Customer.Name"],
		email: ["c.Customer.Email"],
		phone: ["c.Customer.Phone"],
		address: ["c.Customer.Address"],
	},
	"customer-orders-quotation": {
		name: ["c.customer.firstName", "c.customer.lastName"],
		email: ["c.customer.email"],
		phone: ["c.customer.phone"],
		address: ["c.customer.address.street"],
	},
	"customer-delivery": {
		name: ["c.CustomerName"],
		phone: ["c.MobilePhone", "c.HomePhone"],
		address: ["c.CustomerAddress1"],
	},
	"customer-orders-receipts": {
		memberId: ["c.customer.memberNumber"],
	},
	"magic-link-links": {},
	"pay-payments": {
		email: ["c.customer.email"],
		phone: ["c.customer.phone"],
		personalIdentityNumber: ["c.customer.personalIdentityNumber"],
	},
	"customer-client-complaints": {
		name: ["c.Customer.Name"],
		email: ["c.Customer.Email"],
		phone: ["c.Customer.Phone"],
		address: ["c.Customer.Address"],
	},
	"payments": {
		email: ["c.customer.email"],
		phone: ["c.customer.phone"],
		personalIdentityNumber: ["c.customer.personalIdentityNumber"],
	},
}

export function buildCosmosQuery(
	container: string,
	searchType: string,
	searchValue: string,
): { query: string; parameters: { name: string; value: string }[] } | null {
	const paths = searchFieldPaths[container]?.[searchType]
	if (!paths || paths.length === 0) return null

	if (searchType === "name" && paths.length > 1) {
		const words = searchValue.trim().split(/\s+/)
		const conditions = words.map(
			(_, i) =>
				`(CONTAINS(LOWER(${paths[0]}), LOWER(@word${i})) OR CONTAINS(LOWER(${paths[1]}), LOWER(@word${i})))`,
		)
		return {
			query: `SELECT * FROM c WHERE ${conditions.join(" AND ")}`,
			parameters: words.map((w, i) => ({ name: `@word${i}`, value: w })),
		}
	}

	if (searchType === "name") {
		const words = searchValue.trim().split(/\s+/)
		const conditions = words.map(
			(_, i) => `CONTAINS(LOWER(${paths[0]}), LOWER(@word${i}))`,
		)
		return {
			query: `SELECT * FROM c WHERE ${conditions.join(" AND ")}`,
			parameters: words.map((w, i) => ({ name: `@word${i}`, value: w })),
		}
	}

	if (searchType === "phone") {
		const conditions = paths.map(
			(p) => `REPLACE(REPLACE(${p}, " ", ""), "-", "") = @phone`,
		)
		return {
			query: `SELECT * FROM c WHERE ${conditions.join(" OR ")}`,
			parameters: [
				{ name: "@phone", value: searchValue.replace(/[\s-]/g, "") },
			],
		}
	}

	if (searchType === "personalIdentityNumber") {
		const digits = searchValue.replace(/\D/g, "")
		const normalized = digits.length === 12 ? digits.slice(2) : digits
		const conditions = paths.map(
			(p) => `REPLACE(${p}, "-", "") = @pid OR SUBSTRING(REPLACE(${p}, "-", ""), 2, 10) = @pid`,
		)
		return {
			query: `SELECT * FROM c WHERE ${conditions.join(" OR ")}`,
			parameters: [{ name: "@pid", value: normalized }],
		}
	}

	const conditions = paths.map((p) => `LOWER(${p}) = LOWER(@value)`)
	return {
		query: `SELECT * FROM c WHERE ${conditions.join(" OR ")}`,
		parameters: [{ name: "@value", value: searchValue }],
	}
}
