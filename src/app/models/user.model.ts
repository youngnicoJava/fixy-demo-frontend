import { Role } from './enums/Role.enum';

export interface User {
  id: number;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
}
