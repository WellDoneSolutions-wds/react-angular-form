import { useEffect, useRef, useState } from "react";
import { IEntityFormState, UseFormGroupConfig, UseFormGroupProps } from "./model";
import { EntityFormClass } from "./EntityFormClass";

export const initialStateEntityForm: IEntityFormState = {
    submitted: false,
    loadStatus: {},
    params:{},
    saveStatus: { },
    resources: {},
    resourceParams: {}
}
export const useEntityForm = <T = any>(props: UseFormGroupProps): UseFormGroupConfig => {
    const [, setState] = useState<IEntityFormState<T>>(initialStateEntityForm);
    const useFormGroupClassRef = useRef<EntityFormClass>(new EntityFormClass(props, setState));
    useEffect(
        () => {
            useFormGroupClassRef.current.init();
            return () => useFormGroupClassRef.current.close();
        },
        []
    )
    const useFormGroupClass = useFormGroupClassRef.current;
    return useFormGroupClass.config
}