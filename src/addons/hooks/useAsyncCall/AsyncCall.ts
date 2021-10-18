import produce from "immer";
import { catchError, debounceTime, from, map, mapTo, merge, Observable, of, Subject, take, takeUntil, tap } from "rxjs";
import { ModuleUtils } from "../../../utils/lang";
import { IProcessingStatus, IRetryProcessing } from "../../common/model";
import { getTypeOperation, retryProcessing } from "../../common/utils";
import { IAsyncCallConfigProps, IAsyncCallExecuteProps, IAsyncCallState, SetDataType, SetDataTypeCallbackType } from "./model";

export const initialStateAsyncCall: IAsyncCallState = {
    params: {},
    status: {},
    errors: []
}

export class AsyncCall<P, D> {

    private execute$ = new Subject<P>();
    public newState: IAsyncCallState<D, P> = initialStateAsyncCall;
    private setData$Subject = new Subject<SetDataTypeCallbackType<D>>();

    constructor(
        private executeFn$: IAsyncCallExecuteProps<D, P>,
        private config: IAsyncCallConfigProps<D, P>,
        private setState: (a: (prevState: IAsyncCallState<D, P>) => IAsyncCallState<D, P>) => void,
        public destroy$: Subject<void>,
    ) {
        this.destroy$ = destroy$ ? destroy$ : new Subject<void>();
        this.init = this.init.bind(this);
        this.getState = this.getState.bind(this);
        this.reload = this.reload.bind(this);
        this.initSetData = this.initSetData.bind(this);
        this.getStatus = this.getStatus.bind(this);
    }

    getStatus() {
        return this.newState.status.status;
    }

    private initSetData() {
        this.setData$Subject.pipe(
            takeUntil(this.destroy$),
            tap(setData => {
                this.setState(
                    (prevState) => {
                        const newState = produce(
                            (draft: IAsyncCallState) => {
                                const state = this.getState();
                                debugger;
                                draft.status.data = setData(state.status.data);
                            }
                        )(prevState)
                        this.newState = newState;
                        return newState;
                    }
                );
            })
        )
            .subscribe()
    }

    init() {
        this.initSetData();
        const processingStatus$ = new Subject<void>();
        const config: IAsyncCallConfigProps<D, P> = this.config ? this.config : {}
        const params$ = config.source$ ? merge(this.config.source$, this.execute$) : this.execute$;
        const asyncOperation = getTypeOperation(config.processingType)
        merge(
            processingStatus$.pipe(mapTo<IProcessingStatus>({ status: 'PROCESSING' })),
            params$.pipe(
                takeUntil(this.destroy$),
                debounceTime(10),
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
                    (params: P) => {
                        const data$ = this.executeFn$ ? this.executeFn$(params) : of(params);
                        const loadData$: Observable<any> = ModuleUtils.isObservable(data$) ? data$ : (ModuleUtils.isPromise(data$) ? from(data$) : of(data$))
                        const retryConfig: IRetryProcessing = config.retry ? config.retry : {
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
                tap(
                    (processingStatus) => {
                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IAsyncCallState) => {
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
                tap(
                    (processingStatus) => {
                        const params = this.newState.params;
                        processingStatus.status === 'PROCESSING' && config.onProcessing && config.onProcessing(params);
                        processingStatus.status === 'ERROR' && config.onError && config.onError(processingStatus.error, params);
                        processingStatus.status === 'SUCCESS' && config.onSuccess && config.onSuccess(processingStatus.data, params);
                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IAsyncCallState) => {
                                        draft.status.status = processingStatus.status;
                                    }
                                )(prevState)
                                this.newState = newState;
                                return newState;
                            }
                        );
                    }
                )

            )
            .subscribe()
    }

    getState() {
        return this.newState;
    }

    reload() {
        this.execute$.next(this.newState.params);
    }

    get execute(): (params: P) => void {
        return this.execute$.next.bind(this.execute$);
    }

    get setData(): SetDataType<D> {
        return this.setData$Subject.next.bind(this.setData$Subject);
    }
}