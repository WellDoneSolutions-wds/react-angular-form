import produce from "immer";
import React, { PureComponent } from "react";
import { Subject } from "rxjs";
import { map, startWith, takeUntil, tap } from "rxjs/operators";
import { FormControl } from "../../..";
import { AbstractControl } from "../../../model";
import { IProcessingStatus } from "../../common/model";
import { IInputContainerProps, IInputContainerPropsData, IInputContainerPropsForm, IInputContainerPropsShowErrorsFn } from "./model";

export class InputContainer extends PureComponent<IInputContainerProps, IProcessingStatus> {
    constructor(props: any) {
        super(props);
        this.state = {
            status: 'SUCCESS'
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
                            status: 'SUCCESS',
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

    componentDidUpdate(prevProps: IInputContainerProps, prevState: IProcessingStatus) {
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
        const control = this.props.control as FormControl;
        const showErrorsFn: IInputContainerPropsShowErrorsFn = this.props.showErrorsFn ? this.props.showErrorsFn : () => true
        const form: IInputContainerPropsForm = this.props.form ? this.props.form : {};
        const formLoadStatus: IProcessingStatus = form.loadStatus ? form.loadStatus : { status: 'SUCCESS' };
        const formSubmitted = !!form.submitted;
        const showErrors = control ? showErrorsFn({ formSubmitted, control }) : false

        const data: IInputContainerPropsData = this.props.data ? this.props.data : {};
        const dataLoadStatus: IProcessingStatus = data.load ? data.load : { status: 'SUCCESS' }

        const renderLabel = this.props.renderLabel;
        const labelTemplate = renderLabel && renderLabel({
            showErrors,
            validationStatus: this.state.status!,
        });
        const renderInput = this.props.renderInput;
        const inputTemplate = control && formLoadStatus.status === 'SUCCESS' &&
            dataLoadStatus.status === 'SUCCESS' &&
            renderInput({ control, data: dataLoadStatus.data, validationStatus: this.state.status, showErrors });

        const renderProcessing = this.props.renderProcessing;
        const processingTemplate = (formLoadStatus.status === 'PROCESSING' || dataLoadStatus.status === 'PROCESSING') && renderProcessing && renderProcessing();

        const renderValidationErrors = this.props.renderValidationErrors;
        const validationErrorsTemplate = formLoadStatus.status === 'SUCCESS' &&
            dataLoadStatus.status === 'SUCCESS' &&
            showErrors &&
            renderValidationErrors && renderValidationErrors({ errors: this.state.error, formSubmitted, control })
        const renderReload = data.renderReload;
        const reloadTemplate = dataLoadStatus.status === 'ERROR' && renderReload && renderReload({ reloadFn: () => { } })

        return (
            <>
                {formLoadStatus.status !== 'ERROR' && this.props.control && (
                    <div style={this.props.style || {}} className={this.props.className || ''}>
                        {labelTemplate}
                        {inputTemplate}
                        {processingTemplate}
                        {validationErrorsTemplate}
                        {reloadTemplate}
                    </div>
                )}
                {formLoadStatus.status === 'SUCCESS' && dataLoadStatus.status === 'SUCCESS' && !this.props.control && (
                    <>Control=Null</>
                )}
            </>
        )
    }
}