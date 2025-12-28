export type Config = {
  baseUrl: string;
  authHeader: string;
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export function getConfig(): Config {
  const baseUrl = env("T212_BASE_URL") ?? "https://live.trading212.com";

  const authHeader = env("T212_AUTHORIZATION");
  if (authHeader) {
    return { baseUrl, authHeader };
  }

  const apiKey = env("T212_API_KEY");
  const apiSecret = env("T212_API_SECRET");
  if (!apiKey || !apiSecret) {
    throw new Error(
      "Missing auth. Set T212_AUTHORIZATION, or both T212_API_KEY and T212_API_SECRET."
    );
  }

  const encoded = Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString("base64");
  return { baseUrl, authHeader: `Basic ${encoded}` };
}
