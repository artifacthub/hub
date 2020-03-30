import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { IconType } from 'react-icons';
import { FaGithub, FaLink } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';
import { TiHome } from 'react-icons/ti';

import { PackageLink } from '../../types';
import ExternalLink from '../common/ExternalLink';
import SmallTitle from '../common/SmallTitle';
import styles from './Links.module.css';

interface Props {
  links?: PackageLink[] | null;
  homeUrl?: string | null;
}

interface IconTypeList {
  [key: string]: IconType;
}

const ICONS: IconTypeList = {
  home: TiHome,
  source: FaGithub,
  default: FaLink,
};

const Links = (props: Props) => {
  const linksList = props.links || [];
  if (!isUndefined(props.homeUrl) && !isNull(props.homeUrl)) {
    linksList.push({
      name: 'Home',
      url: props.homeUrl,
    });
  }

  const getIconLink = (name: string): JSX.Element => {
    let Icon = ICONS.default;
    if (!isUndefined(name) && name.toLowerCase() in ICONS) {
      Icon = ICONS[name.toLowerCase()];
    }
    return <Icon className="text-muted mr-2" />;
  };

  if (linksList.length === 0) return null;

  return (
    <>
      <SmallTitle text="Links" />
      {linksList.map((link: PackageLink) => (
        <ExternalLink
          key={`link_${link.name}`}
          data-testid="homeUrl"
          href={link.url}
          className="text-primary d-flex align-items-center mb-3 text-capitalize"
        >
          <>
            {getIconLink(link.name)}
            {link.name}
            <span className={styles.smallIcon}>
              <FiExternalLink className="ml-1" />
            </span>
          </>
        </ExternalLink>
      ))}
    </>
  );
};

export default Links;
