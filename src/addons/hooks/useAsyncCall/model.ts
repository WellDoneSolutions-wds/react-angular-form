import { Observable } from "rxjs";
import { EnumStatusType, IProcessingStatus, IRetryProcessing, ProcessingType } from "../../common/model";

export interface IAsyncCallState<L = any, P = any> {
    status: IProcessingStatus<L>,
    params: P,
    errors: any[],
}

export type IAsyncCallExecuteProps = (params: any) => any | Promise<any> | Observable<any>

export interface IAsyncCallConfigProps {
    processingType?: ProcessingType;
    cache?: boolean,
    retry?: IRetryProcessing;
    onProcessingStatus?: (processingStatus: IProcessingStatus, params: any) => void;
    onSuccess?: (data: any, params: any) => void;
    onProcessing?: (params: any) => void;
    onError?: (error: any, params: any) => void;
}


export interface UseAsyncCallReturn<P = any, R = any> {
    data: R,
    error: any,
    isError: boolean,
    isLoading: boolean,
    isSuccess: boolean,
    getState: () => any,
    execute: (params: P) => void,
    reload: () => void,
    status: EnumStatusType

}
