export type ParameterSchema = {
  type: 'string' | 'integer' | 'number' | 'boolean';
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: readonly (string | number | boolean)[];
};
type ParameterDefinition = { name: string; required: boolean; style: string; explode: boolean; schema?: ParameterSchema };
export type RuntimeDefinition = {
  method: string;
  path: string;
  security: readonly Record<string, readonly unknown[]>[];
  pathParams: readonly ParameterDefinition[];
  queryParams: readonly ParameterDefinition[];
  headerParams: readonly ParameterDefinition[];
  bodyRequired: boolean;
  requestContentType: string | null;
  responseKind: 'json' | 'text' | 'void';
  responseEnvelope: boolean;
};
