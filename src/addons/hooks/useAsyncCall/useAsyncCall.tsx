import { useEffect, useRef, useState } from "react";
import {
  IAsyncCallConfigProps,
  IAsyncCallExecuteProps,
  IAsyncCallState,
  SetDataType,
} from "../../..";
import {
  AsyncCall,
  initialStateAsyncCall,
} from "../../component/AsyncCall/AsyncCall";
import { UseAsyncCallReturn } from "./model";

export const useAsyncCall = <P extends any = any, D extends any = any>(
  executeFn: IAsyncCallExecuteProps<P, D>,
  config?: IAsyncCallConfigProps<P, D>
): UseAsyncCallReturn<P, D> => {
  const [, setState] = useState<IAsyncCallState<P, D>>(initialStateAsyncCall);
  const asyncCallRef = useRef<AsyncCall<P, D>>(
    new AsyncCall<P, D>(executeFn, config!, setState)
  );
  const asyncCall = asyncCallRef.current;

  const asyncCallExecuteRef = useRef<(params: P) => void>(asyncCall.execute);
  const asyncCallReloadRef = useRef<() => void>(asyncCall.reload);
  const asyncCallGetState = useRef<() => IAsyncCallState<P, D>>(
    asyncCall.getState
  );
  const asyncCallSetDataRef = useRef<SetDataType<D>>(asyncCall.setData);
  useEffect(() => {
    asyncCall.init();
    return () => {
      asyncCall.destroy();
    };
  }, [asyncCall]);

  const execution = asyncCall.newState.execution;
  return {
    data: execution.data!,
    error: execution.error,
    isLoading: execution.status === "PROCESSING",
    isSuccess: execution.status === "SUCCESS",
    isError: execution.status === "ERROR",
    status: execution.status!,
    ref: asyncCallRef,
    allErrors: asyncCall.newState.errors,
    execute: asyncCallExecuteRef.current,
    reload: asyncCallReloadRef.current,
    getState: asyncCallGetState.current,
    setData: asyncCallSetDataRef.current,
  };
};
