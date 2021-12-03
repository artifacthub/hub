import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { GiEnvelope } from 'react-icons/gi';

import { Maintainer } from '../../types';
import ExternalLink from '../common/ExternalLink';
import SmallTitle from '../common/SmallTitle';
import styles from './Maintainers.module.css';

interface Props {
  maintainers?: Maintainer[] | null;
}

const Maintainers = (props: Props) => {
  if (isUndefined(props.maintainers) || isNull(props.maintainers) || props.maintainers.length === 0) return null;
  return (
    <>
      <SmallTitle text="Maintainers" />
      <div data-testid="maintainers" className="mb-3">
        {props.maintainers.map((maintainer: Maintainer) => (
          <div className="mb-1" key={maintainer.email}>
            <ExternalLink
              href={`mailto:${maintainer.email}`}
              className="py-1 py-sm-0 text-primary"
              label={`Mail to: ${maintainer.email}`}
            >
              <div className="d-flex align-items-center">
                <GiEnvelope className="text-muted me-2 h6 mb-0" />
                <div className={`text-truncate ${styles.linkText}`}>{maintainer.name || maintainer.email}</div>
              </div>
            </ExternalLink>
          </div>
        ))}
      </div>
    </>
  );
};

export default Maintainers;
