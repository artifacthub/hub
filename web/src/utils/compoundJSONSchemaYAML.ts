import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { isArray, isEmpty, isUndefined, repeat } from 'lodash';

import getJMESPathForValuesSchema from './getJMESPathForValuesSchema';

interface FormattedValuesSchema {
  yamlContent: string;
  paths: string[];
}

export default (schema: JSONSchema): FormattedValuesSchema => {
  let content: string = schema.title ? `# ${schema.title}` : '';
  let paths: string[] = [];

  const getValue = (value: JSONSchema, level: number): string => {
    if (isUndefined(value.default)) {
      return '';
    }
    switch (value.type) {
      case 'object':
        return isEmpty(value.default) ? '{}' : JSON.stringify(value.default);
      case 'array':
        return isArray(value.default)
          ? value.default.length === 0
            ? `[]`
            : `${(value.default as string[]).map((val: string) => `\n${repeat(' ', (level + 1) * 2)}- ${val}`)}`
          : '';

      case 'boolean':
      case 'bigint':
      case 'integer':
        return value.default!.toString();
      case 'string':
        const isLongText = (value.default as string).length > 40;
        if (isLongText) {
          return `|-\n\n${repeat(' ', (level + 1) * 2)}${value.default}`;
        } else {
          return (value.default as string) || `""`;
        }
      default:
        return value.default ? value.default.toString() : '';
    }
  };

  const checkProperties = (props: any, level: number, path?: string) => {
    Object.keys(props).forEach((propName: string) => {
      const currentPath = getJMESPathForValuesSchema(propName, path);
      paths.push(currentPath);
      const value = props[propName] as JSONSchema;
      if (isUndefined(value)) return;

      content += `\n${level === 0 ? '\n' : ''}${
        value.title ? `${repeat(' ', level * 2)}# ${value.title}\n` : ''
      }${repeat(' ', level * 2)}${propName}: ${getValue(value, level)}`;

      if (value.properties) {
        checkProperties(value.properties, level + 1, currentPath);
      }
    });
  };

  if (schema.properties) {
    checkProperties(schema.properties, 0);
  }

  return {
    yamlContent: content,
    paths: paths,
  };
};
