import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

import APIMethods from '../api';
import { Package } from '../types';
import Card from './card';
import SVGIcons from './common/SVGIcons';

interface Props {
  element: Element;
}

const DEFAULT_THEME = 'light';
const AVAILABLE_THEMES = [DEFAULT_THEME, 'dark'];

const Wrapper = styled('div')`
  margin: 0.75rem;
`;

const CardWrapper = styled('div')`
  ${(props) =>
    props.theme === 'dark'
      ? css`
          --color-1-500: #131216;
          --color-font: #a3a3a6;
          --white: #222529;
          --color-1-5: rgba(15, 14, 17, 0.95);
          --color-1-10: rgba(15, 14, 17, 0.9);
          --color-1-20: rgba(15, 14, 17, 0.8);
          --color-2-10: rgba(15, 14, 17, 0.1);
          --color-black-25: rgba(255, 255, 255, 0.25);
          --light-gray: #e9ecef;
          --success: #131216;
          --icon-color: #a3a3a6;
        `
      : css`
          --color-1-500: #659dbd;
          --color-font: #38383f;
          --white: #fff;
          --color-1-5: rgba(28, 44, 53, 0.05);
          --color-1-10: rgba(28, 44, 53, 0.1);
          --color-1-20: rgba(28, 44, 53, 0.2);
          --color-2-10: rgba(176, 206, 224, 0.1);
          --light-gray: #e9ecef;
          --success: #28a745;
          --icon-color: #fff;
          --color-black-25: rgba(0, 0, 0, 0.25);
        `}

  font-family: 'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 1rem;
  color: var(--color-font);
  background-color: var(--white);
  background-clip: padding-box;
  border: 3px solid var(--color-1-500);
  border-radius: 0.25rem;
  overflow: hidden;
  width: 350px;
  line-height: 1.15rem;

  &.responsive {
    min-width: 350px;
    width: 100%;
    max-width: 650px;
  }

  & *, & *:after, & *:before {
    box-sizing: border-box;
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
  background-color: var(--color-1-500);
  font-size: 1.25rem;
  padding: 0.5rem 0.75rem;
  color: #fff;
  font-weight: bold;
  height: 40px;
`;

const CardBody = styled('div')`
  padding: 0.75rem;
  color: var(--color-font);
`;

const SpinnerWrapper = styled('div')`
  padding: 2rem 3rem;
  text-align: center;
`;

const spinnerBorder = keyframes`
to {
  transform: rotate(360deg);
}
`;

const Spinner = styled('div')`
  display: inline-block;
  width: 2rem;
  height: 2rem;
  vertical-align: text-bottom;
  border: 0.25em solid var(--color-1-500);
  border-right-color: transparent;
  border-radius: 50%;
  -webkit-animation: ${spinnerBorder} 0.75s linear infinite;
  animation: ${spinnerBorder} 0.75s linear infinite;
`;

const Brand = styled(SVGIcons)`
  ${(props) =>
    props.theme === 'dark' &&
    css`
      opacity: 0.75;
    `}
`;

export default function App(props: Props) {
  const { url, theme, header, responsive } = (props.element as HTMLElement).dataset;
  const currentTheme = theme && AVAILABLE_THEMES.includes(theme) ? theme : DEFAULT_THEME;
  const [urlParams, setUrlParams] = useState<URL | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [packageItem, setPackageItem] = useState<Package | undefined | null>(undefined);

  useEffect(() => {
    async function fetchPackage() {
      if (url && urlParams) {
        try {
          setIsLoading(true);
          setPackageItem(await APIMethods.getPackageInfo(urlParams.origin, urlParams.pathname));
          setIsLoading(false);
        } catch {
          setIsLoading(false);
          setPackageItem(null);
        }
      } else {
        setPackageItem(null);
      }
    }
    fetchPackage();
  }, [urlParams]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (url) {
      setUrlParams(new URL(url));
    }
  }, [url]);

  if (isNull(packageItem)) return null;

  return (
    <Wrapper>
      <CardWrapper
        theme={currentTheme}
        className={!isUndefined(responsive) && responsive === 'true' ? 'responsive' : ''}
      >
        <Link href={url} rel="noopener noreferrer" target="_blank">
          {(isUndefined(header) || header !== 'false') && (
            <CardHeader>
              <Brand name="logo" theme={currentTheme} />
            </CardHeader>
          )}

          <CardBody>
            {isLoading || isUndefined(packageItem) ? (
              <SpinnerWrapper>
                <Spinner />
              </SpinnerWrapper>
            ) : (
              <Card
                packageItem={packageItem}
                theme={theme || DEFAULT_THEME}
                baseUrl={urlParams ? urlParams.origin : undefined}
              />
            )}
          </CardBody>
        </Link>
      </CardWrapper>
    </Wrapper>
  );
}
