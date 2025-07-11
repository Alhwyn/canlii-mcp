import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CaseDatabasesResponseSchema, CasesResponseSchema, CaseMetadataSchema, CitedCasesResponseSchema } from "./schema.js";


// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "CanLii MCP",
		version: "1.0.0",
	});

	private apiKey: string;

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.apiKey = env.CANLII_API;
	}

	async init() {

		this.server.tool(
			"get_canlii_databases",
			{
				language: z.enum(["en", "fr"]).describe("The language option: 'en' for English or 'fr' for French"),
			},
			async ({ language }) => {
				try {
					const response = await fetch(`https://api.canlii.org/v1/caseBrowse/${language}/?api_key=${this.apiKey}`);

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: Failed to fetch databases (${response.status})`,
								},
							],
						};
					}

					const data = await response.json();
					const parsed = CaseDatabasesResponseSchema.parse(data);

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(parsed, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"get_case_citator",
			{
				language: z.enum(["en", "fr"]).describe("The language option: 'en' for English or 'fr' for French"),
				databaseId: z.string().describe("The database identifier from which to fetch decisions"),
				caseId: z.string().describe("The case's unique identifier, as returned by the previous type of call. Generally corresponds to the CanLII citation."),
				metadataType: z.enum(["citedCases", "citingCases", "citedLegislations"]).describe("The type of citation metadata to fetch: citedCases (what this case cites), citingCases (what cases cite this case), or citedLegislations (what legislation this case cites)"),
			},
			async ({ language, databaseId, caseId, metadataType }) => {
				try {
					const response = await fetch(`https://api.canlii.org/v1/caseCitator/${language}/${databaseId}/${caseId}/${metadataType}?api_key=${this.apiKey}`);

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: Failed to fetch case citator data (${response.status})`,
								},
							],
						};
					}

					const data = await response.json();
					const parsed = CitedCasesResponseSchema.parse(data);

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(parsed, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"get_case_metadata",
			{
				language: z.enum(["en", "fr"]).describe("The language option: 'en' for English or 'fr' for French"),
				databaseId: z.string().describe("The database identifier from which to fetch decisions"),
				caseId: z.string().describe("The case's unique identifier, as returned by the previous type of call. Generally corresponds to the CanLII citation."),
			},
			async ({ language, databaseId, caseId }) => {
				try {
					const response = await fetch(`https://api.canlii.org/v1/caseBrowse/${language}/${databaseId}/${caseId}/?api_key=${this.apiKey}`);

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: Failed to fetch case metadata (${response.status})`,
								},
							],
						};
					};

					const data = await response.json();
					const parsed = CaseMetadataSchema.parse(data);

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(parsed, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
							},
						],
					};
				}
			}
		)

		this.server.tool(
			"get_case_law_decisions",
			{
				language: z.enum(["en", "fr"]).describe("The language option: 'en' for English or 'fr' for French"),
				databaseId: z.string().describe("The database identifier from which to fetch decisions"),
				offset: z.number().describe("The record number from which to start returning results. Using 0 will return the records most recently added to that database"),
				resultCount: z.number().max(10000).describe("The length of the list of results that will be returned. Max 10,000"),
				// Optional date parameters
				publishedBefore: z.string().optional().describe("The date when the decision was first published on CanLII (YYYY-MM-DD format)"),
				publishedAfter: z.string().optional().describe("The date when the decision was first published on CanLII (YYYY-MM-DD format)"),
				modifiedBefore: z.string().optional().describe("The date when the content of the decision was last modified on CanLII (YYYY-MM-DD format)"),
				modifiedAfter: z.string().optional().describe("The date when the content of the decision was last modified on CanLII (YYYY-MM-DD format)"),
				changedBefore: z.string().optional().describe("The date the metadata of the decision or its content was last modified on CanLII (YYYY-MM-DD format)"),
				changedAfter: z.string().optional().describe("The date the metadata of the decision or its content was last modified on CanLII (YYYY-MM-DD format)"),
				decisionDateBefore: z.string().optional().describe("The date of the decision (YYYY-MM-DD format)"),
				decisionDateAfter: z.string().optional().describe("The date of the decision (YYYY-MM-DD format)"),
			},
			async ({ language, databaseId, offset, resultCount, publishedBefore, publishedAfter, modifiedBefore, modifiedAfter, changedBefore, changedAfter, decisionDateBefore, decisionDateAfter }) => {
				try {
					// Build the query parameters
					const params = new URLSearchParams({
						api_key: this.apiKey,
						offset: offset.toString(),
						resultCount: resultCount.toString(),
					});

					// Add optional date parameters if provided
					if (publishedBefore) params.append('publishedBefore', publishedBefore);
					if (publishedAfter) params.append('publishedAfter', publishedAfter);
					if (modifiedBefore) params.append('modifiedBefore', modifiedBefore);
					if (modifiedAfter) params.append('modifiedAfter', modifiedAfter);
					if (changedBefore) params.append('changedBefore', changedBefore);
					if (changedAfter) params.append('changedAfter', changedAfter);
					if (decisionDateBefore) params.append('decisionDateBefore', decisionDateBefore);
					if (decisionDateAfter) params.append('decisionDateAfter', decisionDateAfter);

					const response = await fetch(`https://api.canlii.org/v1/caseBrowse/${language}/${databaseId}/?${params.toString()}`);

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: Failed to fetch case law decisions (${response.status})`,
								},
							],
						};
					}

					const data = await response.json();
					const parsed = CasesResponseSchema.parse(data);

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(parsed, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
							},
						],
					};
				}
			}
		);

	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
