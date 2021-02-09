import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';

import { API } from '../../api';
import { Package } from '../../types';
import SmallTitle from '../common/SmallTitle';
import RelatedPackageCard from './RelatedPackageCard';

interface Props {
  name: string;
  packageId: string;
  keywords?: string[];
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
        if (!isNull(searchResults.data.packages)) {
          filteredPackages = searchResults.data.packages
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
    <div className="mt-4 w-100">
      <SmallTitle text="Related packages" />
      <div className="pt-1">
        {packages.map((item: Package) => (
          <div key={`reltedCard_${item.packageId}`}>
            <RelatedPackageCard
              normalizedName={item.normalizedName}
              name={item.name}
              displayName={item.displayName}
              logoImageId={item.logoImageId}
              version={item.version!}
              repository={item.repository}
              stars={item.stars}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedPackages;
