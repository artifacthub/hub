import compact from 'lodash/compact';

const getGitHostingProvider = (url: string, branch?: string | null): string | null => {
  let contentURL: string | null = null;
  const repoUrl = new URL(url);
  const splittedPath: string[] = compact(repoUrl.pathname.split('/'));
  const repoBase = `${repoUrl.origin}/${splittedPath.slice(0, 2).join('/')}`;

  switch (repoUrl.host) {
    case 'bitbucket.org':
    case 'github.com':
      contentURL = `${repoBase}/raw/${branch || ''}${splittedPath.length > 2 ? `/${splittedPath[2]}` : ''}`;
      break;
    case 'gitlab.com':
      contentURL = `${repoBase}/-/raw/${branch || ''}${splittedPath.length > 2 ? `/${splittedPath[2]}` : ''}`;
      break;
  }

  return contentURL;
};

export default getGitHostingProvider;
