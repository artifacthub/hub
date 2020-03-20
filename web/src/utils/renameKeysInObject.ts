import forEach from 'lodash/forEach';
import get from 'lodash/get';
import has from 'lodash/has';
import set from 'lodash/set';
import unset from 'lodash/unset';

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
};
