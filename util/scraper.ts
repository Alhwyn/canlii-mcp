import { load } from "cheerio"

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const validateRequest = (data: any) => {
  const errors = []
  
  // Check if data exists and is an object
  if (!data || typeof data !== "object") {
    errors.push("Invalid request data")
    return { errors }
  }
  
  if (
    typeof data.url !== "string" ||
    !data.url.startsWith("http") ||
    data.url.length < 1
  ) {
    errors.push("Invalid URL")
  }
  if (data.excludeTags !== undefined && (typeof data.excludeTags !== "string" || data.excludeTags.length > 256)) {
    errors.push("Invalid excludeTags")
  }
  if (data.includeTags !== undefined && (typeof data.includeTags !== "string" || data.includeTags.length > 256)) {
    errors.push("Invalid includeTags")
  }

  if (errors.length > 0) {
    return { errors }
  }

  return {
    url: data.url,
    excludeTags: data.excludeTags ? trimTags(data.excludeTags) : undefined,
    includeTags: data.includeTags ? trimTags(data.includeTags) : undefined,
  }
}

export function trimTags(tags: string | undefined) {
  if (!tags) return undefined
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "")
    .join(",")
}

export async function fetchWithRedirects(
  url: string,
  options: RequestInit = {},
  maxRedirects = 10
): Promise<Response> {
  let response = await fetch(url, options)
  let redirects = 0

  while (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers.has("location") &&
    redirects < maxRedirects
  ) {
    const location = response.headers.get("location")
    if (!location) break
    response = await fetch(location, options)
    redirects++
  }

  return response
}

export async function scrapeTextFromUrl(data: any) {
  console.log(data)
  const validation = validateRequest(data)
  if (validation.errors) {
    throw new Error(`Invalid request: ${validation.errors.join(", ")}`)
  }
  
  const { excludeTags, includeTags } = validation
  let response: Response | undefined
  
  try {
    response = await fetchWithRedirects(data.url)
  } catch (error) {
    throw new Error("Failed to fetch")
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }

  const html = await response.text()
  const $ = load(html)
  
  if (excludeTags) {
    $(excludeTags).remove()
  }

  let rawText = ""
  if (includeTags) {
    rawText = $(includeTags).text()
  }
  if (!rawText) rawText = $("body").text()

  const text = rawText.trim().replace(/\s\s+/g, " ").replace(/\n/g, " ")

  return { text }
} 