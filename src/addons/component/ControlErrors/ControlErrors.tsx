import React, { FC } from "react";
import { map, startWith } from "rxjs";
import { useObservableSubscribe } from "../../..";
import { IProcessingStatus } from "../../common/model";
import { ControlErrorsProps } from "./model";

export const ControlErrors: FC<ControlErrorsProps> = (props) => {
  const { value } = useObservableSubscribe({
    obs$: props.control.statusChanges.pipe(
      startWith(props.control.status),
      map((statusType: string): IProcessingStatus => {
        if (statusType === "INVALID") {
          return {
            status: "ERROR",
            error: props.control.errors,
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
      })
    ),
  });
  const renderErrors = props.renderErrors;
  const errorTemplate =
    value.status === "ERROR" &&
    renderErrors &&
    renderErrors({
      errors: value.error,
      control: props.control,
    });
  const renderProcessing = props.renderProcessing;
  const processingTemplate =
    value.status === "PROCESSING" && renderProcessing && renderProcessing();

  return (
    <>
      {errorTemplate}
      {processingTemplate}
    </>
  );
};
