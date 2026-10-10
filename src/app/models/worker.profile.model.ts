import { Category } from './enums/category.enum';
import { WorkerStatus } from './enums/worker-status.enum';
import { PriceType } from './enums/price-type.enum';

export interface WorkerProfile {
  id: number;
  fullName: string;

  address: string;
  labelType: 'home' | 'work' | 'other' | null;
  customLabel: string | null;
  floor: string | null;
  apartment: string | null;

  description: string | null;

  categories: Category[];

  profilePhotoUrl: string | null;

  rating: number | null;
  status: WorkerStatus;
  hasCertificate: boolean;
  verified: boolean;

  latitude: number | null;
  longitude: number | null;
}

export interface WorkerProfileRequest {
  address: string;

  labelType?: 'home' | 'work' | 'other';
  customLabel?: string;
  floor?: string;
  apartment?: string;
  description?: string;

  categories: Category[];

  hasCertificate: boolean;
  acceptedTerms: boolean;

  latitude?: number;
  longitude?: number;
}

export interface WorkerServiceOffering {
  id: number;

  // Service
  title: string;
  description: string;
  category: Category;
  imageUrls: string[];

  // Price
  basePrice: number | null;
  priceType: PriceType;

  // Worker
  workerId: number;
  workerUserId?: number;
  workerFullName: string;
  workerProfilePhotoUrl: string | null;
  workerRating: number | null;
  workerStatus: WorkerStatus;
  workerVerified: boolean;

  // Status
  active: boolean;
  featured: boolean;

  // Dates
  createdAt: string;
  updatedAt: string;
}

export interface WorkerServiceOfferingRequest {
  title: string;
  description: string;
  category: Category;
  basePrice: number | null;
  priceType: PriceType;
  imageUrls: string[];
}
