import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { MdVerified } from 'react-icons/md';

import ExternalLink from '../ExternalLink';
import Badge from './Badge';
import styles from './Badge.module.css';

interface Props {
  verifiedPublisher?: null | boolean;
  className?: string;
  dropdownAlignment?: 'start' | 'end';
  noDropdown?: boolean;
  smallSize?: boolean;
  inRepo?: boolean;
}

const VerifiedPublisher = (props: Props) => {
  const isVerified =
    !isNull(props.verifiedPublisher) && !isUndefined(props.verifiedPublisher) && props.verifiedPublisher;

  return (
    <Badge
      title="Verified publisher"
      bgColor="#2192FF"
      icon={<MdVerified />}
      active={isVerified}
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      noDropdown={props.noDropdown}
      smallSize={props.smallSize}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom border-1 mb-3 pb-1">Verified publisher</div>

          <p>
            This {!isUndefined(props.inRepo) && props.inRepo ? 'repository' : 'package'}{' '}
            {isVerified ? 'comes' : 'does not come'} from a <span className="fw-bold">verified publisher</span>.
          </p>
          <p className={`mb-0 text-muted ${styles.legend}`}>
            The <code>verified publisher</code> status indicates if the publisher of this package{' '}
            <span className="fw-italic">owns or has control</span> over the source repository. For more information,
            please see the{' '}
            <ExternalLink
              btnType
              className={`text-decoration-underline text-reset ${styles.btnInBadge}`}
              href="https://artifacthub.io/docs/topics/repositories/#verified-publisher"
            >
              repositories guide
            </ExternalLink>
            .
          </p>
        </>
      }
    />
  );
};

export default VerifiedPublisher;
