import { FormGroup } from "../../..";

export interface UseFormGroupReturn {
  formGroup: FormGroup;
  setFormGroup: (formGroup: FormGroup) => void;
  getFormGroup: () => FormGroup;
}
