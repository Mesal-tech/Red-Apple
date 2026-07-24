export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin' | 'medical_reviewer';
}

export interface ClinicPartner {
  id: string;
  name: string;
  location: string;
  contactEmail: string;
  status: 'active' | 'pending' | 'suspended';
}
