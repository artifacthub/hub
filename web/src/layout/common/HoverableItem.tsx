interface Props {
  children: JSX.Element | JSX.Element[] | string;
  onHover?: () => void;
  onLeave?: () => void;
}

const HoverableItem = (props: Props) => (
  <div
    onMouseEnter={() => {
      if (props.onHover) {
        props.onHover();
      }
    }}
    onMouseLeave={() => {
      if (props.onLeave) {
        props.onLeave();
      }
    }}
  >
    {props.children}
  </div>
);

export default HoverableItem;
