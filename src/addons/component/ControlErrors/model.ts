import { AbstractControl } from "../../..";
import {
  IInputContainerPropsRenderProcessing,
  IInputContainerPropsRenderValidationErrors,
} from "../inputContainer/model";

export interface ControlErrorsProps {
  control: AbstractControl;
  renderErrors: IInputContainerPropsRenderValidationErrors;
  renderProcessing?: IInputContainerPropsRenderProcessing;
}
