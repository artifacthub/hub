import React from 'react';
import styles from './Footer.module.css';

const Footer = () => (
  <footer className={styles.footer}>
    <div className="container-fluid">
      <div className="row align-items-center">
        <div className="col-sm-6 col-xs-12">
          <div className="d-flex">
            <span className="d-none d-sm-block mr-1">Copyright</span>
            © CNCF 2020
          </div>
        </div>

        <div className="col-sm-6 col-xs-12 text-right">
          <ul className="mb-0">
            <li className="list-inline-item mr-3">
              <a className={styles.link} href="/">Privacy Policy</a>
            </li>

            <li className="list-inline-item">
              <a className={styles.link} href="/">Terms of Use</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
