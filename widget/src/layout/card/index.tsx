import { isUndefined } from 'lodash';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';

import { Package } from '../../types';
import Image from '../common/Image';
import Label from '../common/Label';
import RepositoryIconLabel from '../common/RepositoryIconLabel';
import SVGIcons from '../common/SVGIcons';

interface Props {
  packageItem: Package;
  theme: string;
  baseUrl?: string;
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

const ImageWrapper = styled('div')`
  position: relative;
  min-width: 60px;
  width: 60px;
  height: 60px;
  background-color: var(--white);
  border: 2px solid var(--color-1-10);
  box-shadow: 0px 0px 5px 0px var(--color-1-20);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const Content = styled('div')`
  width: calc(100% - 60px);
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
  background-color: var(--color-1-5);
  border: 1px solid var(--color-1-10);
  display: flex;
  align-items: center;
  padding: 0.1em 0.4em;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  border-radius: 50rem;
`;

const Card = (props: Props) => {
  if (isUndefined(props.baseUrl)) return null;
  return (
    <>
      <HeaderWrapper>
        <ImageWrapper>
          {props.baseUrl && (
            <Image
              baseUrl={props.baseUrl}
              imageId={props.packageItem.logoImageId}
              alt={`Logo ${props.packageItem.displayName || props.packageItem.name}`}
              kind={props.packageItem.repository.kind}
            />
          )}
        </ImageWrapper>
        <Content>
          <TitleWrapper>
            <Title>{props.packageItem.displayName || props.packageItem.name}</Title>
            <Badge>
              <IconStarsWrapper>
                <SVGIcons name="stars" />
              </IconStarsWrapper>
              <StarsNumber>{prettifyNumber(props.packageItem.stars || 0)}</StarsNumber>
            </Badge>
          </TitleWrapper>
          <div>
            <Version>
              <Legend>Version:</Legend>
              {props.packageItem.version}
            </Version>
          </div>
        </Content>
      </HeaderWrapper>

      <ExtraInfo>
        <RepositoryIconLabel kind={props.packageItem.repository.kind} baseUrl={props.baseUrl} theme={props.theme} />

        <Date>Updated {moment(props.packageItem.ts * 1000).fromNow()}</Date>
      </ExtraInfo>

      {props.packageItem.description && <Description>{props.packageItem.description}</Description>}

      <PublishedBy>
        <Legend>Published by:</Legend>
        {props.packageItem.repository.userAlias ||
          props.packageItem.repository.organizationDisplayName ||
          props.packageItem.repository.organizationName}
      </PublishedBy>

      {(props.packageItem.official ||
        props.packageItem.repository.official ||
        props.packageItem.repository.verifiedPublisher) && (
        <BadgesWrapper>
          {(props.packageItem.official || props.packageItem.repository.official) && (
            <Label text="Official" type="success" icon={<SVGIcons name="official" />} />
          )}

          {props.packageItem.repository.verifiedPublisher && (
            <Label text="Verified Publisher" icon={<SVGIcons name="verified" />} />
          )}
        </BadgesWrapper>
      )}
    </>
  );
};

export default Card;
