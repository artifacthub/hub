/**
 * Resolve a JSON Schema type from union options using the default value.
 * Falls back to the first option when no match is found.
 */
const resolveSchemaTypeFromDefault = (typeOptions: string[], defaultValue: unknown): string => {
  if (typeof defaultValue === 'string' && typeOptions.includes('string')) return 'string';
  if (typeof defaultValue === 'number') {
    if (Number.isInteger(defaultValue) && typeOptions.includes('integer')) return 'integer';
    if (typeOptions.includes('number')) return 'number';
  }
  if (typeof defaultValue === 'boolean' && typeOptions.includes('boolean')) return 'boolean';
  if (Array.isArray(defaultValue) && typeOptions.includes('array')) return 'array';
  if (defaultValue === null && typeOptions.includes('null')) return 'null';
  if (defaultValue !== null && typeof defaultValue === 'object' && typeOptions.includes('object')) return 'object';
  return typeOptions[0];
};

export default resolveSchemaTypeFromDefault;
