import { useEffect, useRef, useState } from "react";
import { IEntitySearchState, UseEntitySearchConfig, UseEntitySearchProps } from "./model";
import { EntitySearchClass } from "./EntitySearchClass";

export const initialSearchState: IEntitySearchState = {
    paging:{
        page:0,
        size: 100,
        sort:null
    },
    data:[],
    loadStatus:{},
    params:{},
    resources:{}
}
export const useEntitySearch = <T = any>(props: UseEntitySearchProps): UseEntitySearchConfig => {
    const [, setState] = useState<IEntitySearchState<T>>(initialSearchState);
    const useFormGroupClassRef = useRef<EntitySearchClass>(new EntitySearchClass(props, setState));
    useEffect(
        () => {
            useFormGroupClassRef.current.init();
            return () => {
                useFormGroupClassRef.current.close();
            }
        },
        []
    )
    const useFormGroupClass = useFormGroupClassRef.current;
    return useFormGroupClass.config
}
