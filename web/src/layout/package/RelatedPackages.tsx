import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';

import { Package } from '../../types';
import SmallTitle from '../common/SmallTitle';
import BigRelatedPackageCard from './BigRelatedPackageCard';
import RelatedPackageCard from './RelatedPackageCard';
import styles from './RelatedPackages.module.css';

interface Props {
  packages?: Package[];
  title?: JSX.Element;
  className?: string;
  in?: 'column' | 'content';
}

const RelatedPackages = (props: Props) => {
  if (isUndefined(props.packages) || props.packages.length === 0) return null;

  return (
    <div className={`mt-4 ${props.className}`} role="list" aria-describedby="related-list">
      {props.title || <SmallTitle text="Related packages" id="related-list" className={styles.title} />}
      <div className={classnames('pt-1 row g-0', { [`${styles.cardsWrapper} mb-5`]: props.in === 'content' })}>
        {props.packages.map((item: Package) => (
          <div
            key={`relatedCard_${item.packageId}`}
            className={classnames(
              { 'col-12': props.in !== 'content' },
              { 'col-12 col-xxl-6 p-0 p-xxl-2': props.in === 'content' }
            )}
          >
            {props.in === 'content' ? (
              <BigRelatedPackageCard package={item} />
            ) : (
              <RelatedPackageCard
                normalizedName={item.normalizedName}
                name={item.name}
                displayName={item.displayName}
                logoImageId={item.logoImageId}
                version={item.version!}
                repository={item.repository}
                stars={item.stars}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedPackages;
