import React from 'react';

import PackagesSection from './packages';
import RepositoriesSection from './repositories';
import styles from './SubscriptionsSection.module.css';

interface Props {
  onAuthError: () => void;
}

const SubscriptionsSection = (props: Props) => (
  <div className="d-flex flex-column flex-grow-1">
    <main role="main" className="p-0">
      <div className="flex-grow-1">
        <div className={`h3 pb-2 mb-2 border-bottom ${styles.title}`}>Your subscriptions</div>

        <PackagesSection onAuthError={props.onAuthError} />

        <RepositoriesSection onAuthError={props.onAuthError} />
      </div>
    </main>
  </div>
);

export default SubscriptionsSection;
