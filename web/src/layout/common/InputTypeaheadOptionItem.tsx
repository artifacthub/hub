import { Option } from '../../types';

interface Props {
  opt: Option;
  name: string | JSX.Element;
  iconClassName?: string;
  optClassName?: string;
}

const InputTypeaheadOptionItem = (props: Props) => (
  <>
    {props.opt.icon && <div className={`me-2 ${props.iconClassName}`}>{props.opt.icon}</div>}
    <div className="text-truncate">{props.name}</div>
    {props.opt.total && (
      <div>
        {' '}
        <small className="ms-1">({props.opt.total})</small>
      </div>
    )}
  </>
);

export default InputTypeaheadOptionItem;
