import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import API from '../api';
import { JSONSchema, JSONSchema7 } from '../jsonschema';

enum Composition {
  AnyOf = 'anyOf',
  OneOf = 'oneOf',
  AllOf = 'allOf',
}

async function getRemoteSchemaDefinition(url: string): Promise<{ [key: string]: JSONSchema }> {
  try {
    const response = JSON.parse(await API.getSchemaDef(url));
    if (response && response.definitions) {
      return response.definitions;
    } else {
      return {};
    }
  } catch {
    return {};
  }
}

const urlsInList = () => {
  const savedUrls: string[] = [];
  return (url: string) => {
    if (savedUrls.includes(url)) {
      return true;
    } else {
      savedUrls.push(url);
      return false;
    }
  };
};

const checkIfUrlInList = urlsInList();

const dereferenceJSONSchema = (schema: JSONSchema): JSONSchema => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let definitions: any = {};
  if (schema.definitions) {
    definitions = schema.definitions;
  } else if ((schema as JSONSchema7).$defs) {
    definitions = (schema as JSONSchema7).$defs;
  }

  const checkIfTermInDefinitionsList = (term: string, item: JSONSchema): JSONSchema => {
    if (definitions && definitions[term]) {
      return definitions[term] as JSONSchema;
    } else {
      return item;
    }
  };

  const derefSchema = (item: JSONSchema): JSONSchema => {
    if (item.$ref) {
      const def = item.$ref.split('/');
      const term = def[def.length - 1];
      if (!item.$ref.startsWith('#/definitions')) {
        const ref = item.$ref.split('#');
        if (!checkIfUrlInList(ref[0])) {
          const newDefs = getRemoteSchemaDefinition(ref[0]);
          definitions = { ...definitions, ...newDefs };
        }
      }
      return checkIfTermInDefinitionsList(term, item);
    }

    return item;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iterateSchema = (sch: JSONSchema): any => {
    if (!sch) return;

    let el: JSONSchema = derefSchema(sch);

    if (!isUndefined(el.properties)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: any = {};
      Object.keys(el.properties).forEach((item: string) => {
        props[item] = iterateSchema(el.properties![item] as JSONSchema);
      });
      el = { ...el, properties: props };
    }

    Object.values(Composition).forEach((comp: Composition) => {
      if (!isUndefined(el[comp])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts: any = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        el[comp]!.forEach((item: any) => {
          opts.push(iterateSchema(item as JSONSchema));
        });
        el = { ...el, [comp]: opts };
      }
    });

    if (!isUndefined(el.items)) {
      if (isArray(el.items)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        el.items.forEach((element: any) => {
          items.push(iterateSchema(element));
        });
        el = { ...el, items: items };
      } else if (isObject(el.items)) {
        el = { ...el, items: iterateSchema(el.items) } as JSONSchema;
      }
    }

    return el;
  };

  return iterateSchema(schema);
};

export default dereferenceJSONSchema;
