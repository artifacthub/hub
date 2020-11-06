import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { AuthorizerAction, Section } from '../../types';
import ActionBtn from '../controlPanel/ActionBtn';
import styles from './SectionPanel.module.css';

interface Props {
  defaultSection: string;
  activeSection?: string;
  pathPrefix?: string;
  sections: Section[];
  content: {
    [key: string]: JSX.Element;
  };
}

const SectionPanel = (props: Props) => {
  const history = useHistory();
  const [activeSection, setActiveSection] = useState<string>(props.activeSection || props.defaultSection);

  useEffect(() => {
    if (!isUndefined(props.activeSection)) {
      setActiveSection(props.activeSection);
    }
  }, [props.activeSection]);

  const getBtnContent = (section: Section): JSX.Element => {
    return (
      <>
        {!isUndefined(section.icon) && <div className={`${styles.icon} sectionIcon`}>{section.icon}</div>}
        {!isUndefined(section.shortName) ? (
          <div className="d-none d-sm-inline ml-1 ml-sm-2">
            <span className="d-none d-md-inline">{section.displayName}</span>
            <span className="d-inline d-md-none">{section.shortName}</span>
          </div>
        ) : (
          <div className="d-none d-sm-inline ml-1 ml-sm-2">{section.displayName}</div>
        )}
      </>
    );
  };

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <nav className={`mb-4 ${styles.sidebar}`}>
        <div className={`list-group my-4 my-md-0 mr-md-5 ${styles.listGroup}`}>
          {props.sections.map((section: Section) => {
            const className = classnames(
              'd-flex list-group-item list-group-item-action flex-row align-items-center sectionItem',
              styles.listItem,
              { [`${styles.isActive} isActive`]: section.name === activeSection },
              { disabled: section.disabled }
            );
            return (
              <span
                className={classnames('w-100', {
                  'd-none d-md-block': !isUndefined(section.onlyDesktop) && section.onlyDesktop,
                })}
                key={`package_${section.name}`}
              >
                {(() => {
                  switch (section.name) {
                    case 'authorization':
                      return (
                        <ActionBtn
                          testId="sectionBtn"
                          className={className}
                          contentClassName="flex-column flex-md-row align-items-center justify-content-center justify-content-md-start w-100"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            history.push(`${props.pathPrefix || ''}/${section.name}`);
                          }}
                          action={AuthorizerAction.GetAuthorizationPolicy}
                        >
                          <>{getBtnContent(section)}</>
                        </ActionBtn>
                      );
                    default:
                      return (
                        <button
                          type="button"
                          data-testid="sectionBtn"
                          className={`btn btn-link text-reset ${className}`}
                          disabled={section.disabled}
                          onClick={() => {
                            history.push(`${props.pathPrefix || ''}/${section.name}`);
                          }}
                        >
                          <div className="d-flex flex-column flex-md-row align-items-center justify-content-center justify-content-md-start w-100">
                            {getBtnContent(section)}
                          </div>
                        </button>
                      );
                  }
                })()}
              </span>
            );
          })}
        </div>
      </nav>

      <div className={`flex-grow-1 mb-4 ${styles.list}`}>{props.content[activeSection]}</div>
    </main>
  );
};

export default SectionPanel;
