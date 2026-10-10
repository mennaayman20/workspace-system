export interface ServiceItem {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  isActive: boolean;
  isDeleted?: boolean;
}

export interface CreateServiceCommand {
  name: string;
  description?: string | null;
  price: number;
  isActive: boolean;
}

export interface UpdateServiceCommand extends CreateServiceCommand {
  id: number;
}