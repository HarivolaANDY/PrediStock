export interface User {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  location?: string;
  status: string;
  updated_at?: string;
  //permissions?: string[];
  biography?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  prioritylevel?: number;
  permissions?: string[];
  dashboard_analytics?: string[];
  inventory_management?: string[];
  user_management?: string[];
  ai_datamodels?: string[];
}
