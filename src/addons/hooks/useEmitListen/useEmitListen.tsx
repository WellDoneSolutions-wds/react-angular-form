import { useEffect, useRef, useState } from "react"
import { filter, merge, shareReplay, Subject, takeUntil, tap } from "rxjs"
import { EmitListenReturn, EmitListenReturnState, IEmitListenProps } from "./model"

export const useEmitListen = (props: IEmitListenProps = {}) /*: EmitListenReturn<T>*/ => {
    const emitListen$Ref = useRef<Subject<any>>(new Subject<any>())
    const destroy$Ref = useRef<Subject<void>>(props.destroy$ ? props.destroy$ : new Subject<void>())
    const [state, setState] = useState<EmitListenReturnState>(EmitListenReturnState.OPEN);
    const open$Ref = useRef<Subject<void>>(new Subject<void>());
    const close$Ref = useRef<Subject<void>>(new Subject<void>());
    const destroy$ = destroy$Ref.current;

    useEffect(
        () => {
            open$Ref.current.pipe(
                takeUntil(destroy$),
                tap(
                    () => {
                        setState(EmitListenReturnState.OPEN)
                    }
                )
            ).subscribe()

            close$Ref.current.pipe(
                takeUntil(destroy$),
                tap(
                    () => {
                        setState(EmitListenReturnState.CLOSE)
                    }
                )
            ).subscribe()
            return () => {
                destroy$.next();
                destroy$.complete();
            }
        }, []
    )
    const params$ = props.params$ ? merge(props.params$, emitListen$Ref.current) : emitListen$Ref.current;
    return {
        emit: emitListen$Ref.current.next.bind(emitListen$Ref.current),
        listen: params$.pipe(
            takeUntil(destroy$Ref.current),
            filter(x => state === EmitListenReturnState.OPEN),
            shareReplay()
        ).subscribe.bind(emitListen$Ref.current),
        open: open$Ref.current.next.bind(open$Ref.current),
        close: close$Ref.current.next.bind(close$Ref.current),
        state
    }
}
