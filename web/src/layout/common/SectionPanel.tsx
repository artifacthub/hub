import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useState } from 'react';

import { SectionItem } from '../../utils/data';
import styles from './SectionPanel.module.css';

interface Props {
  defaultSection?: number;
  sections: SectionItem[];
  content: {
    [key: string]: JSX.Element;
  };
}

const SectionPanel = (props: Props) => {
  const [activeSection, setActiveSection] = useState<number>(props.defaultSection || 0);

  const onMenuItemClick = (section: number) => {
    setActiveSection(section);
  };

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <nav className={styles.sidebar}>
        <div className={`list-group my-4 my-md-0 mr-md-5 ${styles.listGroup}`}>
          {props.sections.map((section: SectionItem) => {
            return (
              <button
                data-testid="sectionBtn"
                key={`package_${section.index}`}
                type="button"
                className={classnames(
                  'list-group-item list-group-item-action d-flex flex-row align-items-center',
                  styles.listItem,
                  { [styles.isActive]: section.index === activeSection },
                  { disabled: section.disabled }
                )}
                disabled={section.disabled}
                onClick={() => onMenuItemClick(section.index)}
              >
                <div className="d-flex flex-row align-items-center">
                  {!isUndefined(section.icon) && <div className={styles.icon}>{section.icon}</div>}
                  <div className="ml-2">{section.name}</div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      <div className={`flex-grow-1 ${styles.list}`}>{props.content[activeSection]}</div>
    </main>
  );
};

export default SectionPanel;
