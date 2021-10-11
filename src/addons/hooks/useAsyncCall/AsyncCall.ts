import produce from "immer";
import { catchError, from, map, mapTo, merge, Observable, of, Subject, take, takeUntil, tap } from "rxjs";
import { ModuleUtils } from "../../../utils/lang";
import { IProcessingStatus, IRetryProcessing } from "../../common/model";
import { getTypeOperation, retryProcessing } from "../../common/utils";
import { IAsyncCallConfigProps, IAsyncCallExecuteProps, IAsyncCallState } from "./model";

export const initialStateAsyncCall: IAsyncCallState = {
    params: {},
    status: {},
    errors: []
}

export class AsyncCall {
    private execute$ = new Subject<any>();
    public newState: IAsyncCallState = initialStateAsyncCall;

    constructor(
        private params$: Observable<any>,
        private executeFn$: IAsyncCallExecuteProps,
        private config: IAsyncCallConfigProps,
        public destroy$: Subject<void>,
        private setState: (a: (prevState: IAsyncCallState) => IAsyncCallState) => void,
    ) {
        this.destroy$ = destroy$ ? destroy$ : new Subject<void>();
        this.init = this.init.bind(this);
        this.getState = this.getState.bind(this);
        this.reload = this.reload.bind(this);
    }

    init() {
        const processingStatus$ = new Subject<void>();
        const params$ = this.params$ ? merge(this.params$, this.execute$) : this.execute$;
        const asyncOperation = getTypeOperation(this.config.processingType)
        merge(
            processingStatus$.pipe(mapTo<IProcessingStatus>({ status: 'PROCESSING' })),
            params$.pipe(
                takeUntil(this.destroy$),
                tap(
                    (params) => {
                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IAsyncCallState) => {
                                        draft.params = params;
                                    }
                                )(prevState)
                                this.newState = newState;
                                return newState;
                            }
                        );
                        processingStatus$.next();
                    }
                ),
                asyncOperation(
                    (params: any) => {
                        const data$ = this.executeFn$ ? this.executeFn$(params) : of(params);
                        const loadData$: Observable<any> = ModuleUtils.isObservable(data$) ? data$ : (ModuleUtils.isPromise(data$) ? from(data$) : of(data$))
                        const retryConfig: IRetryProcessing = this.config.retry ? this.config.retry : {
                            interval: 100
                        };
                        return loadData$.pipe(
                            retryProcessing(retryConfig),
                            take(1),
                            map(
                                (data): IProcessingStatus => {
                                    return {
                                        status: 'SUCCESS',
                                        data
                                    }
                                },
                            ),
                            catchError(
                                (error): Observable<IProcessingStatus> => {
                                    return of({ status: 'ERROR', error })
                                }
                            )

                        );
                    }
                )
            )
        )
            .pipe(
                takeUntil(this.destroy$),
                tap((processingStatus) => {
                    const params = this.newState.params;
                    processingStatus.status === 'PROCESSING' && this.config.onProcessing && this.config.onProcessing(params);
                    processingStatus.status === 'ERROR' && this.config.onError && this.config.onError(processingStatus.error, params);
                    processingStatus.status === 'SUCCESS' && this.config.onSuccess && this.config.onSuccess(processingStatus.data, params);
                    this.config.onProcessingStatus && this.config.onProcessingStatus(processingStatus, this.newState.params);

                }),
                tap(
                    (processingStatus) => {
                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IAsyncCallState) => {
                                        draft.status.status = processingStatus.status;
                                        draft.status.data = processingStatus.data;
                                        draft.status.error = processingStatus.error;
                                    }
                                )(prevState)
                                this.newState = newState;
                                return newState;
                            }
                        );
                    }
                ),
 
            )
            .subscribe()
    }

    getState() {
        return this.newState;
    }

    reload() {
        this.execute$.next(this.newState.params);
    }

    get execute() {
        return this.execute$.next.bind(this.execute$);
    }

    // get configx() /*: UseFormGroupConfig*/ {
    //     return {
    //         state: this.newState,
    //         execute: this.execute$.next.bind(this.execute$),
    //         destroy$: this.destroy$,
    //         getData: this.getData
    //     }
    // }

}