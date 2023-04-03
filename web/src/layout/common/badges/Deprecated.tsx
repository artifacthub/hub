import { AiOutlineStop } from 'react-icons/ai';

import Badge from './Badge';

interface Props {
  className?: string;
  dropdownAlignment?: 'start' | 'end';
}

const Deprecated = (props: Props) => {
  return (
    <Badge
      title="Deprecated"
      bgColor="#C74B50"
      icon={<AiOutlineStop />}
      active
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom border-1 mb-3 pb-1">Deprecated</div>

          <p className="mb-0">
            This package is <span className="fw-bold">deprecated</span>. Please see the package details for possible
            alternatives recommendations.
          </p>
        </>
      }
    />
  );
};

export default Deprecated;
