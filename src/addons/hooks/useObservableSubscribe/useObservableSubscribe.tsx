import { useEffect, useRef, useState } from "react";
import { Subject, takeUntil, tap } from "rxjs";
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
            setState({ value });
          },
          (error) => {
            setState({ error });
          },
          () => {
            setState({ completed: true });
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
