import React from 'react';
import { SearchQuery } from '../../types';
import Kinds from './Kinds';
import Repositories from './Repositories';
import styles from './Filters.module.css';

interface Props extends SearchQuery {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Filters = (props: Props) => (
  <div className={`pt-2 mt-3 ${styles.filters}`}>
    <h6 className="text-uppercase pb-2 mb-4 border-bottom">Filters</h6>

    <Kinds activePackageKinds={props.activePackageKinds} onChange={props.onChange} />

    <Repositories activeRepositories={props.activeRepositories} onChange={props.onChange} />

    <div className="mt-5">
      <div className="alert alert-light text-center">
        Filters are not available yet
      </div>
    </div>
  </div>
);

export default Filters;
