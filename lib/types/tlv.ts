export type TLVNode = {
  tag: string;
  length: number;
  value: string;
  start: number;
  valueStart: number;
  end: number;
  label?: string;
  children?: TLVNode[];
};

export type TLVParseResult = {
  nodes: TLVNode[];
  complete: boolean;
  errors: string[];
  consumedLength: number;
};

export type CRCValidationResult = {
  present: boolean;
  expected?: string;
  calculated?: string;
  valid?: boolean;
  message: string;
};
