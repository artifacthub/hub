import camelCase from 'lodash/camelCase';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

import { Package } from '../types';

class API {
  private API_BASE_URL = `/api/v1`;

  private toCamelCase(r: any): any {
    if (isArray(r)) {
      return r.map((v) => this.toCamelCase(v));
    } else if (isObject(r)) {
      return Object.keys(r).reduce(
        (result, key) => ({
          ...result,
          [camelCase(key)]: this.toCamelCase((r as any)[key]),
        }),
        {}
      );
    }
    return r;
  }

  private async handleContent(res: any) {
    if (!res.ok) {
      throw new Error('error');
    } else {
      switch (res.headers.get('Content-Type')) {
        case 'text/plain; charset=utf-8':
          const text = await res.text();
          return text;
        case 'application/json':
          const json = await res.json();
          return this.toCamelCase(json);
        default:
          return res;
      }
    }
  }

  private async apiFetch(url: string) {
    return fetch(url)
      .then((res) => this.handleContent(res))
      .catch((error) => Promise.reject(error));
  }

  public getPackageInfo(baseUrl: string, pathname: string): Promise<Package> {
    return this.apiFetch(`${baseUrl}${this.API_BASE_URL}${pathname}/summary`);
  }
}

const APIMethods = new API();
export default APIMethods;
