import { GiShieldDisabled } from 'react-icons/gi';

import Badge from './Badge';

interface Props {
  className?: string;
  dropdownAlignment?: 'start' | 'end';
}

const SecurityScannerDisabled = (props: Props) => {
  return (
    <Badge
      title="Security scanner disabled"
      bgColor="#808080"
      icon={<GiShieldDisabled />}
      active
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom border-1 mb-3 pb-1">Security scanner disabled</div>

          <p className="mb-0">
            The <span className="fw-bold">security scanner</span> is disabled for this repository.
          </p>
        </>
      }
    />
  );
};

export default SecurityScannerDisabled;
