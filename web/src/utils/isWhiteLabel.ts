import isString from 'lodash/isString';

import getMetaTag from './getMetaTag';

const SITE = 'artifact hub';

const isWhiteLabel = (): boolean => {
  let isSiteWhiteLabel = false;
  const siteName = getMetaTag('siteName');
  if (isString(siteName)) {
    isSiteWhiteLabel = siteName.toLowerCase() !== SITE;
  }
  return isSiteWhiteLabel;
};

export default isWhiteLabel;
