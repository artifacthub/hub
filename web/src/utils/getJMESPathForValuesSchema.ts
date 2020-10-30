import { isUndefined } from 'lodash';

export default (value: string, currentPath?: string): string => {
  const name = value.includes('.') ? `"${value.replace(/\./gi, '\\.')}"` : value;
  return isUndefined(currentPath) ? value : `${currentPath}.${name}`;
};
