import { useEffect, useRef } from "react";
import {
  debounceTime,
  filter,
  merge,
  Observable,
  shareReplay,
  Subject,
  takeUntil,
  tap,
} from "rxjs";
import { EmitListenProps, EmitListenReturn, Listen } from "./model";

export const useEmitListen = <T extends any = any>(
  props: EmitListenProps<T> = {}
): EmitListenReturn<T> => {
  const emitListen$Ref = useRef<Subject<T>>(new Subject<T>());

  const destroy$Ref = useRef<Subject<void>>(
    props.destroy$ ? props.destroy$ : new Subject<void>()
  );
  const stateRef = useRef("OPEN");
  const open$Ref = useRef<Subject<void>>(new Subject<void>());
  const open$ = open$Ref.current;
  const close$Ref = useRef<Subject<void>>(new Subject<void>());
  const close$ = close$Ref.current;
  const destroy$ = destroy$Ref.current;
  const listenFnSubject$Ref = useRef<Subject<Listen<T>>>(
    new Subject<Listen<T>>()
  );
  const listenFnsRef = useRef<Listen<T>[]>([]);

  useEffect(() => {
    listenFnSubject$Ref.current
      .pipe(
        takeUntil(destroy$Ref.current),
        tap((listenFn) => {
          listenFnsRef.current.push(listenFn);
        })
      )
      .subscribe();

    (props.params$
      ? merge(props.params$.pipe(debounceTime(1)), emitListen$Ref.current)
      : emitListen$Ref.current
    )
      .pipe(
        takeUntil(destroy$Ref.current),
        filter((x) => {
          return stateRef.current === "OPEN";
        }),
        tap((x) => {
          props.tap && props.tap(x);
          listenFnsRef.current.forEach((listenFn) => {
            listenFn(x);
          });
        }),
        shareReplay()
      )
      .subscribe();

    open$
      .pipe(
        takeUntil(destroy$),
        tap(() => {
          stateRef.current = "OPEN";
        })
      )
      .subscribe();

    close$
      .pipe(
        takeUntil(destroy$),
        tap(() => {
          stateRef.current = "CLOSE";
        })
      )
      .subscribe();
    return () => {
      destroy$.next();
      destroy$.complete();
    };
  }, [destroy$, close$, open$, props]);
  return {
    emit: emitListen$Ref.current.next.bind(emitListen$Ref.current),
    listen: listenFnSubject$Ref.current.next.bind(listenFnSubject$Ref.current),
    open: open$Ref.current.next.bind(open$Ref.current),
    close: close$Ref.current.next.bind(close$Ref.current),
    state: stateRef.current,
  };
};
