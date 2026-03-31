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