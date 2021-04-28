import { isNull, isUndefined, some } from 'lodash';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import APIMethods from '../api';
import { PackageSummary } from '../types';
import Loading from './common/Loading';
import Widget from './Widget';

interface Props {
  url?: string;
  loading: boolean;
  header: boolean;
  theme?: string;
  color?: string;
  responsive: boolean;
  width?: string;
}

interface WrapperProps {
  mainColor?: string;
  width?: string;
  className: string;
}

const Wrapper = styled.div<WrapperProps>`
  --color-ah-primary: ${(props) => props.mainColor};
  position: relative;
  max-width: 100%;

  &.fixedWidth {
    width: ${(p: WrapperProps) => p.width};
  }

  & *,
  & *:after,
  & *:before {
    box-sizing: border-box;
  }
`;

const List = styled('div')`
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
`;

const DEFAULT_COLOR = '#659dbd';

const hasBadges = (packages: PackageSummary[] | null): boolean => {
  if (packages) {
    return some(
      packages,
      (pkg: PackageSummary) => pkg.official || pkg.repository.official || pkg.repository.verifiedPublisher
    );
  }

  return false;
};

const Group = (props: Props) => {
  const visibleLoading = props.loading;
  const urlParams = props.url ? new URL(props.url) : undefined;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [packagesList, setPackagesList] = useState<PackageSummary[] | undefined | null>();
  const [pkgsWithBadges, setPkgsWithBadges] = useState<boolean>(false);
  const fixedWidthValue = props.width ? `${props.width}px` : undefined;

  const getMainColor = (): string => {
    let mainColor = DEFAULT_COLOR;
    if (props.color && props.color !== DEFAULT_COLOR) {
      const isValidColor = /^#[0-9A-F]{6}$/i.test(props.color);
      if (isValidColor) {
        mainColor = props.color;
      }
    } else {
      if (props.theme === 'dark') {
        mainColor = '#131216';
      }
    }
    return mainColor;
  };

  useEffect(() => {
    async function fetchPackagesList() {
      if (props.url && urlParams) {
        try {
          if (visibleLoading) {
            setIsLoading(true);
          }
          const results = await APIMethods.searchPackages(urlParams.origin, urlParams.search);
          setPackagesList(results.data.packages);
          setPkgsWithBadges(hasBadges(results.data.packages));
          setIsLoading(false);
        } catch {
          setIsLoading(false);
          setPackagesList(null);
        }
      } else {
        setPackagesList(null);
      }
    }
    if (!isUndefined(urlParams)) {
      fetchPackagesList();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isNull(packagesList) || (packagesList && packagesList.length === 0)) return null;

  const mainColor = getMainColor();

  return (
    <Wrapper mainColor={mainColor} className={fixedWidthValue ? 'fixedWidth' : ''} width={fixedWidthValue}>
      {visibleLoading && (isUndefined(packagesList) || isLoading) ? (
        <Loading size="lg" />
      ) : (
        <>
          {packagesList && (
            <List>
              {packagesList.map((packageSummary: PackageSummary) => (
                <React.Fragment key={`pkg_${packageSummary.packageId}`}>
                  <Widget
                    url={props.url}
                    theme={props.theme}
                    header={props.header}
                    color={mainColor}
                    responsive={false}
                    packageSummary={packageSummary}
                    withBadges={pkgsWithBadges}
                    inGroup
                  />
                </React.Fragment>
              ))}
            </List>
          )}
        </>
      )}
    </Wrapper>
  );
};

export default Group;
