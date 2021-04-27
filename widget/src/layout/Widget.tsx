import { isNull, isUndefined } from 'lodash';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

import APIMethods from '../api';
import { PackageSummary, Repository, RepositoryKind } from '../types';
import Image from './common/Image';
import Label from './common/Label';
import Loading from './common/Loading';
import RepositoryIconLabel from './common/RepositoryIconLabel';
import SVGIcons from './common/SVGIcons';

interface Props {
  url?: string;
  header: boolean;
  responsive: boolean;
  theme?: string;
  color?: string;
  inGroup: boolean;
  packageSummary?: PackageSummary;
  withBadges?: boolean;
}

const prettifyNumber = (num: number, digits?: number): string | number => {
  if (num < 1000) {
    return num;
  }

  const si = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let i;
  for (i = si.length - 1; i > 0; i--) {
    if (num >= si[i].value) {
      break;
    }
  }
  return (num / si[i].value).toFixed(digits || 2).replace(rx, '$1') + si[i].symbol;
};

const getRepoKindName = (repoKind: RepositoryKind): string | null => {
  switch (repoKind) {
    case RepositoryKind.Helm:
      return 'helm';
    case RepositoryKind.HelmPlugin:
      return 'helm-plugin';
    case RepositoryKind.Falco:
      return 'falco';
    case RepositoryKind.OPA:
      return 'opa';
    case RepositoryKind.OLM:
      return 'olm';
    case RepositoryKind.TBAction:
      return 'tbaction';
    case RepositoryKind.Krew:
      return 'krew';
    case RepositoryKind.TektonTask:
      return 'tekton-task';
    case RepositoryKind.KedaScaler:
      return 'keda-scaler';
    case RepositoryKind.CoreDNS:
      return 'coredns';
    default:
      return null;
  }
};

const buildPackageURL = (normalizedName: string, repository: Repository): string => {
  return `/packages/${getRepoKindName(repository.kind)!}/${repository.name}/${normalizedName}`;
};

interface CardBodyProps {
  withBadges?: boolean;
  className: string;
}

interface WrapperProps {
  theme: string;
  color?: string;
}

const DEFAULT_COLOR = '#659dbd';

const Wrapper = styled.div<WrapperProps>`
  ${(props) =>
    props.theme === 'dark'
      ? css`
          --color-ah-primary: #131216;
          --color-ah-font: #a3a3a6;
          --white: #222529;
          --color-ah-primary-5: rgba(15, 14, 17, 0.95);
          --color-ah-primary-10: rgba(15, 14, 17, 0.9);
          --color-ah-primary-20: rgba(15, 14, 17, 0.8);
          --color-ah-secondary-10: rgba(15, 14, 17, 0.1);
          --color-ah-black-25: rgba(255, 255, 255, 0.25);
          --color-ah-black-75: rgba(255, 255, 255, 0.75);
          --light-gray: #e9ecef;
          --info: #131216;
          --success: #131216;
          --icon-color: #a3a3a6;
        `
      : css`
          --color-ah-primary: #659dbd;
          --color-ah-font: #38383f;
          --white: #fff;
          --color-ah-primary-5: rgba(28, 44, 53, 0.05);
          --color-ah-primary-10: rgba(28, 44, 53, 0.1);
          --color-ah-primary-20: rgba(28, 44, 53, 0.2);
          --color-ah-secondary-10: rgba(176, 206, 224, 0.1);
          --color-ah-black-25: rgba(0, 0, 0, 0.25);
          --color-ah-black-75: rgba(0, 0, 0, 0.75);
          --light-gray: #e9ecef;
          --info: #659dbd;
          --success: #28a745;
          --icon-color: #fff;
          --color-ah-black-25: rgba(0, 0, 0, 0.25);
        `}
  --color-ah-primary: ${(props) => (props.color && props.color !== DEFAULT_COLOR ? 'inherit' : props.color)};
  margin: 0.75rem;

  @media (max-width: 380px) {
    width: calc(100% - 1.5rem);
  }

  & *,
  & *:after,
  & *:before {
    box-sizing: border-box;
  }
`;

const CardWrapper = styled('div')`
  font-family: 'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 1rem;
  color: var(--color-ah-font);
  background-color: var(--white);
  background-clip: padding-box;
  border: 3px solid var(--color-ah-primary);
  border-radius: 0.25rem;
  overflow: hidden;
  width: 350px;
  line-height: 1.15rem;

  &.responsive {
    min-width: 350px;
    width: 100%;
    max-width: 650px;
  }

  @media (max-width: 380px) {
    width: 100%;

    &.responsive {
      min-width: 100%;
    }
  }
}
`;

const Link = styled('a')`
  text-decoration: inherit;
  color: inherit;
`;

const CardHeader = styled('div')`
  display: flex;
  align-items: center;
  background-color: var(--color-ah-primary);
  font-size: 1.25rem;
  padding: 0.5rem 0.75rem;
  color: #fff;
  font-weight: bold;
  height: 40px;
`;

const CardBody = styled.div<CardBodyProps>`
  padding: 0.75rem;
  color: var(--color-ah-font);
  display: flex;
  flex-direction: column;

  &.groupedItem {
    height: ${(p: CardBodyProps) => (p.withBadges ? '260px' : '225px')};
  }
`;

const Brand = styled(SVGIcons)`
  ${(props) =>
    props.theme === 'dark' &&
    css`
      opacity: 0.75;
    `}
`;

const ImageWrapper = styled('div')`
  flex: 0 0 60px;
  position: relative;
  min-width: 60px;
  width: 60px;
  height: 60px;
  background-color: ${(props) => (props.theme === 'dark' ? 'var(--color-ah-black-75)' : 'var(--white)')};
  border: 2px solid var(--color-ah-primary-10);
  box-shadow: 0px 0px 5px 0px var(--color-ah-primary-20);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const Content = styled('div')`
  flex-grow: 1;
  min-width: 0;
  padding-left: 0.5rem;
`;

const HeaderWrapper = styled('div')`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const TitleWrapper = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const TextTruncate = styled('div')`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Title = styled(TextTruncate)`
  font-size: 1.15rem;
  padding-bottom: 0.35rem;
  margin-right: 0.5rem;

  @media (max-width: 380px) {
    font-size: 1.05rem;
  }
`;

const IconStarsWrapper = styled('div')`
  font-size: 75%;
`;
const StarsNumber = styled('div')`
  margin-left: 0.25rem;
`;

const BadgesWrapper = styled('div')`
  display: flex;
  align-items: center;
  margin-top: 1rem;

  & > * {
    margin-right: 0.5rem;
  }
`;

const Description = styled('div')`
  overflow: hidden;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;

  .groupedItem & {
    -webkit-line-clamp: 3;
    height: 55px;
  }
`;

const Legend = styled('span')`
  font-size: 80%;
  opacity: 0.8;
  text-transform: uppercase;
  margin-right: 0.25rem;
`;

const ExtraInfo = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const Version = styled(TextTruncate)`
  margin-right: 0.5rem;
  font-size: 0.9rem;
`;

const PublishedBy = styled(TextTruncate)`
  font-size: 0.9rem;
  margin-top: auto;
`;

const Date = styled('small')`
  font-size: 70%;
  opacity: 0.75;
  white-space: nowrap;
`;

const Badge = styled('div')`
  font-size: 75%;
  text-transform: none;
  height: 19px;
  background-color: var(--color-ah-primary-5);
  border: 1px solid var(--color-ah-primary-10);
  display: flex;
  align-items: center;
  padding: 0.1em 0.4em;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  border-radius: 50rem;
`;

const DEFAULT_THEME = 'light';
const AVAILABLE_THEMES = [DEFAULT_THEME, 'dark'];

export default function Widget(props: Props) {
  const currentTheme = props.theme && AVAILABLE_THEMES.includes(props.theme) ? props.theme : DEFAULT_THEME;
  const urlParams = props.url ? new URL(props.url) : undefined;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [packageSummary, setPackageSummary] = useState<PackageSummary | undefined | null>(props.packageSummary);

  useEffect(() => {
    async function fetchPackage() {
      try {
        setIsLoading(true);
        setPackageSummary(await APIMethods.getPackageInfo(urlParams!.origin, urlParams!.pathname));
        setIsLoading(false);
      } catch {
        setIsLoading(false);
        setPackageSummary(null);
      }
    }

    if (isUndefined(packageSummary)) {
      if (!isUndefined(urlParams)) {
        fetchPackage();
      } else {
        setPackageSummary(null);
      }
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isNull(packageSummary) || isUndefined(props.url)) return null;

  return (
    <Wrapper theme={currentTheme} color={props.color}>
      <CardWrapper className={props.responsive ? 'responsive' : ''}>
        <Link
          href={
            props.inGroup && packageSummary
              ? `${urlParams!.origin}${buildPackageURL(packageSummary.normalizedName, packageSummary.repository)}`
              : props.url
          }
          rel="noopener noreferrer"
          target="_blank"
        >
          {props.header && (
            <CardHeader>
              <Brand name="logo" theme={props.color !== DEFAULT_COLOR ? 'light' : currentTheme} />
            </CardHeader>
          )}

          <CardBody className={props.inGroup ? 'groupedItem' : ''} withBadges={props.withBadges}>
            {isLoading || isUndefined(packageSummary) ? (
              <Loading />
            ) : (
              <>
                <HeaderWrapper>
                  <ImageWrapper theme={currentTheme}>
                    <Image
                      baseUrl={urlParams!.origin}
                      imageId={packageSummary.logoImageId}
                      alt={`Logo ${packageSummary.displayName || packageSummary.name}`}
                      kind={packageSummary.repository.kind}
                    />
                  </ImageWrapper>
                  <Content>
                    <TitleWrapper>
                      <Title>{packageSummary.displayName || packageSummary.name}</Title>
                      <Badge>
                        <IconStarsWrapper>
                          <SVGIcons name="stars" />
                        </IconStarsWrapper>
                        <StarsNumber>{prettifyNumber(packageSummary.stars || 0)}</StarsNumber>
                      </Badge>
                    </TitleWrapper>
                    <div>
                      <Version>
                        <Legend>Version:</Legend>
                        {packageSummary.version}
                      </Version>
                    </div>
                  </Content>
                </HeaderWrapper>

                <ExtraInfo>
                  <RepositoryIconLabel
                    kind={packageSummary.repository.kind}
                    baseUrl={urlParams!.origin}
                    theme={currentTheme}
                  />

                  <Date>Updated {moment(packageSummary.ts * 1000).fromNow()}</Date>
                </ExtraInfo>

                <Description>{packageSummary.description || ''}</Description>

                <PublishedBy>
                  <Legend>Published by:</Legend>
                  {packageSummary.repository.userAlias ||
                    packageSummary.repository.organizationDisplayName ||
                    packageSummary.repository.organizationName}
                </PublishedBy>

                {(packageSummary.official ||
                  packageSummary.repository.official ||
                  packageSummary.repository.verifiedPublisher) && (
                  <BadgesWrapper>
                    {(packageSummary.official || packageSummary.repository.official) && (
                      <Label text="Official" type="success" icon={<SVGIcons name="official" />} />
                    )}

                    {packageSummary.repository.verifiedPublisher && (
                      <Label text="Verified Publisher" icon={<SVGIcons name="verified" />} />
                    )}
                  </BadgesWrapper>
                )}
              </>
            )}
          </CardBody>
        </Link>
      </CardWrapper>
    </Wrapper>
  );
}
