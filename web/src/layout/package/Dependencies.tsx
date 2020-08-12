import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { GoPackage } from 'react-icons/go';

import { Dependency } from '../../types';
import SmallTitle from '../common/SmallTitle';
import styles from './Dependencies.module.css';

interface Props {
  dependencies?: Dependency[];
}

const Dependencies = (props: Props) => {
  if (isUndefined(props.dependencies)) return null;

  return (
    <div className="mb-3">
      <SmallTitle text="Dependencies" />
      {props.dependencies.map((dependency: Dependency, index: number) => (
        <div key={`dependency_${index}`} className={`${styles.dependency} pb-1`}>
          <GoPackage className="text-muted mr-2 mb-0" />
          {dependency.name}
          <span className={styles.separator}>@</span>
          {dependency.version}
        </div>
      ))}
    </div>
  );
};

export default Dependencies;
