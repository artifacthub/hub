import { isNull, isUndefined } from 'lodash';
import moment from 'moment';
import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

import API from '../api';
import { PackageSummary, Repository, RepositoryKind } from '../types';
import Image from './common/Image';
import Label from './common/Label';
import Loading from './common/Loading';
import RepositoryIconLabel from './common/RepositoryIconLabel';
import SVGIcons from './common/SVGIcons';

interface Props {
  url?: string;
  header: boolean;
  stars: boolean;
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
    case RepositoryKind.Keptn:
      return 'keptn';
    case RepositoryKind.TektonPipeline:
      return 'tekton-pipeline';
    case RepositoryKind.Container:
      return 'container';
    case RepositoryKind.Kubewarden:
      return 'kubewarden';
    case RepositoryKind.Gatekeeper:
      return 'gatekeeper';
    case RepositoryKind.Kyverno:
      return 'kyverno';
    case RepositoryKind.KnativeClientPlugin:
      return 'knative-client-plugin';
    case RepositoryKind.Backstage:
      return 'backstage';
    case RepositoryKind.ArgoTemplate:
      return 'argo-template';
    case RepositoryKind.KubeArmor:
      return 'kubearmor';
    case RepositoryKind.KCL:
      return 'kcl';
    case RepositoryKind.Headlamp:
      return 'headlamp';
    case RepositoryKind.InspektorGadget:
      return 'inspektor-gadget';
    case RepositoryKind.TektonStepAction:
      return 'tekton-stepaction';
    case RepositoryKind.MesheryDesign:
      return 'meshery';
    case RepositoryKind.OpenCost:
      return 'opencost';
    case RepositoryKind.RadiusRecipe:
      return 'radius';
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

const DEFAULT_COLOR = '#417598';

const Wrapper = styled.div<WrapperProps>`
  ${(props) =>
    props.theme === 'dark'
      ? css`
          --color-ah-primary: #131216;
          --color-ah-font: #a3a3a6;
          --white: #222529;
          --bg-badge: #1a1c1f;
          --color-ah-primary-10: rgba(15, 14, 17, 0.9);
          --color-ah-primary-20: rgba(15, 14, 17, 0.8);
          --color-ah-secondary-10: rgba(15, 14, 17, 0.1);
          --color-ah-black-15: rgba(255, 255, 255, 0.15);
          --color-ah-black-25: rgba(255, 255, 255, 0.25);
          --color-ah-black-75: rgba(255, 255, 255, 0.75);
          --light-gray: #131216;
          --icon-color: #222529;
          --dark: #a3a3a6;
          --muted: #a0a0a0;
        `
      : css`
          --color-ah-primary: #417598;
          --color-ah-font: #38383f;
          --white: #fff;
          --bg-badge: #f3f6f9;
          --color-ah-primary-10: rgba(65, 117, 152, 0.1);
          --color-ah-primary-20: rgba(65, 117, 152, 0.2);
          --color-ah-secondary-10: rgba(45, 72, 87, 0.1);
          --color-ah-black-15: rgba(0, 0, 0, 0.15);
          --color-ah-black-25: rgba(0, 0, 0, 0.25);
          --color-ah-black-75: rgba(0, 0, 0, 0.75);
          --light-gray: #e9ecef;
          --icon-color: #fff;
          --color-ah-black-25: rgba(0, 0, 0, 0.25);
          --dark: #343a40;
          --muted: #636a6e;
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
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  font-size: 1rem;
  color: var(--color-ah-font);
  background-color: var(--white);
  background-clip: padding-box;
  border: 3px solid var(--color-ah-primary);
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
    height: ${(p: CardBodyProps) => (p.withBadges ? '255px' : '225px')};
  }
`;

interface BrandProps {
  theme: string;
}

const Brand = styled(SVGIcons)<BrandProps>`
  ${(props) =>
    props.theme === 'dark' &&
    css`
      opacity: 0.75;
    `}
`;

const ImageWrapper = styled('div')`
  flex: 0 0 50px;
  position: relative;
  min-width: 50px;
  width: 50px;
  height: 50px;
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
  margin-top: auto;
  margin-bottom: 0.75rem;

  & > * {
    margin-right: 0.5rem;
  }
`;

const Description = styled('div')`
  overflow: hidden;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;

  .groupedItem & {
    -webkit-line-clamp: 3;
    height: 57px;
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
  background-color: var(--bg-badge);
  border: 1px solid var(--color-ah-primary-10);
  display: flex;
  align-items: center;
  padding: 0.1em 0.4em;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
`;

const DEFAULT_THEME = 'light';
const AVAILABLE_THEMES = [DEFAULT_THEME, 'dark'];

export default function Widget(props: Props) {
  const currentTheme = props.theme && AVAILABLE_THEMES.includes(props.theme) ? props.theme : DEFAULT_THEME;
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(props.url);
  const urlParams = props.url ? new URL(props.url) : undefined;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [packageSummary, setPackageSummary] = useState<PackageSummary | undefined | null>(props.packageSummary);

  async function fetchPackage() {
    try {
      setIsLoading(true);
      setPackageSummary(await API.getPackageInfo(urlParams!.origin, urlParams!.pathname));
      setIsLoading(false);
    } catch {
      setIsLoading(false);
      setPackageSummary(null);
    }
  }

  useEffect(() => {
    if (isUndefined(packageSummary)) {
      if (!isUndefined(urlParams)) {
        fetchPackage();
      } else {
        setPackageSummary(null);
      }
    }
  }, []);

  useEffect(() => {
    if (props.url !== currentUrl && !props.inGroup) {
      setCurrentUrl(props.url);
      fetchPackage();
    }
  }, [props.url]);

  if (isNull(packageSummary) || isUndefined(props.url)) return null;

  return (
    <Wrapper data-testid="mainWrapper" theme={currentTheme} color={props.color}>
      <CardWrapper data-testid="cardWrapper" className={props.responsive ? 'responsive' : ''}>
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

          <CardBody data-testid="cardBody" className={props.inGroup ? 'groupedItem' : ''} withBadges={props.withBadges}>
            {isLoading || isUndefined(packageSummary) ? (
              <Loading />
            ) : (
              <>
                <HeaderWrapper>
                  <ImageWrapper>
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
                      {props.stars && (
                        <Badge>
                          <IconStarsWrapper>
                            <SVGIcons name="stars" />
                          </IconStarsWrapper>
                          <StarsNumber>{prettifyNumber(packageSummary.stars || 0)}</StarsNumber>
                        </Badge>
                      )}
                    </TitleWrapper>
                    <div>
                      <Version>
                        <Legend>
                          {packageSummary.repository.kind === RepositoryKind.Container ? 'Tag' : 'Version'}:
                        </Legend>
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

                  <Date>Updated {moment.unix(packageSummary.ts).fromNow()}</Date>
                </ExtraInfo>

                <Description>{packageSummary.description || ''}</Description>

                {(packageSummary.official ||
                  packageSummary.repository.official ||
                  packageSummary.repository.verifiedPublisher ||
                  (packageSummary.repository.kind === RepositoryKind.Helm && packageSummary.hasValuesSchema)) && (
                  <BadgesWrapper>
                    {packageSummary.deprecated && <Label type="deprecated" />}

                    {(packageSummary.cncf || packageSummary.repository.cncf) && <Label type="cncf" />}

                    {packageSummary.repository.kind === RepositoryKind.Helm && packageSummary.hasValuesSchema && (
                      <Label type="valuesSchema" />
                    )}

                    {packageSummary.signed && <Label type="signed" />}

                    {packageSummary.repository.verifiedPublisher && <Label type="verified" />}

                    {(packageSummary.official || packageSummary.repository.official) && <Label type="official" />}
                  </BadgesWrapper>
                )}

                <PublishedBy>
                  <Legend>Published by:</Legend>
                  {packageSummary.repository.userAlias ||
                    packageSummary.repository.organizationDisplayName ||
                    packageSummary.repository.organizationName}
                </PublishedBy>
              </>
            )}
          </CardBody>
        </Link>
      </CardWrapper>
    </Wrapper>
  );
}
