import isNull from 'lodash/isNull';
import YAML from 'yaml';

import API from '../api';
import { Banner } from '../types';
import getMetaTag from './getMetaTag';

class BannerDispatcher {
  private isInitiated: boolean = false;
  private url: string | null = null;
  private banners: Banner[] = [];

  public async init() {
    this.url = getMetaTag('bannersURL');
    if (!isNull(this.url)) {
      this.banners = await this.getBannersInfo(this.url);
    }
    this.isInitiated = true;
  }

  private async getBannersInfo(url: string): Promise<Banner[]> {
    try {
      const yaml = await API.getBannersInfo(url);
      if (yaml) {
        return this.parseBannerYAML(yaml);
      } else {
        return [];
      }
    } catch {
      return [];
    }
  }

  private parseBannerYAML(yaml: string): Banner[] {
    const bannersTmp = YAML.parse(yaml);
    const banners: Banner[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bannersTmp.forEach((banner: any) => {
      if (this.isBanner(banner)) {
        banners.push(banner);
      }
    });
    return banners;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isBanner(banner: any): boolean {
    if (
      banner.images &&
      banner.images['light-theme'] &&
      banner.images['light-theme'] !== '' &&
      banner.images['dark-theme'] &&
      banner.images['dark-theme'] !== ''
    ) {
      return true;
    } else {
      return false;
    }
  }

  public async getBanner(): Promise<Banner | null> {
    if (!this.isInitiated) {
      await this.init();
    }
    if (this.banners.length > 0) {
      return this.banners[Math.floor(Math.random() * this.banners.length)];
    } else {
      return null;
    }
  }
}

const bannerDispatcher = new BannerDispatcher();
export default bannerDispatcher;
