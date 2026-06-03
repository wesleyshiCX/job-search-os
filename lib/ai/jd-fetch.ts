// lib/ai/jd-fetch.ts

const MAX_JD_LENGTH = 4000;
const TIMEOUT_MS = 15_000;

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
};

const JD_START_MARKERS = [
  /job\s+description/i,
  /about\s+the\s+(role|position|job|opportunity)/i,
  /position\s+overview/i,
  /the\s+role/i,
  /what\s+you'?ll\s+do/i,
  /what\s+the\s+role\s+entails/i,
  /you\s+will\s+be\s+responsible/i,
];

const JD_END_MARKERS = [
  /equal\s+opportunity/i,
  /eeo\s+statement/i,
  /diversity\s+(and|&)\s+inclusion/i,
  /reasonable\s+accommodation/i,
  /background\s+check/i,
  /about\s+(the\s+)?company/i,
  /what\s+we\s+offer/i,
  /our\s+(perks|benefits)/i,
  /related\s+jobs/i,
  /similar\s+jobs/i,
  /share\s+this\s+(job|position)/i,
  /apply\s+now/i,
  /apply\s+for\s+this/i,
];

export async function fetchJdFromUrl(url: string): Promise<{
  text: string;
  title: string | null;
}> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL. Make sure it starts with https://");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP(S) URLs are supported");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log(`[jd-fetch] Fetching: ${url}`);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: HEADERS,
      redirect: "follow",
    });

    console.log(`[jd-fetch] Response: ${res.status} ${res.statusText}`, {
      contentType: res.headers.get("content-type"),
      contentLength: res.headers.get("content-length"),
    });

    if (!res.ok) {
      throw new Error(
        `Site returned HTTP ${res.status}. Some sites block automated access.`
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error(
        "URL did not return a web page. Make sure you're pasting a job posting URL."
      );
    }

    const html = await res.text();
    console.log(`[jd-fetch] HTML length: ${html.length} chars`);

    const result = extractJdFromHtml(html);

    console.log(`[jd-fetch] Extraction result:`, {
      title: result.title,
      textLength: result.text.length,
      textPreview: result.text.slice(0, 300),
    });

    if (result.text.length < 50) {
      throw new Error(
        "Could not extract job description from this page. The site may require JavaScript to display content. Try pasting the JD text directly instead."
      );
    }

    return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "Request timed out. The site took too long to respond."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function extractJdFromHtml(html: string): {
  text: string;
  title: string | null;
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].trim())
    : null;

  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Try ATS-specific extraction first
  const atsText = tryAtsExtraction(cleaned);
  if (atsText && atsText.length > 100) {
    console.log(`[jd-fetch] Used ATS extraction, got ${atsText.length} chars`);
    return { text: atsText.slice(0, MAX_JD_LENGTH), title };
  }

  // Fallback: strip all tags and extract by content markers
  let text = cleaned
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/blockquote>/gi, "\n\n");

  text = text.replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text);
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  console.log(`[jd-fetch] Full text extraction: ${text.length} chars`);

  const jdText = extractByMarkers(text);

  console.log(`[jd-fetch] After marker extraction: ${jdText.length} chars`);

  return { text: jdText.slice(0, MAX_JD_LENGTH), title };
}

function tryAtsExtraction(html: string): string | null {
  // Greenhouse: content is usually in <div id="content">
  const greenhouse = html.match(
    /<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i
  );
  if (greenhouse?.[1]) {
    const text = stripTags(greenhouse[1]);
    console.log(`[jd-fetch] Greenhouse pattern matched: ${text.length} chars`);
    if (text.length > 100) return text;
  }

  // Lever: posting-content
  const lever = html.match(
    /<div[^>]*class="[^"]*posting-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i
  );
  if (lever?.[1]) {
    const text = stripTags(lever[1]);
    console.log(`[jd-fetch] Lever pattern matched: ${text.length} chars`);
    if (text.length > 100) return text;
  }

  // Workable
  const workable = html.match(
    /<div[^>]*class="[^"]*(?:job-details|job-description)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (workable?.[1]) {
    const text = stripTags(workable[1]);
    console.log(`[jd-fetch] Workable pattern matched: ${text.length} chars`);
    if (text.length > 100) return text;
  }

  // Generic: any element with a JD-like class or id
  const generic = html.match(
    /<(?:div|section|article|main)[^>]*(?:class|id)="[^"]*(?:description|content|posting|job-details|jd|job-body)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|article|main)>/i
  );
  if (generic?.[1]) {
    const text = stripTags(generic[1]);
    console.log(`[jd-fetch] Generic pattern matched: ${text.length} chars`);
    if (text.length > 100) return text;
  }

  console.log(`[jd-fetch] No ATS pattern matched, falling back to full-text extraction`);
  return null;
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function extractByMarkers(text: string): string {
  const textLower = text.toLowerCase();

  let startIndex = -1;
  for (const pattern of JD_START_MARKERS) {
    const match = textLower.search(pattern);
    if (match !== -1) {
      startIndex = match;
      break;
    }
  }

  if (startIndex === -1) {
    if (text.length < 5000) return text;
    return text;
  }

  const searchFrom = startIndex + 200;
  let endIndex = text.length;
  const remaining = textLower.slice(searchFrom);

  for (const pattern of JD_END_MARKERS) {
    const match = remaining.search(pattern);
    if (match !== -1) {
      endIndex = searchFrom + match;
      break;
    }
  }

  return text.slice(startIndex, endIndex).trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/&#x[0-9a-fA-F]+;/g, "");
}
