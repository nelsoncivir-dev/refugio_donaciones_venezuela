export type DonationCategory = 'food' | 'water' | 'clothes' | 'medical' | 'other';
export type LocationType = 'shelter' | 'affected_zone' | 'donation' | 'transport' | 'wifi' | 'missing_person';

export interface ReportLocation {
  id: string;
  type: LocationType;
  lat: number;
  lng: number;
  title: string;
  description: string;
  contact?: string;
  capacity?: number;
  donationCategory?: DonationCategory;
  status?: 'missing' | 'found';
  address?: string;
  photo?: string; // base64 image
  createdAt: number;
}

export interface Claim {
  id: string;
  donationId: string;
  name: string;
  cedula: string;
  cedulaPhoto: string; // base64 image
  createdAt: number;
}
