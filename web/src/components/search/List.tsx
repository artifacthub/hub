import React from 'react';
import orderBy from 'lodash/orderBy';
import Card from './Card';
import { Package } from '../../types';

interface Props {
  sortBy: 'asc' | 'desc';
  packages: Package[];
  searchText: string;
}

const List = (props: Props) => {
  const sortedPackages = orderBy(props.packages, ['name'], [props.sortBy]);

  return (
    <div className="row no-gutters mb-2">
      {sortedPackages.map((packageItem: Package) => (
        <Card
          key={packageItem.package_id}
          package={packageItem}
          searchText={props.searchText}
        />
      ))}
    </div>
  );
};

export default List;
