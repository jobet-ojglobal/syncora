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
  LOCAL001_API_URL: required(
    "LOCAL001_API_URL"
  ),
  LOCAL001_API_KEY: required(
    "LOCAL001_API_KEY"
  ),
  APP_URL: required(
    "APP_URL"
  ),
};