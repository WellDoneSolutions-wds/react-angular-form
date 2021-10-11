import { concatMap, delay, exhaustMap, flatMap, iif, mergeMap, of, retryWhen, switchMap, throwError } from "rxjs";
import { IRetryProcessing, ProcessingType, } from "./model";

export const getTypeOperation = (processingType: ProcessingType) => {
    switch (processingType) {
        case ProcessingType.CONCAT:
            return concatMap;
        case ProcessingType.EXHAUST:
            return exhaustMap;
        case ProcessingType.FLAT:
            return flatMap;
        case ProcessingType.MERGE:
            return mergeMap;
        case ProcessingType.SWITCH:
            return switchMap;
        default:
            return switchMap;
    }
}

export const retryProcessing = (config: IRetryProcessing) => {
    const retryPipeline = retryWhen(errors => errors.pipe(

        concatMap((e, i) =>
            iif(
                () => i > 10,
                throwError(e),
                of(e).pipe(delay(500))
            )
        )
        
    ));
    return retryPipeline;
}

