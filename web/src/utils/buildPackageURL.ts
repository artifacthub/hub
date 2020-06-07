import isUndefined from 'lodash/isUndefined';

import { Package, PackageKind } from '../types';

export default (packageItem: Package, withVersion?: boolean): string => {
  let url = '';
  switch (packageItem.kind) {
    case PackageKind.Chart:
      url = `/packages/chart/${packageItem.chartRepository?.name}/${packageItem.normalizedName}`;
      break;
    case PackageKind.Falco:
      url = `/packages/falco/${packageItem.normalizedName}`;
      break;
    case PackageKind.Opa:
      url = `/packages/opa/${packageItem.normalizedName}`;
      break;
  }

  if (!isUndefined(packageItem.version) && !isUndefined(withVersion) && withVersion) {
    url += `/${packageItem.version}`;
  }

  return url;
};
