import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { Package } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import ExpandableList from '../common/ExpandableList';
import RSSLinkTitle from '../common/RSSLinkTitle';
import SmallTitle from '../common/SmallTitle';
import Keywords from './Keywords';
import License from './License';
import Links from './Links';
import Maintainers from './Maintainers';
import styles from './OPAPoliciesDetails.module.css';

interface Props {
  package: Package;
  allVersions: JSX.Element[];
}

const OPAPoliciesDetails = (props: Props) => (
  <>
    <div>
      <RSSLinkTitle title="Versions" package={props.package} />
      {isUndefined(props.package.availableVersions) || props.package.availableVersions.length === 0 ? (
        <p data-testid="versions">-</p>
      ) : (
        <div className="mb-3" data-testid="versions">
          <ExpandableList items={props.allVersions} visibleItems={3} />
        </div>
      )}
    </div>

    {props.package.provider && (
      <>
        <div>
          <SmallTitle text="Provider" />
          <p className="text-truncate">{props.package.provider}</p>
        </div>
      </>
    )}

    <Links links={props.package.links} />

    <Maintainers maintainers={props.package.maintainers} />

    {props.package.license && (
      <>
        <SmallTitle text="License" />
        <License license={props.package.license} className="mb-3" />
      </>
    )}

    {props.package.containerImage && (
      <>
        <SmallTitle
          text="Container Image"
          icon={
            <div className="d-inline-block">
              <ButtonCopyToClipboard
                text={props.package.containerImage}
                className="btn-link px-2 pt-0 pb-1 text-secondary border-0 d-inline"
              />
            </div>
          }
        />
        <p className={styles.containerImage}>{props.package.containerImage}</p>
      </>
    )}

    <SmallTitle text="Keywords" />
    <Keywords keywords={props.package.keywords} deprecated={props.package.deprecated} />
  </>
);

export default OPAPoliciesDetails;
