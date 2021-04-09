import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { isArray, isEmpty, isNull, isObject, isUndefined, repeat, set, trim } from 'lodash';

import formatStringForYAML from './formatStringForYAML';
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
  hasDecorator?: boolean;
  isArrayParent?: boolean;
}

const renderValueLine = (item: ItemValue, name: string): string => {
  let activeLevel = item.level;
  if (item.isArrayParent && (isUndefined(item.hasDecorator) || !item.hasDecorator)) {
    activeLevel = activeLevel + 1;
  }
  return `\n${activeLevel === 0 ? '\n' : ''}${
    item.title ? `${repeat(' ', activeLevel * 2)}# ${item.title}\n` : ''
  }${repeat(' ', activeLevel * 2)}${item.hasDecorator ? '- ' : ''}${name}: ${item.value || ''}`;
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
          return formatStringForYAML(value.default as string) || `""`;
        }
      default:
        return value.default ? value.default.toString() : undefined;
    }
  };

  const items = {};

  function checkProperties(props: any, level: number, isArrayParent: boolean, pathSteps: string[] = [], path?: string) {
    Object.keys(props).forEach((propName: string, index: number) => {
      let value: JSONSchema | undefined = props[propName] as JSONSchema;
      let isCurrentArrayParent = false;
      if (
        value &&
        !isNull(value.type) &&
        value.type === 'array' &&
        value.items &&
        (value.items as JSONSchema).hasOwnProperty('properties')
      ) {
        isCurrentArrayParent = true;
      }

      const currentSteps: string[] = [...pathSteps, propName];
      const currentPath = getJMESPathForValuesSchema(isCurrentArrayParent ? `${propName}[0]` : propName, path);
      paths.push(currentPath);

      const checkCombinations = (valueToCheck: JSONSchema) => {
        if (valueToCheck.oneOf) {
          value = valueToCheck.oneOf[savedOpts[currentPath] || 0] as JSONSchema;
        } else if (valueToCheck.anyOf) {
          value = valueToCheck.anyOf[savedOpts[currentPath] || 0] as JSONSchema;
        }
      };

      if (value && isUndefined(value.$ref)) {
        checkCombinations(value);
      } else {
        value = undefined;
      }

      if (isUndefined(value) || isNull(value)) return;

      const defaultValue = getValue(value, level);

      if (isCurrentArrayParent) {
        set(items, currentSteps, {
          level: level,
          title: value.title,
          properties: {},
        });
        checkProperties(
          (value.items as JSONSchema).properties!,
          level + 1,
          isCurrentArrayParent,
          [...currentSteps, 'properties'],
          currentPath
        );
      } else {
        if (value.properties) {
          set(items, currentSteps, {
            level: level,
            title: value.title,
            properties: {},
            hasDecorator: isArrayParent && index === 0,
            isArrayParent: isArrayParent,
          });
          checkProperties(
            value.properties,
            isArrayParent ? level + 2 : level + 1,
            isCurrentArrayParent,
            [...currentSteps, 'properties'],
            currentPath
          );
        } else if (!isUndefined(defaultValue)) {
          set(items, currentSteps, {
            level: level,
            value: defaultValue,
            title: value.title,
            hasDecorator: isArrayParent && index === 0,
            isArrayParent: isArrayParent,
          });
        }
      }
    });
  }

  if (schema.properties) {
    checkProperties(schema.properties, 0, false);
  }

  const yamlContent = prepareContent(items);

  return {
    yamlContent: trim(yamlContent) !== '' ? `${title}${yamlContent}` : undefined,
    paths: paths,
  };
};
