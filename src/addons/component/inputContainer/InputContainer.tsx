import produce from "immer";
import React, { PureComponent } from "react";
import { Subject } from "rxjs";
import { map, startWith, takeUntil, tap } from "rxjs/operators";
import { FormControl } from "../../..";
import { AbstractControl } from "../../../model";
import { EnumStatusType, IProcessingStatus } from "../../common/model";
import {
  IInputContainerProps,
  IInputContainerPropsData,
  IInputContainerPropsShowErrorsFn,
} from "./model";

export class InputContainer extends PureComponent<
  IInputContainerProps,
  IProcessingStatus
> {
  constructor(props: any) {
    super(props);
    this.state = {
      status: "SUCCESS",
    };
    this.initializeControl.bind(this);
  }

  destroy$: Subject<void> = new Subject<void>();
  componentDidMount() {
    const control = this.props.control;
    control && this.initializeControl(control);
  }

  initializeControl(control: AbstractControl) {
    control.statusChanges
      .pipe(
        takeUntil(this.destroy$),
        startWith(control.status),
        map((statusType: string): IProcessingStatus => {
          if (statusType === "INVALID") {
            return {
              status: "ERROR",
              error: control.errors,
            };
          } else if (statusType === "PENDING") {
            return {
              status: "PROCESSING",
              data: {},
            };
          }
          return {
            status: "SUCCESS",
            data: {},
          };
        }),
        tap((status: IProcessingStatus) => {
          this.setState(
            produce((draft: IProcessingStatus) => {
              draft.data = status.data;
              draft.error = status.error;
              draft.status = status.status;
            })
          );
        })
      )
      .subscribe();
  }

  componentDidUpdate(prevProps: IInputContainerProps) {
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
    const showErrorsFn: IInputContainerPropsShowErrorsFn = this.props
      .showErrorsFn
      ? this.props.showErrorsFn
      : () => true;
    const formLoadStatus: EnumStatusType = this.props.formLoadStatus
      ? this.props.formLoadStatus
      : "SUCCESS";
    const showErrors = control ? showErrorsFn(control) : false;
    const data: IInputContainerPropsData = this.props.data
      ? this.props.data
      : {};
    const dataLoadStatus: IProcessingStatus = data.load
      ? data.load
      : { status: "SUCCESS" };
    const renderLabel = this.props.renderLabel;
    const labelTemplate =
      renderLabel &&
      renderLabel({
        showErrors,
        validationStatus: this.state.status!,
      });
    const renderInput = this.props.renderInput;
    const inputTemplate =
      control &&
      formLoadStatus === "SUCCESS" &&
      dataLoadStatus.status === "SUCCESS" &&
      renderInput({
        control,
        data: dataLoadStatus.data,
        validationStatus: this.state.status,
        showErrors,
      });

    const renderProcessing = this.props.renderProcessing;
    const processingTemplate =
      (formLoadStatus === "PROCESSING" ||
        dataLoadStatus.status === "PROCESSING") &&
      renderProcessing &&
      renderProcessing();

    const renderValidationErrors = this.props.renderValidationErrors;
    const validationErrorsTemplate =
      control &&
      formLoadStatus === "SUCCESS" &&
      dataLoadStatus.status === "SUCCESS" &&
      showErrors &&
      renderValidationErrors &&
      renderValidationErrors({ errors: this.state.error, control });
    const renderReload = data.renderReload;
    const reloadTemplate =
      dataLoadStatus.status === "ERROR" &&
      renderReload &&
      renderReload(dataLoadStatus.error);

    return (
      <>
        {formLoadStatus !== "ERROR" && (
          <>
            {labelTemplate}
            {inputTemplate}
            {processingTemplate}
            {validationErrorsTemplate}
            {reloadTemplate}
          </>
        )}
        {formLoadStatus === "SUCCESS" &&
          dataLoadStatus.status === "SUCCESS" &&
          !this.props.control && <></>}
      </>
    );
  }
}
