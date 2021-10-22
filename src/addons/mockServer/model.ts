export interface MockServerConfig {
  time?: number;
  responses: {
    isError: boolean;
    ocurrence: number;
    data: () => any;
  }[];
}
