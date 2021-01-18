import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useCallback, useEffect, useState } from 'react';
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
  const { pathPrefix, sections, content, activeSection, defaultSection } = props;
  const history = useHistory();
  const [currentActiveSection, setCurrentActiveSection] = useState<string>(activeSection || defaultSection);

  useEffect(() => {
    if (activeSection) {
      setCurrentActiveSection(activeSection);
    }
  }, [activeSection]);

  const getBtnContent = useCallback((section: Section): JSX.Element => {
    return (
      <>
        {section.icon && <div className={`${styles.icon} sectionIcon`}>{section.icon}</div>}
        {section.shortName ? (
          <div className="d-none d-sm-inline ml-1 ml-sm-2">
            <span className="d-none d-md-inline">{section.displayName}</span>
            <span className="d-inline d-md-none">{section.shortName}</span>
          </div>
        ) : (
          <div className="d-none d-sm-inline ml-1 ml-sm-2">{section.displayName}</div>
        )}
      </>
    );
  }, []);

  const onAuthClick = useCallback(
    (sectionName: string, e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.preventDefault();
      history.push(`${pathPrefix || ''}/${sectionName}`);
    },
    [history, pathPrefix]
  );

  return (
    <main role="main" className="px-xs-0 px-sm-3 px-lg-0 my-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between">
        <nav className={`mb-4 ${styles.sidebar}`}>
          <div className={`list-group my-4 my-md-0 mr-md-5 ${styles.listGroup}`}>
            {sections.map((section: Section) => {
              const className = classnames(
                'd-flex list-group-item list-group-item-action flex-row align-items-center sectionItem',
                styles.listItem,
                { [`${styles.isActive} isActive`]: section.name === currentActiveSection },
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
                              onAuthClick(section.name, e);
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
                            onClick={() => onAuthClick(section.name)}
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

        <div className={`flex-grow-1 mb-4 ${styles.list}`}>{content[currentActiveSection]}</div>
      </div>
    </main>
  );
};

export default React.memo(SectionPanel);
