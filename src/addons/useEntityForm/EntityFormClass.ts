import produce from "immer";
import { catchError, concatMap, delay, exhaustMap, filter, from, iif, map, mapTo, merge, Observable, of, retryWhen, Subject, switchMap, take, takeUntil, tap, throwError } from "rxjs";
// https://stackoverflow.com/questions/44911251/how-to-create-an-rxjs-retrywhen-with-delay-and-limit-on-tries
import { IAsyncProcessingConfig, UseFormGroupLoadProps } from "../../addons/useEntityForm/model";
import { ModuleUtils } from "../../utils/lang";
import { IEntityFormState, IProcessingStatus, IRetryProcessing, PlainObject, PlainObjectType, UseFormGroupConfig, UseFormGroupProps } from "./model";
type SomeInterface = any;

const retryProcessing = (config: IRetryProcessing) => {
    const retryPipeline = retryWhen(errors => errors.pipe(
        // Use concat map to keep the errors in order and make sure they
        // aren't executed in parallel
        concatMap((e, i) =>
            // Executes a conditional Observable depending on the result
            // of the first argument
            iif(
                () => i > 10,
                // If the condition is true we throw the error (the last error)
                throwError(e),
                // Otherwise we pipe this back into our stream and delay the retry
                of(e).pipe(delay(500))
            )
        )
    ));
    return retryPipeline;
}

export class EntityFormClass<T = any>{

    loadResource$: Subject<{ id: string, params: any, config: IAsyncProcessingConfig }> = new Subject();

    destroy$ = new Subject<void>();
    reloadResource$ = new Subject<{ id: string, params: PlainObjectType | PlainObject }>();
    triggerSave$ = new Subject<any>();
    triggerLoad$ = new Subject<any>();
    newState: IEntityFormState = {
        loadStatus: {},
        params: {},
        resourceParams: {},
        resources: {},
        saveStatus: {},
        submitted: false
    };
    constructor(private props: UseFormGroupProps, private setState: (a: (prevState: IEntityFormState) => IEntityFormState) => void) {
        this.reloadResource = this.reloadResource.bind(this);
        this.configSave = this.configSave.bind(this);
        this.loadResourceConfig = this.loadResourceConfig.bind(this);
    }

    private loadResourceConfig() {
        const processingStatus$ = new Subject<any>();
        merge(
            processingStatus$.pipe(map((config): IProcessingStatus => ({ status: 'PROCESSING', config }))),
            this.loadResource$.pipe(
                tap(
                    (config) => {
                        processingStatus$.next(config)
                    }
                ),
                switchMap(
                    (config) => {
                        const data$ = config.config.data$ ? config.config.data$(config.params) : of(config.params);
                        const loadData$: Observable<any> = ModuleUtils.isObservable(data$) ? data$ : (ModuleUtils.isPromise(data$) ? from(data$) : of(data$))
                        const retryConfig: IRetryProcessing = config.config.retry ? config.config.retry : {
                            interval: 100
                        };
                        return loadData$.pipe(
                            retryProcessing(retryConfig),
                            take(1),
                            map(
                                (data: any): IProcessingStatus => {
                                    return {
                                        status: 'PROCESSED',
                                        data,
                                        config
                                    }
                                },
                            ),
                            catchError(
                                (error): Observable<IProcessingStatus> => {
                                    return of({ status: 'ERROR', error, config })
                                }
                            )
                        );
                    }
                )


            )
        ).pipe(
            takeUntil(this.destroy$),
            tap(
                (processingStatus) => {
                    processingStatus.config.config.onProcessingStatus(processingStatus);
                    // processingStatus.data&&processingStatus.data.config&&processingStatus.data.config.config&&processingStatus.data.config.config.onProcessingStatus(processingStatus)

                    this.setState(
                        (prevState) => {
                            const newState = produce(
                                (draft: IEntityFormState) => {
                                    const config = processingStatus.config;
                                    draft.resources[config.id] = {
                                        status: processingStatus.status,
                                        data: processingStatus.data,
                                        error: processingStatus.error
                                    }
                                }
                            )(prevState)
                            this.newState = newState;
                            return newState;
                        }
                    )
                }
            )
        )
            .subscribe()
    }

    init() {
        this.loadResourceConfig();
        this.configSave();

        const loadConfig = this.props.load;
        if (!loadConfig) {
            this.setState(
                (prevState) => {
                    const newState = produce(
                        (draft: IEntityFormState) => {
                            draft.loadStatus.status = 'PROCESSED';
                            draft.loadStatus.data = {};
                        }
                    )(prevState)
                    this.newState = newState;
                    return newState;
                }
            )
            return;
        }
        const resources = loadConfig.resources || {};
        setTimeout(() =>
            Object.keys(resources)
                .map(
                    key => ({ ...resources[key], key })
                ).forEach(
                    (resource) => {

                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IEntityFormState) => {
                                        draft.resources[resource.key] = {};
                                    }
                                )(prevState)
                                this.newState = newState;
                                return newState;
                            }
                        )
                        const processingStatus$ = new Subject<void>();
                        merge(
                            processingStatus$.pipe(mapTo<IProcessingStatus>({ status: 'PROCESSING' })),
                            merge(
                                this.reloadResource$.pipe(
                                    filter(reload => reload.id === resource.key),
                                    map(reload => reload.params)
                                ),
                                resource.params$
                            )
                                // resource.params$
                                .pipe(
                                    takeUntil(this.destroy$),
                                    tap(
                                        (params) => {
                                            this.setState(
                                                (prevState) => {
                                                    const newState = produce(
                                                        (draft: IEntityFormState) => {
                                                            draft.resourceParams[resource.key] = params;
                                                        }
                                                    )(prevState);
                                                    this.newState = newState;
                                                    return newState
                                                }
                                            )
                                            processingStatus$.next();
                                        }
                                    ),
                                    switchMap(
                                        (params) => {
                                            const data$ = resource.data$ ? resource.data$(params) : of(params);
                                            const loadData$: Observable<any> = ModuleUtils.isObservable(data$) ? data$ : (ModuleUtils.isPromise(data$) ? from(data$) : of(data$))
                                            const retryConfig: IRetryProcessing = resource.retry ? resource.retry : { interval: 1000 };
                                            return loadData$.pipe(
                                                retryProcessing(retryConfig),
                                                take(1),
                                                map(
                                                    (data): IProcessingStatus => {
                                                        return {
                                                            status: 'PROCESSED',
                                                            data
                                                        }
                                                    },
                                                ),
                                                catchError(
                                                    (error): Observable<IProcessingStatus> => {
                                                        return of({ status: 'ERROR', error })
                                                    }
                                                )
                                            )
                                        }
                                    ),
                                )
                        ).pipe(
                            takeUntil(this.destroy$),
                            tap(
                                (processingStatus: IProcessingStatus) => {

                                    resource.onProcessingStatus && resource.onProcessingStatus(processingStatus, {});
                                    this.setState(
                                        (prevState) => {
                                            const newState = produce(
                                                (draft: IEntityFormState) => {
                                                    draft.resources[resource.key].status = processingStatus.status;
                                                    draft.resources[resource.key].data = processingStatus.data;
                                                    draft.resources[resource.key].error = processingStatus.error;
                                                }
                                            )(prevState)
                                            this.newState = newState;
                                            return newState;
                                        }

                                    )
                                }
                            )
                        )
                            .subscribe()
                    }
                )
            ,
            1)

        /******************************************************************************************************* */
        const adaptLoadData = loadConfig.entity.adaptData ? loadConfig.entity.adaptData : (data: any) => ({
            initialData: data,
            resources: {}
        })

        const processingStatus$ = new Subject<void>();
        const params$ = this.props.params$ ? merge(this.props.params$, this.triggerLoad$) : this.triggerLoad$;
        merge(
            processingStatus$.pipe(mapTo<IProcessingStatus>({ status: 'PROCESSING' })),
            params$.pipe(
                takeUntil(this.destroy$),
                tap(
                    (params) => {
                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IEntityFormState) => {
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
                switchMap(
                    (params) => {
                        const loadConfig: UseFormGroupLoadProps = this.props.load ? this.props.load : {
                            entity: {}
                        };
                        const retryConfig: IRetryProcessing = loadConfig.entity.retry ? loadConfig.entity.retry : {
                            interval: 200
                        };
                        const data$ = loadConfig.entity.data$ ? loadConfig.entity.data$(params) : of(params);
                        const loadData$: Observable<any> = ModuleUtils.isObservable(data$) ? data$ : (ModuleUtils.isPromise(data$) ? from(data$) : of(data$))
                        return loadData$.pipe(
                            retryProcessing(retryConfig),
                            take(1),
                            map((data, e) => {
                                return adaptLoadData(data)
                            }),
                            map(
                                (data): IProcessingStatus => {
                                    return {
                                        status: 'PROCESSED',
                                        data
                                    }
                                },
                            ),
                            catchError(
                                (error): Observable<IProcessingStatus> => {
                                    return of({ status: 'ERROR', error })
                                }
                            )
                        )

                    }
                ),
            )
        ).pipe(
            takeUntil(this.destroy$),
            tap(
                (processingStatus: IProcessingStatus<{ initialData: PlainObject, resources: { [key: string]: PlainObjectType } }>) => {
                    loadConfig.entity.onProcessingStatus && loadConfig.entity.onProcessingStatus(processingStatus, this.newState.params);
                    if (processingStatus.status === 'PROCESSED') {
                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IEntityFormState) => {
                                        const resources = processingStatus.data!.resources;
                                        Object.keys(resources).map(
                                            key => ({ key, data: resources[key] })
                                        ).forEach((item) => {
                                            draft.resources[item.key] = {
                                                status: 'PROCESSED',
                                                data: item.data
                                            }
                                        })
                                    }
                                )(prevState)
                                this.newState = newState;
                                return newState
                            }
                        )
                    }
                    this.setState(
                        (prevState) => {
                            const newState = produce(
                                (draft: IEntityFormState) => {
                                    draft.loadStatus.status = processingStatus.status;
                                    draft.loadStatus.data = processingStatus.data?.initialData;
                                    draft.loadStatus.error = processingStatus.error;
                                }
                            )(prevState)
                            this.newState = newState;
                            return newState
                        }
                    )
                }
            )
        )
            .subscribe();
        /**************************************************************** */
    }

    private configLoad() {
        const processingStatus$ = new Subject<void>();
        this.triggerLoad$.pipe(

        )

    }

    private configSave() {
        const saveConfig = this.props.save;
        const processingStatus$ = new Subject<void>();
        merge(
            processingStatus$.pipe(mapTo<IProcessingStatus>({ status: 'PROCESSING' })),
            this.triggerSave$.pipe(
                tap(x => {
                    processingStatus$.next()
                }),
                exhaustMap(
                    (data) => {
                        const data$ = saveConfig!.saveDataFn$(data, this.newState.params);
                        const saveData$: Observable<any> = ModuleUtils.isObservable(data$) ? data$ : (ModuleUtils.isPromise(data$) ? from(data$) : of(data$))
                        return saveData$.pipe(
                            map((resp: any): IProcessingStatus => ({ status: 'PROCESSED', data: resp })),
                            catchError((error): Observable<IProcessingStatus> => of({ status: 'ERROR', error }))
                        );
                    }
                ),
            )
        ).pipe(
            tap(
                (processingStatus) => {
                    saveConfig && saveConfig.onProcessingStatus && saveConfig.onProcessingStatus(processingStatus, this.newState.params);
                    this.setState(
                        (prevState) => {
                            const newState = produce(
                                (draft: IEntityFormState) => {
                                    draft.saveStatus.status = processingStatus.status;
                                    draft.saveStatus.data = processingStatus.data;
                                    draft.saveStatus.error = processingStatus.error;
                                }
                            )(prevState)
                            this.newState = newState;
                            return newState
                        }
                    )
                }
            )
        )
            .subscribe()
    }

    close() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    submit() {
        this.setState(
            (prevState) => {
                const newState = produce(
                    (draft: IEntityFormState) => {

                        draft.submitted = true;
                    }
                )(prevState)
                this.newState = newState;
                return newState;
            }
        )
    }

    resetSubmit() {
        this.setState(
            (prevState) => {
                const newState = produce(
                    (draft: IEntityFormState) => {
                        draft.submitted = false;
                    }
                )(prevState)
                this.newState = newState;
                return newState;
            }
        )
    }

    resetForm() {
        // this.setState(
        //     (prevState) => {
        //         const newState = produce(
        //             (draft: IEntityFormState) => {
        //                 draft.data = this.newState.loadStatus.data;
        //             }
        //         )(prevState)
        //         this.newState = newState;
        //         return newState;
        //     }
        // )
    }


    get formState() {
        return this.newState;
    }
    get resources() {
        return this.newState.resources
    }
    reloadResource(resourceId: string) {
        this.reloadResource$.next({
            id: resourceId,
            params: this.newState.resourceParams[resourceId]
        })
    }


    get config(): UseFormGroupConfig {
        return {
            formState: this.formState,
            resources: this.formState?.resources,
            reloadResource: this.reloadResource,
            submit: this.submit.bind(this),
            resetSubmit: this.resetSubmit,
            resetForm: this.resetForm,
            triggerSave: this.triggerSave$.next.bind(this.triggerSave$),
            triggerLoad: this.triggerLoad$.next.bind(this.triggerLoad$),
            destroy$: this.destroy$,
            loadResource: this.loadResource$.next.bind(this.loadResource$)
        }
    }
}