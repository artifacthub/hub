import styled from 'styled-components';

const LabelWrapper = styled('div')`
  font-size: 0.72rem;
  display: flex;
  align-items: center;
`;

const LabelText = styled('div')`
  background-color: var(--bg-badge);
  line-height: 18px;
  padding: 0 5px 0 10px;
  font-weight: 700;
  border: 1px solid var(--color-ah-black-15);
`;

const IconWrapper = styled('div')`
  position: relative;
  border: 1px solid var(--color-ah-black-15);
  height: 20px;
  color: var(--dark);
  padding-left: 3px;
  margin-right: -1px;
  width: 20px;
  background-color: var(--light-gray);

  &.success {
    background-color: var(--success);
    color: var(--icon-color);
  }
`;

interface Props {
  icon: JSX.Element;
  text: string;
  type?: string;
}

const Label = (props: Props) => (
  <LabelWrapper>
    <IconWrapper className={props.type}>{props.icon}</IconWrapper>
    <LabelText>{props.text}</LabelText>
  </LabelWrapper>
);

export default Label;
