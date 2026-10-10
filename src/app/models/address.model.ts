export type AddressOwner = 'client' | 'worker';

export interface AddressData {
  id?: number;

  address: string;
  labelType: 'home' | 'work' | 'other' | null;
  customLabel: string | null;
  floor: string | null;
  apartment: string | null;
  latitude: number | null;
  longitude: number | null;
}
