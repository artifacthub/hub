import { TiWarningOutline } from 'react-icons/ti';
import { Link } from 'react-router-dom';

import styles from './NotFound.module.css';

const NotFound = () => (
  <div
    className={`p-5 d-flex flex-column align-items-center justify-content-center flex-grow-1 noFocus ${styles.content}`}
    id="content"
    tabIndex={-1}
  >
    <TiWarningOutline className={`m-3 ${styles.icon}`} />
    <div className="h1 text-center mb-4">Error 404 - Page Not Found</div>
    <div className="h3 text-center mb-5">The page you were looking for wasn't found</div>
    <Link to="/" className="btn btn-secondary btn-lg">
      Back Home
    </Link>
  </div>
);

export default NotFound;
