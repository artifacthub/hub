import React from 'react';
import styles from './Title.module.css';

interface Props {
  text: string;
}

const Title = (props: Props) => <h6 className={`text-uppercase text-muted font-weight-bold mb-2 ${styles.title}`}>{props.text}</h6>;

export default Title;
