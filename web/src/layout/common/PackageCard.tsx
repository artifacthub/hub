import isUndefined from 'lodash/isUndefined';
import { Link } from 'react-router-dom';

import { Package, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import styles from './PackageCard.module.css';
import PackageInfo from './PackageInfo';

interface Props {
  package: Package;
  className?: string;
  saveScrollPosition?: () => void;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const PackageCard = (props: Props) => (
  <div className={`col-12 col-xxl-6 py-sm-3 py-2 ${styles.cardWrapper}`} role="listitem">
    <div className={`card cardWithHover h-100 mw-100 bg-white ${styles.card} ${props.className}`}>
      <Link
        className={`text-decoration-none text-reset h-100 bg-transparent ${styles.link}`}
        onClick={() => {
          if (!isUndefined(props.saveScrollPosition)) {
            props.saveScrollPosition();
          }
        }}
        to={{
          pathname: buildPackageURL(props.package.normalizedName, props.package.repository, props.package.version!),
          state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
        }}
      >
        <div className={`card-body d-flex flex-column h-100 ${styles.body}`}>
          <PackageInfo package={props.package} breakpointForInfoSection="lg" />
        </div>
      </Link>
    </div>
  </div>
);

export default PackageCard;
