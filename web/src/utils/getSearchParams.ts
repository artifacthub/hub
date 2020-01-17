import { SearchQuery } from '../types';

export default (query: string): SearchQuery => {
  const defaultValues = {
    text: undefined,
    activePackageKinds: ['all'],
    activeKeywords: [],
  };

  if (window.URLSearchParams) {
    const params = new URLSearchParams(query);
    return {
      text: params.has('text') ? params.get('text')! : undefined,
      activePackageKinds: params.has('kinds') ? params.get('kinds')!.split(',') : ['all'],
      activeKeywords: params.has('keywords') ? params.get('keywords')!.split(',') : [],
    };
  } else {
    //  TODO
    return defaultValues;
  }
}
