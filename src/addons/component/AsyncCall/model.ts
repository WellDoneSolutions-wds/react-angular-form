import { Observable, Subject } from "rxjs";
import {
  IAsyncCallExecution,
  IRetryProcessing,
  ProcessingType,
} from "../../..";

export interface IAsyncCallState<P, D> {
  execution: IAsyncCallExecution<D>;
  params: P;
  errors: any[];
}

export type IAsyncCallExecuteProps<P, D> = (
  params: P
) => D | Promise<D> | Observable<D>;

export interface IAsyncCallConfigProps<P, D> {
  processingType?: ProcessingType;
  retry?: IRetryProcessing;
  source$?: Observable<P>;
  onSuccess?: (data: D, params: P) => void;
  onProcessing?: (params: P) => void;
  onError?: (error: any, params: P) => void;
  destroy$?: Subject<void>;
}

export type AsyncCallSetStateType<P, D> = (
  a: (prevState: IAsyncCallState<P, D>) => IAsyncCallState<P, D>
) => void;
