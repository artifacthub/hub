import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import has from 'lodash/has';
import forEach from 'lodash/forEach';

interface Keys {
  [key: string]: string;
}

export default (obj: any, keys: Keys): any => {
  forEach(Object.keys(keys), (key: string) => {
    if (has(obj, key)) {
      set(obj, keys[key], get(obj, key));
      unset(obj, key);
    }
  });
  return obj;
}
