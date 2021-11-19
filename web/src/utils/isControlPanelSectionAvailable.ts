import isUndefined from 'lodash/isUndefined';
import some from 'lodash/some';

import { Section } from '../types';
import { CONTROL_PANEL_SECTIONS } from './data';

const isControlPanelSectionAvailable = (
  context: 'user' | 'org',
  sectionToCheck?: string,
  subsectionToCheck?: string
): boolean => {
  if (isUndefined(sectionToCheck)) {
    return false;
  }

  const isSectionAvailable = (): boolean => {
    return some(CONTROL_PANEL_SECTIONS[context], (sect: Section) => sect.name === sectionToCheck);
  };

  const isSubsectionAvailable = (): boolean => {
    const activeSection = CONTROL_PANEL_SECTIONS[context].find((sect: Section) => sect.name === sectionToCheck);
    if (activeSection && activeSection.subsections) {
      return some(activeSection.subsections, (subSsect: Section) => subSsect.name === subsectionToCheck);
    } else {
      return false;
    }
  };

  if (sectionToCheck && !isSectionAvailable()) {
    return false;
  }

  if (sectionToCheck && subsectionToCheck && !isSubsectionAvailable()) {
    return false;
  }

  return true;
};

export default isControlPanelSectionAvailable;
