/** @format */

export type CarType = {
  id?: number;
  mark: string;
  matricule: string;
  model?: string;
  year?: number;
  user_id?: number | null; // Can be null if ON DELETE SET NULL is used or car can be unassigned
  createdAt?: Date;
  updatedAt?: Date;
};
