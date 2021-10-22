import { Observable, Subject } from "rxjs";
import {
  EnumStatusType,
  IProcessingStatus,
  IRetryProcessing,
  ProcessingType,
} from "../../common/model";

export interface IAsyncCallState<D = any, P = any> {
  status: IProcessingStatus<D>;
  params: P;
  errors: any[];
}

export type IAsyncCallExecuteProps<D, P> = (
  params: P
) => D | Promise<D> | Observable<D>;

export interface IAsyncCallConfigProps<D, P> {
  processingType?: ProcessingType;
  cache?: boolean;
  retry?: IRetryProcessing;
  source$?: Observable<D> | Subject<D>;
  onProcessingStatus?: (
    processingStatus: IProcessingStatus<D>,
    params: P
  ) => void;
  onSuccess?: (data: D, params: P) => void;
  onProcessing?: (params: P) => void;
  onError?: (error: any, params: P) => void;
}

export interface UseAsyncCallReturn<P = any, D = any> {
  data: D;
  error: any;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  getState: () => any;
  execute: (params: P) => void;
  reload: () => void;
  status: EnumStatusType;
  setData: SetDataType<D>;
  ref: any;
  allErrors: any[];
}

export type SetDataTypeCallbackType<T> = (prevData: T) => T;

export type SetDataType<T> = (callBack: SetDataTypeCallbackType<T>) => void;
