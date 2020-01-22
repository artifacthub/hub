import React from 'react';
import { FiDownloadCloud, FiServer, FiDatabase } from 'react-icons/fi';
import styles from './Content.module.css';

const Content = () => (
  <div className="container mb-4 mt-4">
    <h4 className="text-center mb-4">Lorem ipsum dolor sit amet</h4>

    <p className="lead mb-4">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod <span className="font-weight-bold">tempor incididunt</span> ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute <span className="font-weight-bold">irure dolor</span> in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint <span className="font-weight-bold">occaecat cupidatat</span> non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    </p>

    <div className="d-flex justify-content-between align-items-stretch flex-wrap mt-5 mb-5">
      <div className={`card mb-3 ${styles.card}`}>
        <div className="card-body">
          <FiDownloadCloud className="h1 text-primary mb-3" />
          <h5>Sed ut perspiciatis</h5>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
        </div>
      </div>

      <div className={`card mb-3 ${styles.card}`}>
        <div className="card-body">
          <FiServer className="h1 text-primary mb-3" />
          <h5>Veritatis et quasi</h5>
          Veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam
        </div>
      </div>

      <div className={`card mb-3 ${styles.card}`}>
        <div className="card-body">
          <FiDatabase className="h1 text-primary mb-3" />
          <h5>Voluptate velit esse</h5>
          Voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur
        </div>
      </div>
    </div>
  </div>
);

export default Content;
