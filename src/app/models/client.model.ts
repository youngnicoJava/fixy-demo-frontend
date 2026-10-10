export interface SavedAddress {
  id: number;
  label: string;
  labelType: 'home' | 'work' | 'other';
  customLabel?: string;
  address: string;
  latitude: number;
  longitude: number;
  floor?: string;
  apartment?: string;
}

export interface SavedAddressRequest {
  label: string;
  labelType: 'home' | 'work' | 'other';
  customLabel?: string;
  address: string;
  floor?: string;
  apartment?: string;
}

export interface ClientProfile {
  id: number;
  fullName: string;
  savedAddresses: SavedAddress[];
  activeAddress: SavedAddress | null;
}
