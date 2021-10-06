import { Observable } from "rxjs";
import { IProcessingStatus, PlainObject, PlainObjectType } from "../useEntityForm/model";

export type AdaptLoadDataFn = (data: any, resources: { [key: string]: IProcessingStatus }) => {
    data: any,
    resources?: {
        [key: string]: PlainObject
    }
};

export interface UseEntitySearchProps {
    params$: Observable<any>;
    loadData$: (params: any) => any | Promise<any> | Observable<any/*PlainObjectType | PlainObject*/>,
    onProcessingStatus?: (processingStatus: IProcessingStatus, params: PlainObject) => void
    adaptLoadData?: AdaptLoadDataFn,
    resources?: {
        [key: string]: {
            concurrent?: boolean,
            cache?: boolean,

            params$: Observable<PlainObject>,
            loadData$: (params: PlainObjectType | PlainObject) =>  /*PlainObject | Promise<PlainObject> |*/ Observable<PlainObject | PlainObject[]>,
            onProcessingStatus?: (processingStatus: IProcessingStatus, params: PlainObject) => void

        }
    }
}

export interface IEntitySearchState<L = any> {
    paging: {
        size: number,
        page: number,
        sort: any
    },
    params: PlainObjectType | PlainObject
    loadStatus: Partial<IProcessingStatus<L>>,
    data: L,
    resources: {
        [key: string]: IProcessingStatus
    }
}



export interface UseEntitySearchConfig {
    searchStatus: IEntitySearchState
}


