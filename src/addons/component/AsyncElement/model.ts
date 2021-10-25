import { CSSProperties } from "react";
import { IAsyncCallExecution } from "../../..";

export interface AsyncElementProps {
  status: IAsyncCallExecution | IAsyncCallExecution[];
  renderElement: (data: any) => React.ReactFragment;
  renderProcessing?: () => React.ReactFragment;
  renderError?: (error: any) => React.ReactFragment;
  className?: string;
  style?: CSSProperties;
}
