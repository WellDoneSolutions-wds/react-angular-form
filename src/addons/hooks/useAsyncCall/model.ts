import { IAsyncCallState, SetDataType } from "../../..";
import { EnumStatusType } from "../../common/model";

export interface UseAsyncCallReturn<P = any, D = any> {
  data: D;
  error: any;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  getState: () => IAsyncCallState<P, D>;
  execute: (params: P) => void;
  reload: () => void;
  status: EnumStatusType;
  setData: SetDataType<D>;
  ref: any;
  allErrors: any[];
}
