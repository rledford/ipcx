type IPCXMessage = {
  src: string;
  dest: string[];
  event: string;
  data: Object;
};

export { IPCXMessage };
