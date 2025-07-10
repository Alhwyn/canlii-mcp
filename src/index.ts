import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { 
	CaseDatabase, 
	CaseDatabasesResponse, 
	CaseDatabaseSchema, 
	CaseDatabasesResponseSchema,
	sampleCaseDatabases 
} from "./schema.js";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "CanLII Database Tool",
		version: "1.0.0",
	});

	async init() {
		// Case databases tool
		this.server.tool(
			"get_case_databases",
			{
				jurisdiction: z.string().optional().describe("Filter by jurisdiction (e.g., 'on', 'nl', 'nb')"),
			},
			async ({ jurisdiction }) => {
				// Filter databases by jurisdiction if provided
				let databases = sampleCaseDatabases.caseDatabases;
				
				if (jurisdiction) {
					databases = databases.filter(db => db.jurisdiction === jurisdiction);
				}

				const response: CaseDatabasesResponse = { caseDatabases: databases };
				
				// Validate response using Zod schema
				const validatedResponse = CaseDatabasesResponseSchema.parse(response);
				
				return {
					content: [{
						type: "text",
						text: JSON.stringify(validatedResponse, null, 2)
					}]
				};
			}
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
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
