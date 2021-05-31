import { isString } from 'lodash';

import getMetaTag from './getMetaTag';

const SITE = 'artifact hub';

export default (): boolean => {
  let isWhiteLabel = false;
  const siteName = getMetaTag('siteName');
  if (isString(siteName)) {
    isWhiteLabel = siteName.toLowerCase() !== SITE;
  }
  return isWhiteLabel;
};
