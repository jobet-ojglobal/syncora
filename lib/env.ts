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
  INFLOW_API_URL: required(
    "INFLOW_API_URL"
  ),
  INFLOW_API_KEY: required(
    "INFLOW_API_KEY"
  ),
  INFLOW_COMPANY_ID: required(
    "INFLOW_COMPANY_ID"
  ),
  APP_URL: required(
    "APP_URL"
  ),
};