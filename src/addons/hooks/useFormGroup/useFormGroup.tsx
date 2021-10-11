import { useEffect, useRef, useState } from "react";
import { filter, Subject, takeUntil, tap } from "rxjs";
import { FormGroup } from "../../../model";

interface UseFormGroupReturn {
    formGroup: FormGroup,
    setFormGroup: (formGroup: FormGroup) => void
}

export const useFormGroup = (formGroup?: FormGroup): UseFormGroupReturn => {
    const [, state] = useState({});
    const formGroupRef = useRef<FormGroup>(formGroup || new FormGroup({}));
    const setFormGroup$ = new Subject<FormGroup>();
    const destroy$ = new Subject<void>();

    useEffect(
        () => {
            setFormGroup$.pipe(
                takeUntil(destroy$),
                filter(formGroup => formGroup !== formGroupRef.current),
                tap(
                    (formGroup) => {
                        formGroupRef.current = formGroup;
                        formGroupRef.current.dispatchStateFn = state;
                    }
                )
            ).subscribe()
        }, []
    );
    return {
        formGroup: formGroupRef.current,
        setFormGroup: setFormGroup$.next.bind(setFormGroup$),
    }
}