import React from 'react';
import { FiHexagon } from 'react-icons/fi';
import styles from './Footer.module.css';

const Footer = () => (
  <footer className={styles.footer}>
    <div className="container">
      <div className="d-flex flex-column align-items-center">
        <div className={`mb-3 d-flex align-items-center ${styles.brand}`}>
          <FiHexagon className="mr-2" />
          HUB
        </div>

        <div className="d-flex">
          <span className="d-none d-sm-block mr-1">Copyright</span>
          © CNCF 2020
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
