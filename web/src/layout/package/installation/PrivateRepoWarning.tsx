import styles from './ContentInstall.module.css';

const PrivateRepoWarning = () => (
  <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert" aria-live="assertive" aria-atomic="true">
    <span className="fw-bold text-uppercase">Important:</span> This repository is{' '}
    <span className="fw-bold">private</span> and requires some credentials.
  </div>
);

export default PrivateRepoWarning;
