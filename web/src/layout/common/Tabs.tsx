import classnames from 'classnames';
import { useEffect, useState } from 'react';

import NoData from '../common/NoData';
import styles from './Tabs.module.css';

interface Props {
  tabs: Tab[];
  active: string;
  noDataContent: string;
}

interface Tab {
  name: string;
  title: string;
  shortTitle?: string;
  content: JSX.Element;
}

const Tabs = (props: Props) => {
  const [activeTab, setActiveTab] = useState(props.active);
  const [visibleContent, setVisibleContent] = useState<JSX.Element | undefined>();

  useEffect(() => {
    const currentActiveTab = props.tabs.find((tab: Tab) => tab.name === props.active);
    if (currentActiveTab) {
      setVisibleContent(currentActiveTab.content);
    }
  }, [props.active, props.tabs]);

  return (
    <>
      <div>
        <ul className={`nav nav-tabs ${styles.tabs}`}>
          {props.tabs.map((tab: Tab) => (
            <li className="nav-item" key={tab.name}>
              <button
                className={classnames('btn nav-item', styles.btn, {
                  [`active btn-primary ${styles.active}`]: tab.name === activeTab,
                })}
                onClick={() => {
                  setActiveTab(tab.name);
                  setVisibleContent(tab.content);
                }}
                aria-label={`Open tab ${tab.name}`}
              >
                <span className="d-none d-sm-block">{tab.title}</span>
                <span className="d-block d-sm-none">{tab.shortTitle || tab.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="tab-content mt-3">
        <div className="tab-pane fade show active">
          {visibleContent ? <>{visibleContent}</> : <NoData>{props.noDataContent}</NoData>}
        </div>
      </div>
    </>
  );
};

export default Tabs;
