import React from 'react';

import { Package, RepositoryKind, SearchFiltersURL, Version as VersionData } from '../../types';
import DefaultDetails from './DefaultDetails';
import HelmChartDetails from './HelmChartDetails';
import OLMOperatorsDetails from './OLMOperatorsDetails';
import OPAPoliciesDetails from './OPAPoliciesDetails';
import Version from './Version';

interface Props {
  package: Package;
  activeChannel?: string | null;
  onChannelChange: (channel: string) => void;
  sortedVersions: VersionData[];
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const Details = (props: Props) => {
  const allVersions: JSX.Element[] = props.sortedVersions.map((av_version: VersionData) => (
    <Version
      key={av_version.version}
      isActive={av_version.version === props.package.version}
      {...av_version}
      packageItem={{
        ...props.package,
        version: av_version.version,
      }}
      searchUrlReferer={props.searchUrlReferer}
      fromStarredPage={props.fromStarredPage}
    />
  ));

  return (
    <>
      {(() => {
        switch (props.package.repository.kind) {
          case RepositoryKind.Helm:
            return <HelmChartDetails package={props.package} allVersions={allVersions} />;

          case RepositoryKind.Falco:
            return <DefaultDetails package={props.package} allVersions={allVersions} />;

          case RepositoryKind.OPA:
            return <OPAPoliciesDetails package={props.package} allVersions={allVersions} />;

          case RepositoryKind.OLM:
            return (
              <OLMOperatorsDetails
                package={props.package}
                allVersions={allVersions}
                activeChannel={props.activeChannel}
                onChannelChange={props.onChannelChange}
              />
            );

          default:
            return null;
        }
      })()}
    </>
  );
};

export default Details;
