import { useEffect, useRef, useState } from "react";
import { AsyncCall, initialStateAsyncCall } from "./AsyncCall";
import {
  IAsyncCallConfigProps,
  IAsyncCallExecuteProps,
  IAsyncCallState,
  UseAsyncCallReturn,
} from "./model";

export const useAsyncCall = <P extends any = any, D extends any = any>(
  executeFn: IAsyncCallExecuteProps<D, P>,
  config?: IAsyncCallConfigProps<D, P>
): UseAsyncCallReturn<P, D> => {
  const [, setState] = useState<IAsyncCallState>(initialStateAsyncCall);
  const asyncCallRef = useRef<AsyncCall<P, D>>(
    new AsyncCall<P, D>(executeFn, config, setState, null)
  );
  const asyncCall = asyncCallRef.current;
  useEffect(() => {
    asyncCall.init();
    return () => {
      asyncCall.destroy$.next();
      asyncCall.destroy$.complete();
    };
  }, [asyncCall]);
  const status = asyncCall.newState.status;
  return {
    data: status.data,
    error: status.error,
    isLoading: status.status === "PROCESSING",
    isSuccess: status.status === "SUCCESS",
    execute: asyncCall.execute,
    reload: asyncCall.reload,
    status: asyncCall.getStatus(),
    getState: asyncCall.getState,
    isError: status.status === "ERROR",
    setData: asyncCall.setData,
    ref: asyncCallRef,
    allErrors: asyncCall.newState.errors,
  };
};
