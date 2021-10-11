import { useEffect, useRef, useState } from "react";
import { Observable } from "rxjs";
import { AsyncCall, initialStateAsyncCall } from "./AsyncCall";
import { IAsyncCallConfigProps, IAsyncCallExecuteProps, IAsyncCallState, UseAsyncCallReturn } from "./model";

export const useAsyncCall = <P extends unknown = any, R extends unknown = any>(params: { key?: any, params$?: Observable<any> }, executeFn: IAsyncCallExecuteProps, config?: IAsyncCallConfigProps): UseAsyncCallReturn<P, R> => {
    const [, setState] = useState<IAsyncCallState>(initialStateAsyncCall);
    const AsyncCallRef = useRef<AsyncCall>(new AsyncCall(params.params$, executeFn, config, null, setState));
    const asyncCall = AsyncCallRef.current;
    useEffect(
        () => {
            asyncCall.init();
            return () => {
                asyncCall.destroy$.next();
                asyncCall.destroy$.complete();
            };
        },
        [asyncCall]
    )
    const status = asyncCall.newState.status;
    return {
        data: status.data,
        error: status.error,
        isLoading: status.status === 'PROCESSING',
        isSuccess: status.status === 'SUCCESS',
        execute: asyncCall.execute,
        reload: asyncCall.reload,
        status: status.status,
        getState: asyncCall.getState,
        isError: status.status === 'ERROR'
    }
}