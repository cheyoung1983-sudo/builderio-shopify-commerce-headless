/**
 * ElevenLabs Dynamic Variables & Transcript Sanitization Utility
 *
 * Centralizes standard dynamic variables for the DisplayCellPros ElevenLabs
 * conversational voice agent and provides bulletproof resolution / sanitization
 * for dynamic variable placeholders (e.g. `{{customer_name}}`, `{{repair_name}}`).
 * Prevents raw template brackets from leaking into voice transcripts or UI bubbles.
 */

export const DEFAULT_DYNAMIC_VARIABLES: Record<string, string> = {
  customer_name: "Valued Customer",
  first_name: "there",
  last_name: "",
  user_name: "Valued Customer",
  client_name: "Valued Customer",
  name: "Valued Customer",
  store_name: "Display & Cell Pros",
  business_name: "Display & Cell Pros",
  shop_name: "Display & Cell Pros",
  company_name: "Display & Cell Pros",
  store_location: "Spokane, WA",
  location: "Spokane, WA",
  city: "Spokane",
  state: "WA",
  store_phone: "(509) 555-CELL",
  phone: "(509) 555-CELL",
  store_hours: "Monday through Saturday 9:00 AM to 7:00 PM",
  hours: "Mon-Sat 9am - 7pm",
  repair_name: "Display & Touchscreen Assembly",
  repair_type: "Screen & Device Technical Repair",
  service_name: "DisplayCellPros Express Technical Repair",
  service_type: "Spokane On-Site Repair & Mail-In Kit",
  device_model: "Smartphone or Tablet",
  device_type: "Mobile Device",
  device_name: "Device",
  warranty_policy: "1-Year Comprehensive Warranty",
  warranty: "1-Year Comprehensive Warranty",
  turnaround_time: "25 to 45 minutes on-site",
  eta: "25 to 45 minutes",
  pricing: "Free Diagnostic & Upfront Pricing",
};

/**
 * Builds an active dynamic variables object merging store defaults with runtime overrides.
 */
export function buildDynamicVariables(
  customVars?: Record<string, unknown>
): Record<string, string> {
  const merged: Record<string, string> = { ...DEFAULT_DYNAMIC_VARIABLES };

  if (customVars && typeof customVars === "object") {
    for (const [rawKey, val] of Object.entries(customVars)) {
      if (val !== undefined && val !== null && val !== "") {
        const key = rawKey.trim().toLowerCase();
        merged[key] = String(val).trim();
      }
    }
  }

  return merged;
}

/**
 * Sanitizes and resolves any dynamic variable template tags in message or transcript text.
 * Replaces `{{variable_name}}` with its corresponding resolved value, or a clean contextual
 * fallback, ensuring no raw curly braces or awkward spacing are displayed to users.
 */
export function resolveDynamicVariables(
  rawText: unknown,
  customVars?: Record<string, unknown>
): string {
  if (typeof rawText !== "string") {
    return rawText ? String(rawText) : "";
  }

  if (!rawText.includes("{{") || !rawText.includes("}}")) {
    return rawText;
  }

  const vars = buildDynamicVariables(customVars);

  // Replace all {{ variable_name }} occurrences
  let resolved = rawText.replace(
    /\{\{\s*([\w.-]+)\s*\}\}/g,
    (match, rawKey: string) => {
      const key = rawKey.trim().toLowerCase();

      // Direct match in active dynamic variables
      if (vars[key] && vars[key].length > 0) {
        return vars[key];
      }

      // Contextual fallbacks based on variable semantic naming
      if (/first_?name|user_?name|client_?name|customer_?name|^name$/i.test(key)) {
        return "there";
      }
      if (/store|business|shop|company/i.test(key)) {
        return "Display & Cell Pros";
      }
      if (/repair|service/i.test(key)) {
        return "device repair";
      }
      if (/location|city|address/i.test(key)) {
        return "Spokane, WA";
      }
      if (/phone|contact/i.test(key)) {
        return "(509) 555-CELL";
      }
      if (/warranty/i.test(key)) {
        return "1-Year Comprehensive Warranty";
      }
      if (/time|turnaround|eta/i.test(key)) {
        return "25 to 45 minutes";
      }

      // If unknown, return empty string so raw braces are cleanly omitted
      return "";
    }
  );

  // Clean up punctuation artifacts caused by empty placeholder replacement
  // e.g. "Hello  there!" -> "Hello there!"
  // "Hi , how can" -> "Hi, how can"
  // "welcome to  our shop" -> "welcome to our shop"
  resolved = resolved
    .replace(/\s+([,.:!?])/g, "$1")
    .replace(/([A-Za-z]+)\s{2,}([A-Za-z]+)/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();

  return resolved;
}
