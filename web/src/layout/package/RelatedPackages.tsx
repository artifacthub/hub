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
        const searchResults = await API.searchPackages({
          text: Array.from(new Set(words)).join(' or '),
          filters: {},
          deprecated: false,
          limit: 9,
          offset: 0,
        });
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

      <div className="mt-3">
        {packages.map((item: Package) => (
          <div key={`reltedCard_${item.packageId}`}>
            <RelatedPackageCard package={item} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedPackages;
