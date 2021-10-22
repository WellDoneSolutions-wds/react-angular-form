import { CSSProperties } from "react";
import { IProcessingStatus } from "../../common/model";

export interface AsyncElementProps {
  status: IProcessingStatus | IProcessingStatus[];
  renderElement: (data: any) => React.ReactFragment;
  renderProcessing?: () => React.ReactFragment;
  renderError?: (error: any) => React.ReactFragment;
  className?: string;
  style?: CSSProperties;
}
