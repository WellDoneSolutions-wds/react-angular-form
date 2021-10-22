import { useEffect, useRef, useState } from "react";
import { Observable, Subject, takeUntil, tap } from "rxjs";
import { produce } from "immer";
import { UseSubscribeObsProps } from "./model";

export const useObservableSubscribe = (props: UseSubscribeObsProps) => {
  const [state, setState] = useState<{
    completed?: true;
    error?: any;
    value?: any;
  }>({});
  const destroy$Ref = useRef<Subject<void>>(
    props.destroy$ ? props.destroy$ : new Subject<void>()
  );
  const obs$ = props.obs$;
  const destroy$ = destroy$Ref.current;
  useEffect(() => {
    obs$
      .pipe(
        takeUntil(destroy$),
        tap(
          (value) => {
            setState(
              produce((draft) => {
                draft.value = value;
              })
            );
          },
          (error) => {
            setState(
              produce((draft) => {
                draft.error = error;
              })
            );
          },
          () => {
            setState(
              produce((draft) => {
                draft.completed = true;
              })
            );
          }
        )
      )
      .subscribe();
    return () => {
      destroy$.next();
      destroy$.complete();
    };
  }, [obs$, destroy$]);
  return state;
};
