import React from 'react';
import * as semver from 'semver';
import isUndefined from 'lodash/isUndefined';
import { Package, SearchFiltersURL, PackageKind } from '../../types';
import Version from './Version';
import ChartDetails from './ChartDetails';
import DefaultDetails from './DefaultDetails';

interface Props {
  package: Package;
  searchUrlReferer: SearchFiltersURL | null;
}

const Details = (props: Props) => {
  const { availableVersions } = props.package;
  const getSortedVersions = () => {
    if (!isUndefined(availableVersions)) {
      const validVersions = availableVersions.filter((version: string) => semver.valid(version));
      const invalidVersions = availableVersions.filter((version: string) =>  !semver.valid(version));
      try {
        return [...semver.rsort(validVersions), ...invalidVersions];
      } catch {
        return availableVersions;
      }
    }
    return [];
  }

  const allVersions: JSX.Element[] = getSortedVersions().map((av_version: string) => (
    <Version
      key={av_version}
      isActive={av_version === props.package.version}
      version={av_version}
      packageItem={{
        ...props.package,
        version: av_version,
      }}
      searchUrlReferer={props.searchUrlReferer}
    />
  ));

  return (
    <>
      {(() => {
        switch (props.package.kind) {
          case PackageKind.Chart:
            return (
              <ChartDetails package={props.package} allVersions={allVersions} />
            );

          case PackageKind.Falco:
          case PackageKind.Opa:
            return (
              <DefaultDetails package={props.package} allVersions={allVersions} />
            );

          default:
            return null;
        }
      })()}
    </>
  );
}

export default Details;
