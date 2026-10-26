export type CodeSuccessResult<Code extends string, Data = undefined> = [Data] extends [undefined]
  ? {
      code: Code;
    }
  : {
      code: Code;
      data: Data;
    };

export type CodeFailureResult<Code extends string> = {
  code: Code;
  data?: undefined;
};

export type CodeResult<SuccessCode extends string, ErrorCode extends string, Data = undefined> =
  CodeSuccessResult<SuccessCode, Data> | CodeFailureResult<ErrorCode>;
