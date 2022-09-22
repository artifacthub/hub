import { isArray, isObject, isUndefined } from 'lodash';

import API from '../api';
import { JSONSchema } from '../jsonschema';

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
  let savedUrls: string[] = [];
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
  let definitions: any = schema.definitions;

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

  const iterateSchema = (sch: JSONSchema): any => {
    if (!sch) return;

    let el: JSONSchema = derefSchema(sch);

    if (!isUndefined(el.properties)) {
      let props: any = {};
      Object.keys(el.properties).forEach((item: string) => {
        props[item] = iterateSchema(el.properties![item] as JSONSchema);
      });
      el = { ...el, properties: props };
    }

    Object.values(Composition).forEach((comp: Composition) => {
      if (!isUndefined(el[comp])) {
        let opts: any = [];
        el[comp]!.forEach((item: any) => {
          opts.push(iterateSchema(item as JSONSchema));
        });
        el = { ...el, [comp]: opts };
      }
    });

    if (!isUndefined(el.items)) {
      if (isArray(el.items)) {
        let items: any[] = [];
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
