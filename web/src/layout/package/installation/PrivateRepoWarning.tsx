import styles from './ContentInstall.module.css';

const PrivateRepoWarning = () => (
  <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert" aria-live="assertive" aria-atomic="true">
    <span className="font-weight-bold text-uppercase">Important:</span> This repository is{' '}
    <span className="font-weight-bold">private</span> and requires some credentials.
  </div>
);

export default PrivateRepoWarning;
