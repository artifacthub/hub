import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';

import API from '../../api';
import { Package } from '../../types';
import SmallTitle from '../common/SmallTitle';
import BigRelatedPackageCard from './BigRelatedPackageCard';
import RelatedPackageCard from './RelatedPackageCard';
import styles from './RelatedPackages.module.css';

interface Props {
  name: string;
  packageId: string;
  keywords?: string[];
  title?: JSX.Element;
  className?: string;
  in?: 'column' | 'content';
}

const RelatedPackages = (props: Props) => {
  const [packages, setPackages] = useState<Package[] | undefined>(undefined);

  useEffect(() => {
    async function fetchRelatedPackages() {
      try {
        let name = props.name.split('-');
        let words = [...name];
        if (!isUndefined(props.keywords) && props.keywords.length > 0) {
          words = [...name, ...props.keywords];
        }
        const searchResults = await API.searchPackages(
          {
            tsQueryWeb: Array.from(new Set(words)).join(' or '),
            filters: {},
            limit: 9,
            offset: 0,
          },
          false
        );
        let filteredPackages: Package[] = [];
        if (!isNull(searchResults.packages)) {
          filteredPackages = searchResults.packages
            .filter((item: Package) => item.packageId !== props.packageId)
            .slice(0, 8); // Only first 8 packages
        }
        setPackages(filteredPackages);
      } catch {
        setPackages([]);
      }
    }
    fetchRelatedPackages();
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isUndefined(packages) || packages.length === 0) return null;

  return (
    <div className={`mt-4 w-100 ${props.className}`} role="list" aria-describedby="related-list">
      {props.title || <SmallTitle text="Related packages" id="related-list" className={styles.title} />}
      <div className={classnames('pt-1 row no-gutters', { [`${styles.cardsWrapper} mb-5`]: props.in === 'content' })}>
        {packages.map((item: Package) => (
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
