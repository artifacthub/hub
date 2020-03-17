import React from 'react';
import isUndefined from 'lodash/isUndefined';
import { Package } from '../../types';
import ExpandableList from '../common/ExpandableList';
import SmallTitle from '../common/SmallTitle';
import Keywords from './Keywords';

interface Props {
  package: Package;
  allVersions: JSX.Element[];
}

const DefaultDetails = (props: Props) => {
  return (
    <>
      <SmallTitle text="Versions" />
      {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
        <p data-testid="versions">-</p>
      ) : (
        <div className="mb-3" data-testid="versions">
          <ExpandableList items={props.allVersions} />
        </div>
      )}

      <SmallTitle text="Keywords" />
      <Keywords keywords={props.package.keywords} />
    </>
  );
}

export default DefaultDetails;
