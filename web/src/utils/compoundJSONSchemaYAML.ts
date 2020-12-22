import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { isArray, isEmpty, isNull, isObject, isUndefined, repeat, set, trim } from 'lodash';

import getJMESPathForValuesSchema from './getJMESPathForValuesSchema';

interface FormattedValuesSchema {
  yamlContent?: string;
  paths: string[];
}

interface ItemValue {
  level: number;
  value?: string;
  title?: string;
  props?: { [key: string]: ItemValue };
}

const renderValueLine = (item: ItemValue, name: string): string => {
  return `\n${item.level === 0 ? '\n' : ''}${
    item.title ? `${repeat(' ', item.level * 2)}# ${item.title}\n` : ''
  }${repeat(' ', item.level * 2)}${name}: ${item.value || ''}`;
};

const isObjectUndefined = (obj: any): boolean => {
  for (const item in obj.properties) {
    if (obj.properties[item].hasOwnProperty('properties')) {
      return isObjectUndefined(obj.properties[item]);
    } else if (!isUndefined(obj.properties[item].value)) {
      return false;
    }
  }

  return true;
};

export const shouldIgnorePath = (item: any): boolean => {
  if (item.hasOwnProperty('properties')) {
    return isObjectUndefined(item);
  } else {
    return isUndefined(item.value);
  }
};

const prepareValueFile = (obj: any) => {
  let newObj = {};

  const checkOpts = (el: any, path: string) => {
    if (isObject(el)) {
      if (el.hasOwnProperty('properties')) {
        const properties = (el as any).properties;
        if (!shouldIgnorePath(el)) {
          set(newObj, path, { ...el, properties: {} });
          Object.keys(properties).forEach((item: any) => {
            const currentPath = isUndefined(path) ? `properties.${item}` : `${path}.properties.${item}`;
            checkOpts(properties[item], currentPath);
          });
        }
      } else {
        if (path && !shouldIgnorePath(el)) {
          set(newObj, path, el);
        }
      }
    }
  };

  Object.keys(obj).forEach((propName: string) => {
    checkOpts(obj[propName], propName);
  });

  return newObj;
};

const prepareContent = (content: any): string => {
  let yamlContent: string = '';
  const cleanContent = prepareValueFile(content);

  if (!isEmpty(cleanContent)) {
    const checkContent = (obj: any) => {
      Object.keys(obj).forEach((item: string) => {
        if (obj[item].value) {
          yamlContent += renderValueLine(obj[item], item);
        } else {
          if (obj[item].properties && !isEmpty(obj[item].properties)) {
            yamlContent += renderValueLine(obj[item], item);
            checkContent(obj[item].properties);
          }
        }
      });
    };

    checkContent(cleanContent);
  }

  return yamlContent;
};

export default (schema: JSONSchema, savedOpts: { [key: string]: number }): FormattedValuesSchema => {
  const title = schema.title ? `# ${schema.title}` : '';
  let paths: string[] = [];

  const getValue = (value: JSONSchema, level: number): string | undefined => {
    if (isUndefined(value.default)) {
      return undefined;
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
        return value.default ? value.default.toString() : undefined;
    }
  };

  const items = {};

  function checkProperties(props: any, level: number, pathSteps: string[] = [], path?: string) {
    Object.keys(props).forEach((propName: string) => {
      const currentSteps: string[] = [...pathSteps, propName];
      const currentPath = getJMESPathForValuesSchema(propName, path);
      paths.push(currentPath);
      let value: JSONSchema | undefined = props[propName] as JSONSchema;

      const checkCombinations = (valueToCheck: JSONSchema) => {
        if (valueToCheck.oneOf) {
          value = valueToCheck.oneOf[savedOpts[currentPath] || 0] as JSONSchema;
        } else if (valueToCheck.anyOf) {
          value = valueToCheck.anyOf[savedOpts[currentPath] || 0] as JSONSchema;
        }
      };

      if (isUndefined(value.$ref)) {
        checkCombinations(value);
      } else {
        value = undefined;
      }

      if (isUndefined(value)) return;

      const defaultValue = getValue(value, level);

      if (value.properties) {
        set(items, currentSteps, {
          level: level,
          title: value.title,
          properties: {},
        });
        checkProperties(value.properties, level + 1, [...currentSteps, 'properties'], currentPath);
      } else if (!isUndefined(defaultValue)) {
        set(items, currentSteps, {
          level: level,
          value: defaultValue,
          title: value.title,
        });
      }
    });
  }

  if (schema.properties) {
    checkProperties(schema.properties, 0);
  }

  const yamlContent = prepareContent(items);

  return {
    yamlContent: trim(yamlContent) !== '' ? `${title}${yamlContent}` : undefined,
    paths: paths,
  };
};
