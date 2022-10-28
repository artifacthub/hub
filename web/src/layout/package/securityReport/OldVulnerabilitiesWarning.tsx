import { useEffect, useState } from 'react';

import { SecurityReport } from '../../../types';
import checkIfOldVulnerabilities from '../../../utils/checkIfOldVulnerabilities';

interface Props {
  fixableReport?: SecurityReport | null;
}

const OLD_THRESHOLD = 2;

const OldVulnerabilitiesWarning = (props: Props) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (props.fixableReport) {
      const isOld = checkIfOldVulnerabilities(props.fixableReport, OLD_THRESHOLD);
      if (isOld) setVisible(true);
    }
  }, [props.fixableReport]);

  if (!visible) return null;

  return (
    <div className="alert alert-warning mb-4 mt-3">
      <span className="text-uppercase fw-bold">Warning:</span> This package has{' '}
      <span className="fw-bold">high severity fixable</span> vulnerabilities older than{' '}
      <span className="fw-bold">{OLD_THRESHOLD} years old</span> that haven't been addressed yet.
    </div>
  );
};

export default OldVulnerabilitiesWarning;
