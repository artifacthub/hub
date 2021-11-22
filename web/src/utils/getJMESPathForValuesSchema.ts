import { isUndefined } from 'lodash';

const formatPathWithDots = (value: string): string => {
  return `"${value.replace(/\./g, '\\.')}"`;
};

const getJMESPathForValuesSchema = (value: string, currentPath?: string): string => {
  const name = value.includes('.') ? formatPathWithDots(value) : value;
  return isUndefined(currentPath) ? value : `${currentPath}.${name}`;
};

export default getJMESPathForValuesSchema;
