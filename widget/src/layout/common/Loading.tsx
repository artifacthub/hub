import React from 'react';
import styled, { keyframes } from 'styled-components';

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
  border: 0.25em solid var(--color-ah-primary);
  border-right-color: transparent;
  border-radius: 50%;
  -webkit-animation: ${spinnerBorder} 0.75s linear infinite;
  animation: ${spinnerBorder} 0.75s linear infinite;
`;

const Loading = () => (
  <SpinnerWrapper>
    <Spinner />
  </SpinnerWrapper>
);

export default Loading;
