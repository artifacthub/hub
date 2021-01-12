import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { GoLaw } from 'react-icons/go';

import ExternalLink from '../common/ExternalLink';
import styles from './License.module.css';

interface Props {
  license?: null | string;
  className?: string;
  linkClassName?: string;
  linkContentClassName?: string;
  visibleIcon?: boolean;
  btnType?: boolean;
}

// Source: https://github.com/github/choosealicense.com/tree/gh-pages/_licenses
const LICENSES_LIST: string[] = [
  '0bsd',
  'afl-3.0',
  'agpl-3.0',
  'apache-2.0',
  'artistic-2.0',
  'bsd-2-clause',
  'bsd-3-clause-clear',
  'bsd-3-clause',
  'bsd-4-clause',
  'bsl-1.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'cc0-1.0',
  'cecill-2.1',
  'ecl-2.0',
  'epl-1.0',
  'epl-2.0',
  'eupl-1.1',
  'eupl-1.2',
  'gpl-2.0',
  'gpl-3.0',
  'isc',
  'lgpl-2.1',
  'lgpl-3.0',
  'lppl-1.3c',
  'mit',
  'mpl-2.0',
  'ms-pl',
  'ms-rl',
  'ncsa',
  'odbl-1.0',
  'ofl-1.1',
  'osl-3.0',
  'postgresql',
  'unlicense',
  'upl-1.0',
  'vim',
  'wtfpl',
  'zlib',
];

const License = (props: Props) => {
  if (isUndefined(props.license) || isNull(props.license)) return null;

  return (
    <div className={props.className}>
      {LICENSES_LIST.includes(props.license.toLowerCase()) ? (
        <ExternalLink
          href={`https://choosealicense.com/licenses/${props.license.toLowerCase()}/`}
          className={props.linkClassName}
          btnType={props.btnType}
        >
          <div className="d-flex align-items-center mw-100 text-truncate">
            {props.visibleIcon && <GoLaw className="text-muted mr-2 h6 mb-0" />}
            <div className={`mw-100 text-truncate ${props.linkContentClassName}`}>{props.license}</div>
            <span
              className={classnames(styles.smallIcon, {
                [styles.alignedSmallIcon]: isUndefined(props.visibleIcon) || !props.visibleIcon,
              })}
            >
              <FiExternalLink className="ml-1" />
            </span>
          </div>
        </ExternalLink>
      ) : (
        <div className="d-flex align-items-center">
          {props.visibleIcon && <GoLaw className="text-muted mr-2 h6 mb-0" />}
          <>{props.license}</>
        </div>
      )}
    </div>
  );
};

export default License;
