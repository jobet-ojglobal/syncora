// types/address.ts
export type InflowAddressSnapshot = {
  name?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  remarks?: string | null;
  addressType?: string | null;
};