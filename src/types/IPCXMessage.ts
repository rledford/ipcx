type IPCXMessage = {
  pid: number;
  dest: string[];
  event: string;
  data: Object;
};

export { IPCXMessage };
