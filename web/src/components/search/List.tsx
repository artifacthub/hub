import React from 'react';
import Card from './Card';
import { Package } from '../../types';

interface Props {
  packages: Package[];
  searchText?: string;
  pageNumber: string;
  filtersQuery: string;
  saveScrollPosition: () => void;
}

const List = (props: Props) => (
  <div className="row no-gutters mb-2">
    {props.packages.map((packageItem: Package) => (
      <Card
        key={packageItem.package_id}
        package={packageItem}
        searchText={props.searchText}
        pageNumber={props.pageNumber}
        filtersQuery={props.filtersQuery}
        saveScrollPosition={props.saveScrollPosition}
      />
    ))}
  </div>
);

export default List;
