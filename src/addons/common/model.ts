import { Observable } from "rxjs";

export enum ProcessingType {
    EXHAUST,
    CONCAT,
    MERGE,
    SWITCH,
    FLAT
}


export type PlainObjectType = string | number | boolean | Date;

export interface PlainObject {
    [key: string]: PlainObject | PlainObjectType | PlainObjectType[] | PlainObject[]
}
export interface IRetryProcessing {
    numberRetries?: number,
    interval: number,
    exponential?: number,
    retryWhen?: (error: any) => boolean,
    noRetryWhen?: (error: any) => boolean,
}

export interface IAsyncCallConfig {
    executeFn$?: (params: any) => any | Promise<any> | Observable<any>,
    retry?: IRetryProcessing,
    onProcessingStatus?: (processingStatus: IProcessingStatus, params: PlainObject) => void
}

export type EnumStatusType = 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'CANCELED';
export interface IProcessingStatus<T = any> {
    status?: EnumStatusType,
    data?: T,
    error?: any,
    config?: any
}
