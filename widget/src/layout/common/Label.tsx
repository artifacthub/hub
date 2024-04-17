import styled from 'styled-components';

import SVGIcons from './SVGIcons';

const LabelWrapper = styled('div')`
  display: flex;
  justify-content: center;
  height: 1.6rem;
  width: 1.6rem;
  line-height: 1.2rem;
  color: var(--icon-color);
  font-size: 1.2rem;

  &.official {
    background-color: #54b435;
  }

  &.verified {
    background-color: #2192ff;
  }

  &.signed {
    background-color: #645cbb;
  }

  &.valuesSchema {
    background-color: #fca311;
  }

  &.cncf {
    background-color: transparent;

    svg {
      height: 100%;
    }
  }

  &.deprecated {
    background-color: #c74b50;
  }
`;

interface Props {
  type: string;
}

const Label = (props: Props) => (
  <LabelWrapper className={props.type}>
    <SVGIcons name={props.type} />
  </LabelWrapper>
);

export default Label;
