export interface ProviderBranch {
  id: string;
  name: string;
  longitude: string;
  latitude: string;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  name: string;
  phone: string | null;
  reservation_email: string | null;
  branches: ProviderBranch[];
  created_at: string;
  updated_at: string;
}

export interface ProviderBranchWrite {
  id?: string | null;
  name: string;
  longitude: string;
  latitude: string;
}

export interface ProviderWrite {
  name: string;
  phone: string | null;
  reservation_email: string | null;
  branches: ProviderBranchWrite[];
}

export interface ProvidersResponse {
  items: Provider[];
  total: number;
  page: number;
  page_size: number;
}
