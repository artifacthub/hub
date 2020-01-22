import { SearchQuery } from '../types';

export default (query: string): SearchQuery => {
  const defaultValues = {
    text: undefined,
    activePackageKinds: ['all'],
    activeKeywords: [],
    activeRepositories: [],
  };

  if (window.URLSearchParams) {
    const params = new URLSearchParams(query);
    return {
      text: params.has('text') ? params.get('text')! : undefined,
      activePackageKinds: params.has('kinds') ? params.get('kinds')!.split(',') : [], // TODO
      activeKeywords: params.has('keywords') ? params.get('keywords')!.split(',') : [], // TODO
      activeRepositories: params.has('repositories') ? params.get('repositories')!.split(',') : [], // TODO
    };
  } else {
    //  TODO
    return defaultValues;
  }
}
