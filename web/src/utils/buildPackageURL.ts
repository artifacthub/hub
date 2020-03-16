import isUndefined from 'lodash/isUndefined';
import { Package, PackageKind } from '../types';

export default (packageItem: Package, withVersion?: boolean): string => {
  let url = '';
  switch (packageItem.kind) {
    case PackageKind.Chart:
      url = `/package/chart/${packageItem.chartRepository?.name}/${packageItem.normalizedName}`;
      if (!isUndefined(packageItem.version) && !isUndefined(withVersion) && withVersion) {
        url += `/${packageItem.version}`;
      }
      break;
    case PackageKind.Falco:
    case PackageKind.Opa:
      url = `/package/${packageItem.normalizedName}`;
      if (!isUndefined(packageItem.version) && !isUndefined(withVersion) && withVersion) {
        url += `/${packageItem.version}`;
      }
      break;
  }

  return  url;
}
