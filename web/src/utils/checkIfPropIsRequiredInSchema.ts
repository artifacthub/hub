import { isArray, isUndefined } from 'lodash';

const checkIfPropIsRequiredInSchema = (value: string, schema?: string[] | boolean): boolean => {
  if (isUndefined(schema)) return false;
  if (isArray(schema)) {
    return schema.includes(value);
  } else {
    return schema;
  }
};

export default checkIfPropIsRequiredInSchema;
