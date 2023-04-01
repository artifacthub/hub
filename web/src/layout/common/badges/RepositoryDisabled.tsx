import { BiHide } from 'react-icons/bi';

import Badge from './Badge';

interface Props {
  className?: string;
  dropdownAlignment?: 'start' | 'end';
}

const RepositoryDisabled = (props: Props) => {
  return (
    <Badge
      title="Repository disabled"
      bgColor="#808080"
      icon={<BiHide />}
      active
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom border-1 mb-3 pb-1">Repository disabled</div>

          <p className="mb-0">
            This repository is <span className="fw-bold">disabled</span> and it won't be processed.
          </p>
        </>
      }
    />
  );
};

export default RepositoryDisabled;
