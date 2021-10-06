import { Observable, Subject } from "rxjs";
import { FormArray, FormControl, FormGroup } from "../../model";

export type PlainObjectType = string | number | boolean | Date;

export interface PlainObject {
    [key: string]: PlainObject | PlainObjectType | PlainObjectType[] | PlainObject[]
}
export interface IInputContainerRenderInputParams {
    control: FormControl,
    data: any,
    validationStatus: 'PROCESSING' | 'PROCESSED' | 'ERROR' | undefined,
    showErrors: boolean,
}

export interface IRetryProcessing {
    numberRetries?: number,
    interval: number,
    exponential?: number,
    retryWhen?: (error: any) => boolean,
    noRetryWhen?: (error: any) => boolean,
}


interface IProcessingStatusShowErrorParams {
    form: { submitted: boolean },
    input: {
        touched: boolean,
        dirty: boolean
    }
}

export interface IAsyncProcessingConfig {
    data$?: (params: any) => any | Promise<any> | Observable<any>,
    retry?: IRetryProcessing,
    onProcessingStatus?: (processingStatus: IProcessingStatus, params: PlainObject) => void
}

interface IEntityAsyncProcessingConfig extends IAsyncProcessingConfig {
    adaptData?: (data: any) => {
        initialData: any,
        resources?: {
            [key: string]: any
        }
    }
}

interface IResourceAsyncProcessingConfig extends IAsyncProcessingConfig {
    params$: Observable<any>
}

export type EnumStatusType = 'PROCESSING' | 'PROCESSED' | 'ERROR';
export interface IProcessingStatus<T = any> {
    status?: EnumStatusType,
    data?: T,
    error?: any,
    config?: any
}
interface IInputContainerProps<T = any> {
    form: {
        submitted?: boolean,
        loadStatus: IProcessingStatus<T>,
    },
    control: FormControl | FormGroup | FormArray,
    renderInput: (params: IInputContainerRenderInputParams) => any,
    dataProcessingStatus?: IProcessingStatus<T>,
    showErrorsFn?: (params: { form: { submitted: boolean }, input: { touched: boolean, dirty: boolean } }) => boolean;
    processingTemplate?: () => any;
    labelTemplate?: (params: { showErrors: boolean, validationStatus: 'PROCESSING' | 'PROCESSED' | 'ERROR' | 'NONE', label: string }) => any;
    errorsTemplate?: (params: { errors: any, form: { submitted: boolean }, input: { touched: boolean, dirty: boolean } }) => any
    reloadTemplate?: (params: { reloadFn: any }) => any;
    label: string;
}
export interface IEntityFormState<L = any, S = any> {
    submitted: boolean,
    loadStatus: IProcessingStatus<L>,
    params: any,
    saveStatus: IProcessingStatus<S>,
    resources: {
        [key: string]: IProcessingStatus
    }
    resourceParams: {
        [key: string]: PlainObjectType | PlainObject,
    }
}

export  interface UseFormGroupLoadProps{
    
        entity: IEntityAsyncProcessingConfig,
        resources?: {
            [key: string]: IResourceAsyncProcessingConfig
        },
    
} 
export interface UseFormGroupProps {
    params$?: Observable<any>;
    load?: UseFormGroupLoadProps;
    save?: {
        saveDataFn$: (data: any, params: any) => any | Promise<any> | Observable<any>
        onProcessingStatus?: (processingStatus: IProcessingStatus, params: PlainObject) => void
    }
}

export type LoadResourceType = (config: { id: string, params: any, config: IAsyncProcessingConfig }) => void;
export interface UseFormGroupConfig {
    formState: IEntityFormState,
    resources: { [key: string]: IProcessingStatus },
    reloadResource: (resourceId: string) => void,
    submit: () => void,
    resetSubmit: () => void,
    resetForm: () => void,
    triggerSave: (data: any) => void,
    triggerLoad: (params: any) => void,
    destroy$: Subject<void>;
    loadResource: LoadResourceType
}