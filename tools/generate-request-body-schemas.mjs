import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// Build-time synchronization only: deployed SDKs do not read YAML or Go sources.
const root = new URL('../', import.meta.url);
const source = new URL('../../xiuxian-game-server/docs/openapi.yaml', import.meta.url);
const output = new URL('src/api/request-body-schemas.ts', root);
const document = parse(readFileSync(source, 'utf8'));
const ids = new Set();
for (const domain of readdirSync(new URL('src/api/domains/', root))) {
  const text = readFileSync(new URL(`src/api/domains/${domain}/operations.ts`, root), 'utf8');
  for (const match of text.matchAll(/^  (\w+): \{$/gm)) ids.add(match[1]);
}
const annotations = new Set(['description', 'default', 'example', 'title', 'deprecated', 'readOnly', 'writeOnly']);
const keywords = new Set([
  'type', 'nullable', 'required', 'properties', 'additionalProperties', 'items', 'enum',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength',
  'minItems', 'maxItems', 'uniqueItems', 'pattern', 'format', 'oneOf', 'anyOf', 'allOf', 'not'
]);
function resolve(value, trail = []) {
  if (value === true || value === false) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request schema');
  if (value.$ref) {
    const ref = value.$ref;
    if (!ref.startsWith('#/') || trail.includes(ref)) throw new Error(`Unsupported/cyclic reference: ${ref}`);
    const target = ref.slice(2).split('/').map(key => key.replace(/~1/g, '/').replace(/~0/g, '~'))
      .reduce((parent, key) => parent?.[key], document);
    if (!target) throw new Error(`Missing reference: ${ref}`);
    return resolve(target, [...trail, ref]);
  }
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    if (annotations.has(key) || key.startsWith('x-')) return [];
    if (!keywords.has(key)) throw new Error(`Unsupported request schema keyword: ${key}`);
    if (key === 'properties') child = Object.fromEntries(Object.entries(child).map(([name, schema]) => [name, resolve(schema, trail)]));
    else if (['items', 'additionalProperties', 'not'].includes(key)) child = resolve(child, trail);
    else if (['oneOf', 'anyOf', 'allOf'].includes(key)) child = child.map(schema => resolve(schema, trail));
    return [[key, child]];
  }));
}
const schemas = {};
for (const item of Object.values(document.paths)) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
    const operation = item[method];
    if (!operation || !ids.has(operation.operationId) || !operation.requestBody) continue;
    let body = operation.requestBody;
    if (body.$ref) body = body.$ref.slice(2).split('/').reduce((parent, key) => parent?.[key], document);
    const content = Object.values(body.content ?? {});
    if (content.length !== 1 || !content[0].schema) throw new Error(`Missing/ambiguous request schema: ${operation.operationId}`);
    schemas[operation.operationId] = resolve(content[0].schema);
  }
}
const generated = `// Generated from Go docs/openapi.yaml by tools/generate-request-body-schemas.mjs.\n// Do not edit manually. Defaults and documentation do not mutate requests.\nimport type { OperationId } from './registry';\nimport type { BodySchema } from './core/request-body';\n\nexport const requestBodySchemas: Partial<Record<OperationId, BodySchema>> = ${JSON.stringify(schemas, null, 2)};\n`;
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== generated) throw new Error('Request body schemas drifted; regenerate from Go OpenAPI');
} else writeFileSync(output, generated);
console.log(`${Object.keys(schemas).length} request body schemas ${process.argv.includes('--check') ? 'verified' : 'generated'}: ${fileURLToPath(output)}`);
