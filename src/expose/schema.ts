import { ExposeError, type ExposeValueSchema } from 'alemonjs';

export const text: ExposeValueSchema = { type: 'string' };
export const number: ExposeValueSchema = { type: 'number' };
export const integer: ExposeValueSchema = { type: 'integer' };
export const boolean: ExposeValueSchema = { type: 'boolean' };
export const page: ExposeValueSchema = { type: 'integer', minimum: 1, maximum: 2147483647 };
export const list = (items: ExposeValueSchema): ExposeValueSchema => ({ type: 'array', items });
export const object = (properties: Record<string, ExposeValueSchema>, optional: string[] = []): ExposeValueSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties).filter(key => !optional.includes(key)),
  additionalProperties: false
});
export const fields = (schema: ExposeValueSchema, names: string): Record<string, ExposeValueSchema> => Object.fromEntries(names.split(' ').map(name => [name, schema]));

/** Only contract fields leave the bot. Optional null/undefined means unavailable; no invented zero or empty value. */
export function project(schema: ExposeValueSchema, value: unknown): unknown {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ExposeError('INVALID_OUTPUT', '查询对象响应不完整');
    }
    const row = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(schema.properties)) {
      if (row[key] === undefined || row[key] === null) {
        if (schema.required?.includes(key)) {
          throw new ExposeError('INVALID_OUTPUT', '查询必填字段缺失');
        }
      } else {
        result[key] = project(child, row[key]);
      }
    }

    return result;
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      throw new ExposeError('INVALID_OUTPUT', '查询列表响应不完整');
    }

    return value.map(item => project(schema.items, item));
  }

  return value;
}
