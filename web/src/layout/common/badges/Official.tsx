import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { MdStars } from 'react-icons/md';

import ExternalLink from '../ExternalLink';
import Badge from './Badge';
import styles from './Badge.module.css';

interface Props {
  official: boolean;
  className?: string;
  dropdownAlignment?: 'start' | 'end';
  noDropdown?: boolean;
  smallSize?: boolean;
}

const Official = (props: Props) => {
  const isOfficial = !isNull(props.official) && !isUndefined(props.official) && props.official;

  return (
    <Badge
      title="Official"
      bgColor="#54B435"
      icon={<MdStars />}
      active={isOfficial}
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      noDropdown={props.noDropdown}
      smallSize={props.smallSize}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom border-1 mb-3 pb-1">Official</div>

          <p>
            This package is {isOfficial ? '' : 'not'} marked as <span className="fw-bold">official</span>.
          </p>
          <p className={`mb-0 text-muted ${styles.legend}`}>
            In Artifact Hub, the <code>official</code> status means that the publisher{' '}
            <span className="fw-bold">owns the software</span> a package primarily focuses on. For more information,
            please see the{' '}
            <ExternalLink
              btnType
              className={`text-decoration-underline text-reset ${styles.btnInBadge}`}
              href="https://artifacthub.io/docs/topics/repositories/#official-status"
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

export default Official;
