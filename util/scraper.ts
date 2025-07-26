import { load } from "cheerio"

interface ScrapingOptions {
  excludeTags?: string
  includeTags?: string
  maxRedirects?: number
  userAgent?: string
}

interface ScrapingResult {
  text: string
  error?: undefined
}

interface ScrapingError {
  error: string
  text?: undefined
}

/**
 * Scrapes text content from a URL by bypassing robots.txt restrictions.
 * 
 * This function makes direct HTTP requests without checking robots.txt,
 * allowing you to extract content from websites that block AI crawlers.
 * 
 * @param url - The URL to scrape
 * @param options - Configuration options for scraping
 * @returns Promise resolving to scraped text or error
 */
export async function scrapeTextFromUrl(
  url: string,
  options: ScrapingOptions = {}
): Promise<ScrapingResult | ScrapingError> {
  const {
    excludeTags = "script,style,nav,header,footer,aside",
    includeTags = "",
    maxRedirects = 10,
    userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  } = options

  // Validate URL
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return { error: "Invalid URL provided" }
  }

  try {
    // Fetch with custom user agent and redirect handling
    const response = await fetchWithRedirects(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      }
    }, maxRedirects)

    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const html = await response.text()
    const $ = load(html)

    // Remove excluded tags
    if (excludeTags) {
      $(excludeTags).remove()
    }

    // Extract text from included tags or body
    let rawText = ""
    if (includeTags) {
      rawText = $(includeTags).text()
    }
    if (!rawText) {
      rawText = $("body").text()
    }

    // Clean up the text
    const text = rawText
      .trim()
      .replace(/\s\s+/g, " ")        // Replace multiple spaces with single space
      .replace(/\n/g, " ")           // Replace newlines with spaces
      .replace(/\t/g, " ")           // Replace tabs with spaces

    if (!text) {
      return { error: "No text content found on the page" }
    }

    return { text }

  } catch (error) {
    return { error: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * Helper function to handle redirects manually (bypasses robots.txt checks)
 */
async function fetchWithRedirects(
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
    
    // Handle relative URLs
    const redirectUrl = location!.startsWith("http") 
      ? location! 
      : new URL(location!, url).toString()
    
    response = await fetch(redirectUrl, options)
    redirects++
  }

  if (redirects >= maxRedirects) {
    throw new Error("Too many redirects")
  }

  return response
}

/**
 * Utility function to validate and clean tag selectors
 */
export function cleanTagSelectors(tags: string): string {
  if (!tags || typeof tags !== "string") return ""
  
  return tags
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag !== "")
    .join(",")
}

/**
 * Quick scrape function with minimal options
 */
export async function quickScrape(url: string): Promise<string> {
  const result = await scrapeTextFromUrl(url)
  if (result.error) {
    throw new Error(result.error)
  }
  return result.text!
} 