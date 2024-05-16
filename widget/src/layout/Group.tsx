import { isNull, isUndefined, some } from 'lodash';
import { Fragment, useEffect, useState } from 'react';
import styled from 'styled-components';

import API from '../api';
import { PackageSummary, RepositoryKind } from '../types';
import Loading from './common/Loading';
import Widget from './Widget';

interface Props {
  url?: string;
  loading: boolean;
  header: boolean;
  stars: boolean;
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

const DEFAULT_COLOR = '#417598';

const hasBadges = (packages: PackageSummary[] | null): boolean => {
  if (packages) {
    return some(
      packages,
      (pkg: PackageSummary) =>
        pkg.official ||
        pkg.repository.official ||
        pkg.repository.verifiedPublisher ||
        (pkg.repository.kind === RepositoryKind.Helm && pkg.hasValuesSchema)
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
          const results = await API.searchPackages(urlParams.origin, urlParams.search);
          if (results.packages && results.packages.length > 0) {
            setPackagesList(results.packages);
            setPkgsWithBadges(hasBadges(results.packages));
          } else {
            setPackagesList(null);
          }
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
  }, [props.url]);

  if (isNull(packagesList) || (packagesList && packagesList.length === 0)) return null;

  const mainColor = getMainColor();

  return (
    <Wrapper
      data-testid="wrapper"
      mainColor={mainColor}
      className={fixedWidthValue ? 'fixedWidth' : ''}
      width={fixedWidthValue}
    >
      {visibleLoading && (isUndefined(packagesList) || isLoading) ? (
        <Loading size="lg" />
      ) : (
        <>
          {packagesList && (
            <List>
              {packagesList.map((packageSummary: PackageSummary) => (
                <Fragment key={`pkg_${packageSummary.packageId}`}>
                  <Widget
                    url={props.url}
                    theme={props.theme}
                    header={props.header}
                    stars={props.stars}
                    color={mainColor}
                    responsive={false}
                    packageSummary={packageSummary}
                    withBadges={pkgsWithBadges}
                    inGroup
                  />
                </Fragment>
              ))}
            </List>
          )}
        </>
      )}
    </Wrapper>
  );
};

export default Group;
