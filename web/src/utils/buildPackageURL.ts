import isUndefined from 'lodash/isUndefined';
import { Package, PackageKind } from '../types';

export default (packageItem: Package): string => {
  let url = '';
  switch (packageItem.kind) {
    case PackageKind.Chart:
      url = `/package/chart/${packageItem.chartRepository?.name}/${packageItem.name}`;
      if (!isUndefined(packageItem.version)) {
        url += `/${packageItem.version}`;
      }
      break;
  }

  return  url;
}
