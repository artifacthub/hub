import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { GoPackage } from 'react-icons/go';

import { Dependency } from '../../types';
import ExpandableList from '../common/ExpandableList';
import SmallTitle from '../common/SmallTitle';
import styles from './Dependencies.module.css';

interface Props {
  dependencies?: Dependency[];
  packageId: string;
}

const Dependencies = (props: Props) => {
  if (isUndefined(props.dependencies)) return null;

  const allDependencies = props.dependencies.map((dependency: Dependency, index: number) => (
    <div key={`dependency_${index}`} className={`${styles.dependency} text-truncate pb-1`} data-testid="dependencyItem">
      <GoPackage className="text-muted mr-2 mb-0" />
      {dependency.name}
      <span className={styles.separator}>@</span>
      {dependency.version}
    </div>
  ));

  return (
    <div className="mb-3">
      <SmallTitle text="Dependencies" />
      <ExpandableList items={allDependencies} visibleItems={5} resetStatusOnChange={props.packageId} />
    </div>
  );
};

export default React.memo(Dependencies);
