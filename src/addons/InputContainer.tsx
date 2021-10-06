import produce from "immer";
import React, { CSSProperties, PureComponent } from "react";
import { Subject } from "rxjs";
import { startWith, takeUntil, map, tap } from "rxjs/operators";
import { AbstractControl, FormArray, FormControl, FormGroup } from "../model";
import { EnumStatusType, IInputContainerRenderInputParams, IProcessingStatus } from "./useEntityForm/model";
import { IEntityFormState } from "../addons/useEntityForm/model";
export type LabelTemplateType = (params: { showErrors: boolean, validationStatus: EnumStatusType, label: string }) => any;

interface IInputContainerPureProps<T = any> {
    // form: {
    //     submitted?: boolean,
    //     loadStatus: IProcessingStatus<T>,
    // },
    formState: IEntityFormState,
    control: FormControl | FormGroup | FormArray,
    renderInput: (params: IInputContainerRenderInputParams) => any,
    dataProcessingStatus?: IProcessingStatus<T>,
    showErrorsFn?: (params: { form: { submitted: boolean }, input: { touched: boolean, dirty: boolean } }) => boolean;
    processingTemplate?: () => any;
    labelTemplate?: LabelTemplateType;
    errorsTemplate?: (params: { errors: any, form: { submitted: boolean }, input: { touched: boolean, dirty: boolean } }) => any
    reloadTemplate?: (params: { reloadFn: any }) => any;
    label: string;
    style?: CSSProperties,
    className?: string
}

interface IProcessingStatusShowErrorParams {
    form: { submitted: boolean },
    input: {
        touched: boolean,
        dirty: boolean
    }
}

export class InputContainer extends PureComponent<IInputContainerPureProps, IProcessingStatus> {
    constructor(props: any) {
        super(props);
        this.state = {
            status: 'PROCESSED'
        }
        this.initializeControl.bind(this);
    }

    destroy$: Subject<void> = new Subject<void>();
    componentDidMount() {
        const control = this.props.control;
        control && this.initializeControl(control)
    }


    initializeControl(control: AbstractControl) {
        control.statusChanges
            .pipe(
                takeUntil(this.destroy$),
                startWith(control.status),
                map(
                    (statusType: string): IProcessingStatus => {
                        if (statusType === 'INVALID') { // INVALID, PENDING, DISABLED,  VALID
                            return {
                                status: 'ERROR',
                                error: control.errors
                            }
                        } else if (statusType === 'PENDING') {
                            return {
                                status: 'PROCESSING',
                                data: {}
                            }
                        }
                        return {
                            status: 'PROCESSED',
                            data: {}
                        }
                    }
                ),
                tap(
                    (status: IProcessingStatus) => {
                        this.setState(
                            produce(
                                (draft: IProcessingStatus) => {
                                    draft.data = status.data;
                                    draft.error = status.error;
                                    draft.status = status.status;
                                }
                            )
                        );
                    }
                )
            )
            .subscribe()
    }

    componentDidUpdate(prevProps: IInputContainerPureProps, prevState: IProcessingStatus) {
        let newControl = this.props.control;
        if (newControl && prevProps.control !== newControl) {
            this.initializeControl(newControl);
        }
    }

    componentWillUnmount() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    render() {
        const form: { loadStatus: IProcessingStatus, submitted?: boolean } = this.props.formState ? this.props.formState : { submitted: true, loadStatus: { status: 'PROCESSED' } };
        const dataProcessingStatus = this.props.dataProcessingStatus || { status: 'PROCESSED' }
        const renderInput = this.props.renderInput;
        const control = this.props.control as FormControl;
        const data = dataProcessingStatus.data;
        const processingTemplate = this.props.processingTemplate;
        const showErrorsFn = this.props.showErrorsFn ? this.props.showErrorsFn : (params: IProcessingStatusShowErrorParams) => {
            return true
        };
        const showErrors = showErrorsFn({ form: { submitted: this.props.formState.submitted }, input: { dirty: control?.dirty || false, touched: control?.touched || false } })

        const errorsTemplate = this.props.errorsTemplate;
        const labelTemplate = this.props.labelTemplate;
        const reloadTemplate = this.props.reloadTemplate;
        return (
            <>
                <div style={this.props.style || {}} className={this.props.className || ''}>
                    {form.loadStatus.status !== 'ERROR' && (<React.Fragment>
                        {labelTemplate && labelTemplate({ showErrors, validationStatus: this.state.status!, label: this.props.label })}
                        {form.loadStatus.status === 'PROCESSED' && dataProcessingStatus.status === 'PROCESSED' && renderInput({ control, data, validationStatus: this.state.status, showErrors })}
                        {(form.loadStatus.status === 'PROCESSING' || dataProcessingStatus.status === 'PROCESSING') && processingTemplate && processingTemplate()}
                        {form.loadStatus.status === 'PROCESSED' && dataProcessingStatus.status === 'PROCESSED' && showErrors && errorsTemplate && errorsTemplate({ errors: this.state.error, form: { submitted: !!form.submitted }, input: { touched: control.touched, dirty: control.dirty } })}
                        {dataProcessingStatus.status === 'ERROR' && reloadTemplate && reloadTemplate({ reloadFn: () => { } })}
                    </React.Fragment>
                    )}
                </div>
            </>
        )
    }
}