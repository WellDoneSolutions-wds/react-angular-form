import { useRef } from "react";
import { FormBuilder } from "../../../FormBuilder";

export const useFormBuilder = () => {
  const formBuilderRef = useRef<FormBuilder>(new FormBuilder());
  return formBuilderRef.current;
};
