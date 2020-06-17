import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { Package } from '../../types';
import ExpandableList from '../common/ExpandableList';
import RSSLinkTitle from '../common/RSSLinkTitle';
import SmallTitle from '../common/SmallTitle';
import Keywords from './Keywords';
import License from './License';
import Links from './Links';

interface Props {
  package: Package;
  allVersions: JSX.Element[];
}

const DefaultDetails = (props: Props) => {
  return (
    <>
      <RSSLinkTitle title="Versions" package={props.package} />
      {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
        <p data-testid="versions">-</p>
      ) : (
        <div className="mb-3" data-testid="versions">
          <ExpandableList items={props.allVersions} visibleItems={3} />
        </div>
      )}

      <Links links={props.package.links} />

      <License license={props.package.license} />

      <SmallTitle text="Keywords" />
      <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
    </>
  );
};

export default DefaultDetails;
