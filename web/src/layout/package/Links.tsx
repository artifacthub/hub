import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { IconType } from 'react-icons';
import { FaGithub, FaLink } from 'react-icons/fa';
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
  homepage: TiHome,
  source: FaGithub,
  default: FaLink,
};

const Links = (props: Props) => {
  const getIconLink = (name: string): JSX.Element => {
    let Icon = ICONS.default;
    if (!isUndefined(name) && name.toLowerCase() in ICONS) {
      Icon = ICONS[name.toLowerCase()];
    }
    return <Icon className={`text-muted mr-2 ${styles.icon}`} />;
  };

  if (
    (isUndefined(props.links) || isNull(props.links) || props.links.length === 0) &&
    (isNull(props.homeUrl) || isUndefined(props.homeUrl))
  )
    return null;

  const comparePackageLink = (a: PackageLink, b: PackageLink): number => {
    if (a.name === 'source') {
      return -1;
    }
    if (b.name === 'source') {
      return 1;
    }
    return 0;
  };

  let formattedLinks: PackageLink[] = [];
  if (props.links && props.links.length > 0) {
    formattedLinks = props.links.sort(comparePackageLink);
  }

  return (
    <>
      <SmallTitle text="Links" />
      <div className="mb-3">
        {props.homeUrl && (
          <div className="py-1 py-sm-0">
            <ExternalLink href={props.homeUrl} className="text-primary d-flex align-items-start mb-1 text-capitalize">
              <div className="d-flex flex-row align-items-start mw-100">
                {getIconLink('homepage')}
                <div className={`flex-grow-1 ${styles.linkText}`}>Homepage</div>
              </div>
            </ExternalLink>
          </div>
        )}

        {formattedLinks.map((link: PackageLink, index: number) => (
          <div className="py-1 py-sm-0" key={`link_${link.name}_${index}`}>
            <ExternalLink href={link.url} className="text-primary d-flex align-items-center mb-1 text-capitalize">
              <div className="d-flex flex-row align-items-start mw-100">
                {getIconLink(link.name)}
                <div className={`flex-grow-1 ${styles.linkText}`}>{link.name}</div>
              </div>
            </ExternalLink>
          </div>
        ))}
      </div>
    </>
  );
};

export default Links;
