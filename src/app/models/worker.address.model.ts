export interface WorkerSavedAddress {
  id: number;
  label: string;
  labelType: 'home' | 'work' | 'other';
  customLabel: string | null;
  floor: string | null;
  apartment: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface WorkerAddressRequest {
  label: string;
  labelType: 'home' | 'work' | 'other';
  customLabel?: string | null;
  floor?: string | null;
  apartment?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface WorkerAddressProfileResponse {
  savedAddresses: WorkerSavedAddress[];
  activeAddress: WorkerSavedAddress | null;
}
