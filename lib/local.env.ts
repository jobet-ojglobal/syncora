function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }

  return value;
}

export const env = {
  PARTNER_API_URL: required(
    "PARTNER_API_URL"
  ),
  PARTNER_API_KEY: required(
    "PARTNER_API_KEY"
  ),
  SITE_URL: required(
    "SITE_URL"
  ),
};