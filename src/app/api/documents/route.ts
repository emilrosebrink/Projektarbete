import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { isCosmosEnabled, getContainer, getPartitionKey } from "@/lib/cosmos-client"

const MOCKDATA_DIR = path.join(process.cwd(), "src", "lib", "mockdata")

const fieldTypeToKeys: Record<string, string[]> = {
	name: [
		"firstName",
		"lastName",
		"Name",
		"CustomerName",
		"customerName",
		"fullName",
	],
	email: ["email", "Email"],
	phone: [
		"phone",
		"Phone",
		"HomePhone",
		"MobilePhone",
		"mobilePhone",
		"homePhone",
	],
	address: [
		"Address",
		"CustomerAddress1",
		"CustomerAddress2",
		"CustomerAddress3",
		"ZipCode",
		"City",
		"address",
	],
	memberId: ["memberNumber", "memberId"],
	personalIdentityNumber: ["personalIdentityNumber"],
	orderNumber: ["orderId", "orderNumber", "OrderNumber"],
}

const PROTECTED_KEYS = new Set(["store"])

function maskKeys(obj: unknown, keysToMask: string[]): unknown {
	if (typeof obj !== "object" || obj === null) return obj
	if (Array.isArray(obj))
		return obj.map((item) => maskKeys(item, keysToMask))

	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(
		obj as Record<string, unknown>,
	)) {
		if (PROTECTED_KEYS.has(key)) {
			result[key] = value
		} else {
			result[key] = keysToMask.includes(key)
				? "XXXXX"
				: maskKeys(value, keysToMask)
		}
	}
	return result
}

async function readMockDoc(source: string): Promise<unknown> {
	const filePath = path.join(MOCKDATA_DIR, `${source}.json`)
	const content = await fs.readFile(filePath, "utf-8")
	return JSON.parse(content)
}

async function writeMockDoc(source: string, data: unknown): Promise<void> {
	const filePath = path.join(MOCKDATA_DIR, `${source}.json`)
	await fs.writeFile(filePath, JSON.stringify(data, null, 4), "utf-8")
}

export async function GET(req: NextRequest) {
	const source = req.nextUrl.searchParams.get("source")
	const documentId = req.nextUrl.searchParams.get("id")

	if (!source) {
		return NextResponse.json({ error: "source required" }, { status: 400 })
	}

	if (isCosmosEnabled()) {
		const container = getContainer(source)
		const { resources } = await container.items
			.query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: documentId }] })
			.fetchAll()
		return NextResponse.json({ data: resources[0] ?? null })
	}

	const doc = await readMockDoc(source)
	return NextResponse.json({ data: doc })
}

export async function PATCH(req: NextRequest) {
	const {
		source,
		documentId,
		fieldTypes,
		dryRun,
	}: {
		source: string
		documentId?: string
		fieldTypes: string[]
		dryRun?: boolean
	} = await req.json()

	const keysToMask = fieldTypes.flatMap((type) => fieldTypeToKeys[type] ?? [])

	if (isCosmosEnabled() && documentId) {
		const container = getContainer(source)
		const { resources } = await container.items
			.query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: documentId }] })
			.fetchAll()
		const doc = resources[0]
		if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 })
		const partitionKey = getPartitionKey(source, doc)
		const masked = maskKeys(doc, keysToMask)
		if (!dryRun) {
			await container.item(documentId, partitionKey).replace(masked as never)
		}
		return NextResponse.json({ success: true, dryRun: !!dryRun, masked })
	}

	const doc = await readMockDoc(source)
	const masked = maskKeys(doc, keysToMask)
	if (!dryRun) {
		await writeMockDoc(source, masked)
	}
	return NextResponse.json({ success: true, dryRun: !!dryRun, masked })
}
