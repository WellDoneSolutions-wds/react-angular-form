import { useEffect, useRef, useState } from "react";
import { delay, filter, Subject, takeUntil, tap } from "rxjs";
import { FormGroup } from "../../../model";
import { UseFormGroupReturn } from "./model";

export const useFormGroup = (formGroup?: FormGroup): UseFormGroupReturn => {
  const [, state] = useState({});
  const [, reRender] = useState(0);
  const formGroupRef = useRef<FormGroup>(formGroup || new FormGroup({}));
  const setFormGroup$ = new Subject<FormGroup>();
  const destroy$ = new Subject<void>();

  useEffect(() => {
    setFormGroup$
      .pipe(
        takeUntil(destroy$),
        filter((formGroup) => formGroup !== formGroupRef.current),
        tap((formGroup) => {
          setImmediate(() => {
            formGroupRef.current = formGroup;
            formGroupRef.current.dispatchStateFn = state;
          });
        }),
        delay(1),
        tap(() => {
          reRender(Math.random());
        })
      )
      .subscribe();
  }, []);
  const getFormGroup= () => {
    return formGroupRef.current;
  }
  return {
    formGroup: formGroupRef.current,
    setFormGroup: setFormGroup$.next.bind(setFormGroup$),
    getFormGroup: getFormGroup.bind(formGroupRef)
  };
};
