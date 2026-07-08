// lib/local.env.ts

function required(name: string, fallbackForBuild?: string) {
  const value = process.env[name];

  if (!value) {
    // Check if Next.js is building/prerendering statically right now
    // "phase-production-build" is when page data collection runs
    const isNextBuilding = process.env.NEXT_PHASE === "phase-production-build" || process.env.NODE_ENV === "production";

    if (isNextBuilding && fallbackForBuild) {
      return fallbackForBuild;
    }

    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  // Since URLs live in the database now, give it a build-safe placeholder string
  INFLOW_API_URL: required(
    "INFLOW_API_URL", 
    "https://build-time-placeholder.local"
  ),
  INFLOW_API_KEY: required(
    "INFLOW_API_KEY", 
    "build_placeholder_key"
  ),
  INFLOW_COMPANY_ID: required(
    "INFLOW_COMPANY_ID", 
    "build_placeholder_id"
  ),
  SITE_URL: required(
    "SITE_URL", 
    "http://localhost:3000"
  ),
};