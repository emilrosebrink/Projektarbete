import { NextRequest, NextResponse } from "next/server"
import {
	isCosmosEnabled,
	getContainer,
	CONTAINER_NAMES,
	buildCosmosQuery,
} from "@/lib/cosmos-client"
import {
	fuzzyHighlightName,
	fuzzyHighlightText,
	type HighlightToken,
} from "@/lib/fuzzy"
import customerOrdersDoc from "@/lib/mockdata/customer-orders.json"
import customerServiceDoc from "@/lib/mockdata/customer-service-complaints.json"
import customerQuotationDoc from "@/lib/mockdata/customer-orders-quotation.json"
import customerDeliveryDoc from "@/lib/mockdata/customer-delivery.json"
import customerReceiptsDoc from "@/lib/mockdata/customer-orders-receipts.json"
import magicLinkDoc from "@/lib/mockdata/magic-link-links.json"
import paymentsDoc from "@/lib/mockdata/pay-payments.json"
import customerClientComplaintsDoc from "@/lib/mockdata/customer-client-complaints.json"
import paymentsDbDoc from "@/lib/mockdata/payments.json"

type SearchField = { type: string; value: string }

type SearchResult = {
	source: string
	documentId: string
	matchedTypes: string[]
	allFields: { type: string; value: string }[]
}

type FuzzyResult = {
	source: string
	documentId: string
	matches: {
		type: string
		searchedFor: string
		actualValue: string
		tokens: HighlightToken[]
	}[]
	allFields: { type: string; value: string }[]
}

// biome-ignore lint/suspicious/noExplicitAny: dokumentstruktur varierar per källa
const mockDocuments: { source: string; doc: any }[] = [
	{ source: "customer-orders", doc: customerOrdersDoc },
	{ source: "customer-service-complaints", doc: customerServiceDoc },
	{ source: "customer-orders-quotation", doc: customerQuotationDoc },
	{ source: "customer-delivery", doc: customerDeliveryDoc },
	{ source: "customer-orders-receipts", doc: customerReceiptsDoc },
	{ source: "magic-link-links", doc: magicLinkDoc },
	{ source: "pay-payments", doc: paymentsDoc },
	{ source: "customer-client-complaints", doc: customerClientComplaintsDoc },
	{ source: "payments", doc: paymentsDbDoc },
]

const fullName = (first?: string, last?: string) =>
	[first, last].filter(Boolean).join(" ")

function parsePayload(payload?: string) {
	if (!payload) return undefined
	try {
		return JSON.parse(payload)
	} catch {
		return undefined
	}
}

// biome-ignore lint/suspicious/noExplicitAny: dokumentstruktur varierar per källa
function getSearchValue(source: string, type: string, doc: any): string | string[] | undefined {
	switch (source) {
		case "customer-orders":
			return {
				phone: doc.customer?.phone,
				email: doc.customer?.email,
				name: fullName(doc.customer?.firstName, doc.customer?.lastName),
			}[type]

		case "customer-service-complaints":
			return {
				phone: doc.Customer?.Phone,
				email: doc.Customer?.Email,
				name: doc.Customer?.Name,
				address: doc.Customer?.Address,
			}[type]

		case "customer-orders-quotation":
			return {
				phone: doc.customer?.phone,
				email: doc.customer?.email,
				name: fullName(doc.customer?.firstName, doc.customer?.lastName),
				address: doc.customer?.address?.street ?? doc.customer?.address,
			}[type]

		case "customer-delivery":
			return {
				phone: [doc.MobilePhone, doc.HomePhone].filter(Boolean),
				name: doc.CustomerName,
				address: doc.CustomerAddress1,
			}[type]

		case "customer-orders-receipts":
			return { memberId: doc.customer?.memberNumber }[type]

		case "magic-link-links": {
			const parsed = parsePayload(doc.payload)
			if (!parsed) return undefined
			return {
				phone: [parsed.mobilePhone, parsed.homePhone],
				email: parsed.email,
				name: parsed.customerName,
				address: parsed.customerAddress1,
				orderNumber: parsed.orderNumber,
			}[type]
		}

		case "pay-payments":
		case "payments":
			return {
				email: doc.customer?.email,
				phone: doc.customer?.phone,
				personalIdentityNumber: doc.customer?.personalIdentityNumber,
			}[type]

		case "customer-client-complaints":
			return {
				phone: doc.Customer?.Phone,
				email: doc.Customer?.Email,
				name: doc.Customer?.Name,
				address: doc.Customer?.Address,
			}[type]

		default:
			return undefined
	}
}

// biome-ignore lint/suspicious/noExplicitAny: dokumentstruktur varierar per källa
function extractPersonalData(source: string, doc: any): { type: string; value: string }[] {
	const fields: { type: string; value: string }[] = []
	const add = (type: string, value: string | string[] | undefined | null) => {
		if (!value) return
		const values = Array.isArray(value) ? value : [value]
		for (const v of values) {
			if (v && String(v).trim()) fields.push({ type, value: String(v) })
		}
	}

	switch (source) {
		case "customer-orders":
			add("name", fullName(doc.customer?.firstName, doc.customer?.lastName))
			add("email", doc.customer?.email)
			add("phone", doc.customer?.phone)
			break

		case "customer-service-complaints":
			add("name", doc.Customer?.Name)
			add("email", doc.Customer?.Email)
			add("phone", doc.Customer?.Phone)
			add("address", doc.Customer?.Address)
			break

		case "customer-orders-quotation":
			add("name", fullName(doc.customer?.firstName, doc.customer?.lastName))
			add("email", doc.customer?.email)
			add("phone", doc.customer?.phone)
			add("address", doc.customer?.address?.street ?? doc.customer?.address)
			break

		case "customer-delivery":
			add("name", doc.CustomerName)
			add("phone", doc.MobilePhone)
			add("phone", doc.HomePhone)
			add("address", doc.CustomerAddress1)
			break

		case "customer-orders-receipts":
			add("memberId", doc.customer?.memberNumber)
			break

		case "magic-link-links": {
			const parsed = parsePayload(doc.payload)
			if (parsed) {
				add("name", parsed.customerName)
				add("email", parsed.email)
				add("phone", parsed.mobilePhone)
				add("phone", parsed.homePhone)
				add("address", parsed.customerAddress1)
				add("orderNumber", parsed.orderNumber)
			}
			break
		}

		case "pay-payments":
		case "payments":
			add("email", doc.customer?.email)
			add("phone", doc.customer?.phone)
			add("personalIdentityNumber", doc.customer?.personalIdentityNumber)
			break

		case "customer-client-complaints":
			add("name", doc.Customer?.Name)
			add("email", doc.Customer?.Email)
			add("phone", doc.Customer?.Phone)
			add("address", doc.Customer?.Address)
			break
	}

	return fields
}

const normalizeName = (value?: string) => {
	if (!value) return undefined
	return value.toLowerCase().trim().split(/\s+/).sort().join(" ")
}

const normalize = (v?: string | number) =>
	v !== undefined ? String(v).toLowerCase().trim() : undefined

const normalizePhone = (v?: string | number) =>
	v !== undefined ? String(v).replace(/\s|-/g, "") : undefined

const normalizePersonalId = (v?: string | number) => {
	if (v === undefined) return undefined
	const digits = String(v).replace(/\D/g, "")
	if (digits.length === 12) return digits.slice(2)
	return digits
}

function normalizeByType(type: string, value?: string | number) {
	if (type === "phone") return normalizePhone(value)
	if (type === "name" && typeof value === "string") return normalizeName(value)
	if (type === "personalIdentityNumber") return normalizePersonalId(value)
	return normalize(value)
}

function searchMock(fields: SearchField[]): {
	results: SearchResult[]
	fuzzyResults: FuzzyResult[]
} {
	const results: SearchResult[] = []
	const exactSources = new Set<string>()

	for (const { source, doc } of mockDocuments) {
		if (doc._deleted) continue

		const matchedTypes: string[] = []
		for (const field of fields) {
			const valueInData = getSearchValue(source, field.type, doc)
			const hasMatch = Array.isArray(valueInData)
				? valueInData.some(
						(v) =>
							normalizeByType(field.type, v) ===
							normalizeByType(field.type, field.value),
					)
				: normalizeByType(field.type, valueInData) ===
					normalizeByType(field.type, field.value)

			if (hasMatch) matchedTypes.push(field.type)
		}

		if (matchedTypes.length > 0) {
			exactSources.add(source)
			results.push({
				source,
				documentId: doc.id ?? source,
				matchedTypes,
				allFields: extractPersonalData(source, doc),
			})
		}
	}

	const fuzzyResults: FuzzyResult[] = []
	for (const { source, doc } of mockDocuments) {
		if (doc._deleted || exactSources.has(source)) continue

		const matches: FuzzyResult["matches"] = []
		for (const field of fields) {
			const valueInData = getSearchValue(source, field.type, doc)
			const candidates = (
				Array.isArray(valueInData) ? valueInData : [valueInData]
			).filter((v): v is string => typeof v === "string")

			for (const candidate of candidates) {
				const fuzzyResult =
					field.type === "name"
						? fuzzyHighlightName(field.value, candidate)
						: field.type === "phone"
							? null
							: fuzzyHighlightText(field.value, candidate)

				if (fuzzyResult) {
					matches.push({
						type: field.type,
						searchedFor: field.value,
						actualValue: candidate,
						tokens: fuzzyResult.tokens,
					})
					break
				}
			}
		}

		if (matches.length > 0) {
			fuzzyResults.push({
				source,
				documentId: doc.id ?? source,
				matches,
				allFields: extractPersonalData(source, doc),
			})
		}
	}

	return { results, fuzzyResults }
}

async function searchCosmos(fields: SearchField[]): Promise<{
	results: SearchResult[]
	fuzzyResults: FuzzyResult[]
}> {
	const results: SearchResult[] = []

	for (const containerName of CONTAINER_NAMES) {
		const container = getContainer(containerName)
		const matchedDocs = new Map<
			string,
			// biome-ignore lint/suspicious/noExplicitAny: Cosmos-dokument
			{ doc: any; matchedTypes: string[] }
		>()

		for (const field of fields) {
			const query = buildCosmosQuery(containerName, field.type, field.value)
			if (!query) continue

			const { resources } = await container.items
				.query({
					query: query.query,
					parameters: query.parameters,
				})
				.fetchAll()

			for (const doc of resources) {
				const docId = doc.id
				const existing = matchedDocs.get(docId)
				if (existing) {
					if (!existing.matchedTypes.includes(field.type)) {
						existing.matchedTypes.push(field.type)
					}
				} else {
					matchedDocs.set(docId, { doc, matchedTypes: [field.type] })
				}
			}
		}

		for (const [docId, { doc, matchedTypes }] of matchedDocs) {
			results.push({
				source: containerName,
				documentId: docId,
				matchedTypes,
				allFields: extractPersonalData(containerName, doc),
			})
		}
	}

	return { results, fuzzyResults: [] }
}

export async function POST(req: NextRequest) {
	const { fields }: { fields: SearchField[] } = await req.json()

	const validFields = fields.filter((f) => f.type && f.value.trim())
	if (validFields.length === 0) {
		return NextResponse.json({ results: [], fuzzyResults: [] })
	}

	if (isCosmosEnabled()) {
		const data = await searchCosmos(validFields)
		return NextResponse.json(data)
	}

	const data = searchMock(validFields)
	return NextResponse.json(data)
}
