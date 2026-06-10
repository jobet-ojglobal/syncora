export interface CategoryDto {
  id: string;
  inflowCategoryId: string;
  name: string;
  isDefault: boolean;
  timestamp?: string | null;
  parentId?: string | null;
  children?: CategoryDto[];

  createdAt: Date;
  updatedAt: Date;
}