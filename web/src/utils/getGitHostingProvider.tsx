import parseGitURL from './parseGitURL';

const DEFAULT_BRANCH = 'master';

const escapeURLPath = (p: string): string =>
  p
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const getGitHostingProvider = (url: string, branch?: string | null): string | null => {
  const parsed = parseGitURL(url);
  if (!parsed) {
    return null;
  }

  const ref = escapeURLPath(branch || DEFAULT_BRANCH);
  const subPath = parsed.packagesPath ? `/${escapeURLPath(parsed.packagesPath)}` : '';

  switch (parsed.host) {
    case 'bitbucket.org':
    case 'github.com':
    case 'gitee.com':
      return `${parsed.webBaseURL}/raw/${ref}${subPath}`;
    case 'codeberg.org':
    case 'gitea.com':
      return `${parsed.webBaseURL}/raw/branch/${ref}${subPath}`;
    case 'git.sr.ht':
      return `${parsed.webBaseURL}/blob/${ref}${subPath}`;
    case 'gitlab.com':
      return `${parsed.webBaseURL}/-/raw/${ref}${subPath}`;
    default:
      return null;
  }
};

export default getGitHostingProvider;
