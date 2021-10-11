import React, { CSSProperties } from "react";
import { FormControl } from "../../..";
import { AbstractControl } from "../../../model";
import { EnumStatusType, IProcessingStatus } from "../../common/model";

export interface IInputContainerRenderInputParams {
    control: FormControl,
    data: any,
    validationStatus: EnumStatusType,
    showErrors: boolean,
}
export interface IInputContainerPropsForm {
    loadStatus?: IProcessingStatus,
    submitted?: boolean
}

export type IInputContainerPropsRenderLabelParams = { showErrors: boolean, validationStatus: EnumStatusType };
export type IInputContainerPropsRenderLabel = (params: IInputContainerPropsRenderLabelParams) => React.ReactFragment;
export type IInputContainerPropsRenderInput = (params: IInputContainerRenderInputParams) => React.ReactFragment;
export type IInputContainerPropsRenderProcessing = () => React.ReactFragment;
export type IInputContainerPropsRenderValidationErrors = (params: { errors: any, formSubmitted: boolean, control: AbstractControl }) => React.ReactFragment;
export type IInputContainerPropsRenderReload = (params: { reloadFn: any }) => any;
export type IInputContainerPropsShowErrorsFn = (params: { formSubmitted: boolean, control: AbstractControl }) => boolean;

export type IInputContainerPropsData = {
    load?: IProcessingStatus,
    renderReload?: IInputContainerPropsRenderReload;
}
export interface IInputContainerProps<T = any> {
    form?: IInputContainerPropsForm,
    control: AbstractControl,
    data?: IInputContainerPropsData,
    style?: CSSProperties,
    className?: string
    renderInput: IInputContainerPropsRenderInput,
    renderProcessing?: IInputContainerPropsRenderProcessing;
    renderLabel?: IInputContainerPropsRenderLabel;
    renderValidationErrors?: IInputContainerPropsRenderValidationErrors;
    showErrorsFn?: IInputContainerPropsShowErrorsFn,

}

export interface IProcessingStatusShowErrorParams {
    form: { submitted: boolean },
    control: AbstractControl
}
