import React from 'react';
import * as semver from 'semver';
import { useLocation } from 'react-router-dom';
import ExpandableList from '../common/ExpandableList';
import Version from './Version';

interface Props {
  package_id: string;
  version: string
  available_versions: string[];
}

const Versions = (props: Props) => {
  const location = useLocation();
  const searchText = location.state ? location.state.searchText : undefined;

  const sortedVersions = props.available_versions.sort((version1: string, version2: string) => {
    try {
      return semver.compareBuild(version1, version2);
    } catch {
      // If semver is invalid, we don't sort the versions
      return 0;
    }
  });

  const allVersions = sortedVersions.map((av_version: string) => (
    <Version
      key={av_version}
      isActive={av_version === props.version}
      version={av_version}
      packageId={props.package_id}
      searchText={searchText}
    />
  ));

  return <div className="mb-3"><ExpandableList items={allVersions} /></div>;
};

export default Versions;
