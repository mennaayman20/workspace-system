export interface AppUser {
  id: string;
  fullName: string;
  userName: string;
  email: string;
  roles: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/** مطابق للـ AddUserToRoleCommand في الـ Swagger */
export interface AddUserToRoleCommand {
  userId: string | null;
  roleName: string | null;
}