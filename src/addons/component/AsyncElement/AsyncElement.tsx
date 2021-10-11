import React, { FC } from "react";
import { AsyncElementProps } from "./model";

export const AsyncElement: FC<AsyncElementProps> = (props) => {
    const status = Array.isArray(props.status) ? props.status : [props.status];
    const isProcessing = status.some(item => item.status === 'PROCESSING');
    const isCompletedOk = isProcessing ? false : status.every(item => item.status === 'SUCCESS');
    const isCompletedErrors = isProcessing ? false : status.some(item => item.status === 'ERROR');
    const elementTemplate = isCompletedOk && props.renderElement(status.map(i => i.data));
    const processingTemplate = isProcessing && props.renderProcessing && props.renderProcessing();
    const errorTemplate = isCompletedErrors && props.renderError && props.renderError(status);
    return (
        <div className={props.className ? props.className : ''} style={props.style ? props.style : {}}>
            {elementTemplate}
            {processingTemplate}
            {errorTemplate}
        </div>
    )
}