import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useState } from 'react';

import { Section } from '../../types';
import styles from './SectionPanel.module.css';

interface Props {
  onSectionChange?: (section: string) => void;
  defaultSection: string;
  sections: Section[];
  content: {
    [key: string]: JSX.Element;
  };
}

const SectionPanel = (props: Props) => {
  const [activeSection, setActiveSection] = useState<string>(props.defaultSection);

  const onMenuItemClick = (section: string) => {
    setActiveSection(section);
    if (!isUndefined(props.onSectionChange)) {
      props.onSectionChange(section);
    }
  };

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <nav className={`mb-3 ${styles.sidebar}`}>
        <div className={`list-group my-4 my-md-0 mr-md-5 ${styles.listGroup}`}>
          {props.sections.map((section: Section) => {
            return (
              <button
                data-testid="sectionBtn"
                key={`package_${section.name}`}
                type="button"
                className={classnames(
                  'list-group-item list-group-item-action d-flex flex-row align-items-center',
                  styles.listItem,
                  { [styles.isActive]: section.name === activeSection },
                  { disabled: section.disabled }
                )}
                disabled={section.disabled}
                onClick={() => onMenuItemClick(section.name)}
              >
                <div className="d-flex flex-column flex-md-row align-items-center justify-content-center justify-content-md-start w-100">
                  {!isUndefined(section.icon) && <div className={styles.icon}>{section.icon}</div>}
                  {!isUndefined(section.shortName) ? (
                    <div className="ml-1 ml-sm-2">
                      <span className="d-none d-md-inline">{section.displayName}</span>
                      <span className="d-inline d-md-none">{section.shortName}</span>
                    </div>
                  ) : (
                    <div className="ml-1 ml-sm-2">{section.displayName}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      <div className={`flex-grow-1 mb-4 ${styles.list}`}>{props.content[activeSection]}</div>
    </main>
  );
};

export default SectionPanel;
