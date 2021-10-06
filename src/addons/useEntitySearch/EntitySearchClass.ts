import produce from "immer";
import { catchError, filter, forkJoin, from, map, mapTo, merge, Observable, of, Subject, switchMap, take, takeUntil, tap, zip } from "rxjs";
import { ModuleUtils } from "../../utils/lang";
import { IProcessingStatus, PlainObject, PlainObjectType } from "../useEntityForm/model";
import { AdaptLoadDataFn, IEntitySearchState, UseEntitySearchConfig, UseEntitySearchProps } from "./model";

export class EntitySearchClass<T = any>{

    destroy$ = new Subject<void>();
    reloadResource$ = new Subject<{ id: string, params: PlainObjectType | PlainObject }>();
    newState: IEntitySearchState = {
        data: [],
        loadStatus: {},
        paging: {
            page: 0,
            size: 1000,
            sort: null
        },
        params: {},
        resources: {}
    };

    constructor(private props: UseEntitySearchProps, private setState: (a: (prevState: IEntitySearchState) => IEntitySearchState) => void) {
        this.reloadResource = this.reloadResource.bind(this);
    }

    reloadResource(resourceId: string) {
    }

    init() {
        const resources = this.props.resources || {};
        Object.keys(resources)
            .map(
                key => ({ ...resources[key], key })
            ).filter(
                resource => !resource.concurrent
            ).forEach(
                (resource) => {
                    this.setState(
                        (prevState) => {
                            const newState = produce(
                                (draft: IEntitySearchState) => {
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
                            .pipe(
                                takeUntil(this.destroy$),
                                tap(
                                    (params) => {
                                        processingStatus$.next();
                                    }
                                ),
                                switchMap(
                                    (params) => {
                                        return resource.loadData$(params).pipe(
                                            // take(1),
                                            map(
                                                (data): IProcessingStatus => {
                                                    alert(2);
                                                    return {
                                                        status: 'PROCESSED',
                                                        data
                                                    }
                                                },
                                            ),
                                            catchError(
                                                (error): Observable<IProcessingStatus> => {
                                                    alert(9)
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
                            (processingStatus) => {
                                alert(1)
                                resource.onProcessingStatus && resource.onProcessingStatus(processingStatus, {});
                                this.setState(
                                    (prevState) => {
                                        const newState = produce(
                                            (draft: IEntitySearchState) => {
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


        /******************************************************************************************************* */
        /******************************************************************************************************* */
        /******************************************************************************************************* */

        const defaultAdaptLoadData: AdaptLoadDataFn = (data, resources) => ({ data, resources: {} });
        const adaptLoadData = this.props.adaptLoadData ? this.props.adaptLoadData : defaultAdaptLoadData;

        const processingStatus$ = new Subject<void>();
        merge(
            processingStatus$.pipe(mapTo<IProcessingStatus>({ status: 'PROCESSING' })),
            this.props.params$.pipe(
                takeUntil(this.destroy$),
                tap(
                    (params) => {
                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IEntitySearchState) => {
                                        draft.params = params;
                                    }
                                )(prevState)
                                this.newState = newState;
                                return newState
                            }
                        );
                        processingStatus$.next();
                    }
                ),
                switchMap(
                    (params) => {

                        const resources = this.props.resources || {};
                        const concurrentResources = Object.keys(resources).map(
                            key => ({ ...resources[key], key })
                        ).filter(resource => resource.concurrent);

                        const loadResources$ = concurrentResources
                            .map(
                                resource => {
                                    if (resource.cache) {
                                        const resourceOld = this.newState.resources[resource.key];
                                        if (resourceOld && resourceOld.status === 'PROCESSED') {
                                            return of<IProcessingStatus>({ status: 'PROCESSED', data: { key: resource.key, data: resourceOld.data } })
                                        }
                                    }
                                    return resource.loadData$(params)
                                        .pipe(
                                            map(
                                                (data): IProcessingStatus => {
                                                    return { status: 'PROCESSED', data: { key: resource.key, data } }
                                                }
                                            ),
                                            catchError(
                                                (error): Observable<IProcessingStatus> => {
                                                    return of({ status: 'PROCESSED', error: { key: resource.key, error } })
                                                }
                                            )
                                        )
                                }
                            );
                        const concurrentResources$ = (loadResources$.length ? forkJoin(loadResources$) : of<IProcessingStatus[]>([]))
                            .pipe(
                                map(
                                    (resources) => {
                                        return resources.reduce(
                                            (t: { [key: string]: IProcessingStatus }, e) => {
                                                t[e.data?.key || e.error?.key] = { status: e.status, data: e.data?.data, error: e.error?.error } as IProcessingStatus;
                                                return t;
                                            }, {}
                                        ) as { [key: string]: IProcessingStatus }

                                    }
                                )
                            )


                        const data$ = this.props.loadData$(params);
                        const loadData$ = ModuleUtils.isObservable(data$) ? data$ : (ModuleUtils.isPromise(data$) ? from(data$) : of(data$))

                        return zip(loadData$, concurrentResources$)
                            .pipe(
                                take(1),
                                map(([data, resources]) => adaptLoadData(data, resources)),
                                map(
                                    (data:
                                        {
                                            data: any;
                                            resources?: {
                                                [key: string]: PlainObject;
                                            };
                                        }
                                    ): IProcessingStatus => {
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
                (processingStatus: IProcessingStatus<{ data: PlainObject, resources: { [key: string]: PlainObjectType } }>) => {
                    this.props.onProcessingStatus && this.props.onProcessingStatus(processingStatus, {});

                    if (processingStatus.status === 'PROCESSED') {
                        this.setState(
                            (prevState) => {
                                const newState = produce(
                                    (draft: IEntitySearchState) => {
                                        const resources = processingStatus.data!.resources;
                                        Object.keys(resources || {}).map(
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
                                (draft: IEntitySearchState) => {
                                    draft.loadStatus.status = processingStatus.status;
                                    draft.loadStatus.data = processingStatus.data?.data;
                                    draft.loadStatus.error = processingStatus.error;
                                    draft.data = processingStatus.data?.data;
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
    get config(): UseEntitySearchConfig {
        return {
            searchStatus: this.newState
        }
    }
}
