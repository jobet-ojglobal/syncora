export interface InflowListParams {
  count?: number;
  before?: string;
  after?: string;
  include?: string;
}

export function buildQuery(
  params: InflowListParams
) {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .reduce(
        (acc, [k, v]) => ({
          ...acc,
          [k]: String(v),
        }),
        {}
      )
  ).toString();
}