import { FilterBase } from "./filterTypes";

export interface Category extends FilterBase {
  name: string;
  color?: string;
  icon?: string;
}
