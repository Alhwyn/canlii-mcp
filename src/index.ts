import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CaseDatabase, CaseDatabasesResponse, CaseDatabaseSchema, CaseDatabasesResponseSchema } from "./schema.js";


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


		// first canlii tool search the data base
		this.server.tool(
			"get_canlii_databases",
			{
				language: z.string().describe("The language option only supports 'en' or 'fr'"),
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
		)

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
