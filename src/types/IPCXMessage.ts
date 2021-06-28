type IPCXMessage = {
  source: string;
  targets: string[];
  event: string;
  payload: Object;
};

export { IPCXMessage };
