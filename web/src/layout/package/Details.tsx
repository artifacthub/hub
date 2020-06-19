import { isNull } from 'lodash';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import * as semver from 'semver';

import { Package, RepositoryKind, SearchFiltersURL, Version as VersionData } from '../../types';
import ChartDetails from './ChartDetails';
import DefaultDetails from './DefaultDetails';
import Version from './Version';

interface Props {
  package: Package;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const Details = (props: Props) => {
  const { availableVersions } = props.package;
  const getSortedVersions = (): VersionData[] => {
    if (!isUndefined(availableVersions) && !isNull(availableVersions)) {
      const validVersions: VersionData[] = availableVersions.filter((version: VersionData) =>
        semver.valid(version.version)
      );
      const invalidVersions: VersionData[] = availableVersions.filter(
        (version: VersionData) => !semver.valid(version.version)
      );
      try {
        const sortedValidVersions = validVersions.sort((a, b) => (semver.lt(a.version, b.version) ? 1 : -1));
        return [...sortedValidVersions, ...invalidVersions];
      } catch {
        return availableVersions;
      }
    }
    return [];
  };

  const allVersions: JSX.Element[] = getSortedVersions().map((av_version: VersionData) => (
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
            return <ChartDetails package={props.package} allVersions={allVersions} />;

          case RepositoryKind.Falco:
          case RepositoryKind.OPA:
            return <DefaultDetails package={props.package} allVersions={allVersions} />;

          default:
            return null;
        }
      })()}
    </>
  );
};

export default Details;
