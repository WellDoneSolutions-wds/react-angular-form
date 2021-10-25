import { Observable } from "rxjs";

export enum ProcessingType {
  EXHAUST,
  CONCAT,
  MERGE,
  SWITCH,
  FLAT,
}

export type PlainObjectType = string | number | boolean | Date;

export interface PlainObject {
  [key: string]:
    | PlainObject
    | PlainObjectType
    | PlainObjectType[]
    | PlainObject[];
}
export interface IRetryProcessing {
  maxRetryAttempts: number;
  interval: number;
  typeInterval?: "LINEAR" | "EXPONENTIAL";
  notRetryWhenStatus?: number[];
  noRetryWhen?: (error: any) => boolean;
}

export interface IAsyncCallConfig {
  executeFn$?: (params: any) => any | Promise<any> | Observable<any>;
  retry?: IRetryProcessing;
  onProcessingStatus?: (
    processingStatus: IAsyncCallExecution,
    params: PlainObject
  ) => void;
}

export type EnumStatusType = "PROCESSING" | "SUCCESS" | "ERROR" | "CANCELED";
export interface IAsyncCallExecution<T = any> {
  status?: EnumStatusType;
  data?: T;
  error?: any;
  config?: any;
}
