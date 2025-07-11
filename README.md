# CanLII MCP Server

A Model Context Protocol (MCP) server that provides access to the CanLII (Canadian Legal Information Institute) API. This server allows AI assistants to search and retrieve Canadian legal information including court decisions, legislation, and legal citations.

## Prerequisites

- A CanLII API key (obtain from [CanLII API](https://api.canlii.org/))
- Node.js and npm
- Cloudflare Workers account (for deployment)

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd canlii-mcp
npm install
```

### 2. Configure Environment Variables

Create a `.env` file or configure your Cloudflare Workers environment with:

```bash
CANLII_API=your_canlii_api_key_here
```

For Cloudflare Workers deployment, set the environment variable using:

```bash
wrangler secret put CANLII_API
```

### 3. Local Development

```bash
npm run dev
```

This will start the server locally at `http://localhost:8787`

### 4. Deploy to Cloudflare Workers

```bash
npm run deploy
```

## Available Tools

### 1. get_courts_and_tribunals

Retrieves a list of available courts and tribunals databases.

**Parameters:**

- `language` (required): "en" or "fr"
- Optional date filters: `publishedBefore`, `publishedAfter`, `modifiedBefore`, `modifiedAfter`, `changedBefore`, `changedAfter`, `decisionDateBefore`, `decisionDateAfter`

### 2. get_legislation_databases

Gets available legislation databases (statutes, regulations, etc.).

**Parameters:**

- `language` (required): "en" or "fr"
- Optional date filters (same as above)

### 3. browse_legislation

Browse legislation within a specific database.

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database code (e.g., "cas" for Canada Statutes, "car" for Canada Regulations)
- Optional date filters

### 4. get_legislation_regulation_metadata

Get detailed metadata for a specific piece of legislation.

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database identifier
- `legislationId` (required): Specific legislation ID

### 5. get_case_law_decisions

Retrieve case law decisions from a specific database.

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database identifier
- `offset` (required): Starting record number
- `resultCount` (required): Number of results (max 10,000)
- Optional date filters

### 6. get_case_metadata

Get detailed metadata for a specific court case.

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database identifier
- `caseId` (required): Case identifier
- Optional date filters

### 7. get_case_citator

Get citation information for cases (what cases cite this case, what this case cites, etc.).

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database identifier
- `caseId` (required): Case identifier
- `metadataType` (required): "citedCases", "citingCases", or "citedLegislations"
- Optional date filters

## Connecting to Claude Desktop

1. Install the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote):

   ```bash
   npm install -g mcp-remote
   ```

2. In Claude Desktop, go to Settings > Developer > Edit Config and add:

```json
{
  "mcpServers": {
    "canlii": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/sse"]
    }
  }
}
```

For deployed servers, replace the URL with your Cloudflare Workers URL:

```
https://your-worker-name.your-account.workers.dev/sse
```

3. Restart Claude Desktop

## Connecting to Cloudflare AI Playground

1. Go to https://playground.ai.cloudflare.com/
2. Enter your MCP server URL: `https://your-worker-name.your-account.workers.dev/sse`
3. The CanLII tools will be available in the playground

## Usage Examples

### Finding Court Decisions

```typescript
// Get available courts and tribunals
await get_courts_and_tribunals({
  language: "en",
});

// Browse recent decisions from Supreme Court of Canada
await get_case_law_decisions({
  language: "en",
  databaseId: "scc-csc",
  offset: 0,
  resultCount: 10,
});
```

### Searching Legislation

```typescript
// Get legislation databases
await get_legislation_databases({
  language: "en",
});

// Browse federal statutes
await browse_legislation({
  language: "en",
  databaseId: "cas",
});

// Get specific act metadata
await get_legislation_regulation_metadata({
  language: "en",
  databaseId: "cas",
  legislationId: "criminal-code",
});
```

### Case Citations

```typescript
// Get case metadata
await get_case_metadata({
  language: "en",
  databaseId: "scc-csc",
  caseId: "2023scc1",
});

// Find cases that cite this case
await get_case_citator({
  language: "en",
  databaseId: "scc-csc",
  caseId: "2023scc1",
  metadataType: "citingCases",
});
```

## Development

### Scripts

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run format` - Format code with Biome
- `npm run lint:fix` - Fix linting issues
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── index.ts          # Main MCP server implementation
├── schema.ts         # Zod schemas for API responses
└── worker-configuration.d.ts  # TypeScript declarations
```

## API Rate Limits

Be aware of CanLII API rate limits and usage terms. The API is intended for research and educational purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
