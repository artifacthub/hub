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
  border-radius: 3px;
`;

const IconWrapper = styled('div')`
  position: relative;
  border: 1px solid var(--color-ah-black-15);
  border-radius: 3px;
  height: 20px;
  color: var(--dark);
  border-right: none;
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
  box-shadow: inset -1px 0 var(--color-ah-black-15);
  margin-right: -3px;
  padding-left: 3px;
  width: 20px;
  background-color: var(--light-gray);

  &:before {
    content: '';
    position: absolute;
    right: -3px;
    top: calc(50% - 3px);
    height: 6px;
    width: 6px;
    border-radius: 50%;
    box-shadow: inset -1px 0 var(--color-ah-black-15);
    background-color: var(--light-gray);
  }

  &.success {
    background-color: var(--success);
    color: var(--icon-color);

    &:before {
      background-color: var(--success);
    }
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
