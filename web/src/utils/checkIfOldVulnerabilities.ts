import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';

import { SecurityReport, VulnerabilitySeverity } from '../types';

const checkIfOldVulnerabilities = (report: SecurityReport, oldThreshold: number): boolean => {
  // Loop through report images
  for (let i = 0; i < Object.keys(report).length; i++) {
    const targets = report[Object.keys(report)[i]].Results;
    // Loop through image targets
    for (let t = 0; t < targets.length; t++) {
      const vulnerabilities = targets[t].Vulnerabilities;
      if (!isNull(vulnerabilities)) {
        // Loop through target vulnerabilities
        for (let v = 0; v < vulnerabilities.length; v++) {
          const vulnerability = vulnerabilities[v];
          // Only when published date is defined and vulnerability is CRITICAL or HIGH
          if (
            !isUndefined(vulnerability.PublishedDate) &&
            [VulnerabilitySeverity.Critical, VulnerabilitySeverity.High].includes(
              vulnerability.Severity.toLowerCase() as VulnerabilitySeverity
            )
          ) {
            // Calculate difference in years between today and published date
            const elapsed = moment(new Date()).diff(moment(vulnerability.PublishedDate), 'years', true);
            // When one vulnerability is older then diffInYears, we return true and stop to check the rest
            if (elapsed > oldThreshold) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
};

export default checkIfOldVulnerabilities;
