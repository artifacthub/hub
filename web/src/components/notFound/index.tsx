import React from 'react';
import { Link } from 'react-router-dom';
import { TiWarningOutline } from 'react-icons/ti';
import styles from './NotFound.module.css';

const NotFound = () => (
  <div className={`h-100 p-5 d-flex flex-column align-items-center justify-content-center ${styles.content}`}>
    <TiWarningOutline className={`m-3 ${styles.icon}`} />
    <h1 className="display4 text-center mb-4">Error 404 - Page Not Found</h1>
    <h3 className="text-center mb-5">The page you were looking for wasn't found</h3>
    <Link to="/" className="btn btn-outline-dark btn-lg">Back Home</Link>
  </div>
);

export default NotFound;
