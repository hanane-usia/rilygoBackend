/** @format */

export type GarageType = {
  id?: number;
  category_id: number;
  subcategoriesIds: number[];
  capacity: number;
  disponible: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
