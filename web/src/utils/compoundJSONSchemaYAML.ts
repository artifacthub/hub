import $RefParser, { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { JSONSchema4, JSONSchema6 } from 'json-schema';
import merger from 'json-schema-merge-allof';
import { isArray, isEmpty, isNull, isUndefined, repeat, trim } from 'lodash';

import getJMESPathForValuesSchema from './getJMESPathForValuesSchema';

interface FormattedValuesSchema {
  yamlContent?: string;
  paths: string[];
}

export default (schema: JSONSchema, definitions: any, savedOpts: { [key: string]: number }): FormattedValuesSchema => {
  let content: string = '';
  const title = schema.title ? `# ${schema.title}` : '';
  let paths: string[] = [];

  const getValue = (value: JSONSchema, level: number): string => {
    if (isUndefined(value.default)) {
      return '';
    }

    if (isNull(value.default)) {
      return 'null';
    }
    switch (isArray(value.type) ? value.type[0] : value.type) {
      case 'object':
        return isEmpty(value.default) ? '{}' : JSON.stringify(value.default);
      case 'array':
        return isArray(value.default)
          ? value.default.length === 0
            ? `[]`
            : `${(value.default as string[]).map((val: string) => `\n${repeat(' ', (level + 1) * 2)}- ${val}`)}`
          : '';

      case 'boolean':
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
      let value: JSONSchema | undefined = props[propName] as JSONSchema;

      const checkCombinations = (valueToCheck: JSONSchema) => {
        if (valueToCheck.allOf) {
          try {
            value = merger(valueToCheck);
          } catch {
            value = valueToCheck.allOf![savedOpts[currentPath] || 0] as JSONSchema;
          }
        } else if (valueToCheck.oneOf) {
          value = valueToCheck.oneOf[savedOpts[currentPath] || 0] as JSONSchema;
        } else if (valueToCheck.anyOf) {
          value = valueToCheck.anyOf[savedOpts[currentPath] || 0] as JSONSchema;
        }
      };

      if (isUndefined(value.$ref)) {
        checkCombinations(value);
      } else {
        const sample: JSONSchema4 | JSONSchema6 = {
          title: 'deref',
          type: 'object',
          properties: { test: value as any },
          definitions: definitions,
        };

        try {
          const formattedValue = $RefParser.dereference(sample) as any;
          if (formattedValue && formattedValue.properties && formattedValue.properties.test) {
            if (isUndefined(formattedValue.properties.test.$ref)) {
              checkCombinations(formattedValue.properties.test);
            } else {
              value = undefined;
            }
          }
        } catch (err) {
          value = undefined;
        }
      }

      if (isUndefined(value)) return;

      const defaultValue = getValue(value, level);
      content += `\n${level === 0 ? '\n' : ''}${
        value.title ? `${repeat(' ', level * 2)}# ${value.title}\n` : ''
      }${repeat(' ', level * 2)}${propName}: ${defaultValue}`;

      if (value.properties) {
        checkProperties(value.properties, level + 1, currentPath);
      }
    });
  };

  if (schema.properties) {
    checkProperties(schema.properties, 0);
  }

  return {
    yamlContent: trim(content) !== '' ? `${title}${content}` : undefined,
    paths: paths,
  };
};
