import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { MouseEvent as ReactMouseEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>(props.activeSection || props.defaultSection);

  useEffect(() => {
    if (props.activeSection) {
      setActiveSection(props.activeSection);
    }
  }, [props.activeSection]);

  const getBtnContent = (section: Section): JSX.Element => {
    return (
      <>
        {section.icon && <div className={`${styles.icon} h-auto sectionIcon`}>{section.icon}</div>}
        {section.shortName ? (
          <div className="d-none d-sm-inline ms-1 ms-sm-2">
            <span className="d-none d-md-inline">{section.displayName}</span>
            <span className="d-inline d-md-none">{section.shortName}</span>
          </div>
        ) : (
          <div className="d-none d-sm-inline ms-1 ms-sm-2">{section.displayName}</div>
        )}
      </>
    );
  };

  return (
    <main role="main" className="px-xs-0 px-sm-3 px-lg-0 my-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between">
        <nav className={`mb-4 ${styles.sidebar}`}>
          <div className={`list-group my-4 my-md-0 me-md-5 ${styles.listGroup}`}>
            {props.sections.map((section: Section) => {
              const className = classnames(
                'd-flex list-group-item list-group-item-action flex-row align-items-center sectionItem',
                styles.listItem,
                { [`${styles.isActive} fw-bold isActive bg-white`]: section.name === activeSection },
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
                            className={`${styles.link} ${className}`}
                            contentClassName="flex-column flex-md-row align-items-center justify-content-center justify-content-md-start w-100"
                            onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                              e.preventDefault();
                              navigate(`${props.pathPrefix || ''}/${section.name}`);
                            }}
                            action={AuthorizerAction.GetAuthorizationPolicy}
                            label="Open section"
                          >
                            <>{getBtnContent(section)}</>
                          </ActionBtn>
                        );
                      default:
                        return (
                          <button
                            type="button"
                            className={`btn btn-link text-reset ${styles.link} ${className}`}
                            disabled={section.disabled}
                            onClick={() => {
                              navigate(`${props.pathPrefix || ''}/${section.name}`);
                            }}
                            aria-label={`Go to section ${section.name}`}
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
      </div>
    </main>
  );
};

export default SectionPanel;
