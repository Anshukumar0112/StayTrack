export interface User {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'customer' | 'host' | 'admin';
  profileCompleted?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationArea {
  id: string;
  cityName: string;
  areaName: string;
  pincode?: string;
  active?: boolean;
  createdAt?: string;
}
