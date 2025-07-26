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

// Default headers to mimic a real browser
const getDefaultHeaders = (userAgent?: string) => ({
  "User-Agent": userAgent || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-User": "?1",
  "Cache-Control": "max-age=0",
  "Referer": "https://canlii.org/"
})

// Session management for CanLII
let sessionCookies: string[] = []

async function establishSession(): Promise<void> {
  try {
    console.log("Establishing session with CanLII...")
    const response = await fetch("https://canlii.org/", {
      headers: getDefaultHeaders(),
      redirect: "follow"
    })
    
    if (response.ok) {
      const setCookie = response.headers.get("set-cookie")
      if (setCookie) {
        sessionCookies = [setCookie]
        console.log("Session established successfully")
      }
    }
  } catch (error) {
    console.warn("Failed to establish session:", error)
  }
}

export async function fetchWithRedirects(
  url: string,
  options: RequestInit = {},
  maxRedirects = 10,
  userAgent?: string
): Promise<Response> {
  // Add default headers if not provided
  const headers: Record<string, string> = {
    ...getDefaultHeaders(userAgent),
    ...options.headers
  }
  
  // Add session cookies if available
  if (sessionCookies.length > 0) {
    headers["Cookie"] = sessionCookies.join("; ")
  }
  
  const fetchOptions = {
    ...options,
    headers
  }

  let response = await fetch(url, fetchOptions)
  let redirects = 0

  while (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers.has("location") &&
    redirects < maxRedirects
  ) {
    const location = response.headers.get("location")
    if (!location) break
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
    
    response = await fetch(location, fetchOptions)
    redirects++
  }

  return response
}

export async function scrapeTextFromUrl(data: any) {
  console.log("Scraping URL:", data.url)
  const validation = validateRequest(data)
  if (validation.errors) {
    throw new Error(`Invalid request: ${validation.errors.join(", ")}`)
  }
  
  // Check if this is a CanLII URL and establish session if needed
  if (data.url.includes("canlii.org") && sessionCookies.length === 0) {
    await establishSession()
  }
  
  const { excludeTags, includeTags } = validation
  let response: Response | undefined
  let lastError: Error | undefined
  
  // Retry mechanism
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for URL: ${data.url}`)
      
      // Add a small delay before making the request (longer delay for retries)
      const delay = attempt === 1 ? 200 : 1000 * attempt
      await new Promise(resolve => setTimeout(resolve, delay))
      
      response = await fetchWithRedirects(data.url, {}, data.maxRedirects || 10, data.userAgent)
      
      if (response.ok) {
        break // Success, exit retry loop
      }
      
      // Handle specific error cases
      if (response.status === 403) {
        lastError = new Error(`Access denied (403): CanLII may be blocking automated requests. Try again later or contact support.`)
        if (attempt === maxRetries) throw lastError
        continue
      } else if (response.status === 429) {
        lastError = new Error(`Rate limited (429): Too many requests. Please wait before trying again.`)
        if (attempt === maxRetries) throw lastError
        // Wait longer for rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
        continue
      } else if (response.status === 404) {
        lastError = new Error(`Not found (404): The requested URL does not exist.`)
        throw lastError // Don't retry 404s
      } else {
        lastError = new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
        if (attempt === maxRetries) throw lastError
        continue
      }
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  if (!response || !response.ok) {
    throw lastError || new Error("Failed to fetch after all retries")
  }

  const html = await response.text()
  
  // Check if we got a valid HTML response
  if (!html.includes('<html') && !html.includes('<body')) {
    console.warn("Response doesn't appear to be HTML:", html.substring(0, 200))
  }
  
  const $ = load(html)
  
  // Remove script and style tags by default
  $("script, style, nav, header, footer, aside").remove()
  
  if (excludeTags) {
    $(excludeTags).remove()
  }

  let rawText = ""
  if (includeTags) {
    rawText = $(includeTags).text()
  }
  if (!rawText) {
    // Try to get main content area first
    rawText = $("main, article, .content, #content, .main").text()
    if (!rawText) {
      rawText = $("body").text()
    }
  }

  const text = rawText.trim().replace(/\s\s+/g, " ").replace(/\n/g, " ")
  
  if (!text) {
    throw new Error("No text content found on the page")
  }

  return { text }
} 