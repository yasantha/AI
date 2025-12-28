import type { Config } from "./config.js";

type Query = Record<string, string | number | boolean | undefined>;

export function createTrading212Client(config: Config) {
  async function get(path: string, query?: Query) {
    const url = new URL(path, config.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: config.authHeader,
        Accept: "application/json"
      }
    });

    const contentType = response.headers.get("content-type") ?? "";
    const bodyText = await response.text();

    if (!response.ok) {
      throw new Error(`Trading212 API error ${response.status}: ${bodyText}`);
    }

    if (contentType.includes("application/json")) {
      return bodyText.length ? JSON.parse(bodyText) : null;
    }

    return bodyText;
  }

  return { get };
}
