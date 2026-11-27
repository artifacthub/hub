export interface ParsedGitURL {
  repoBaseURL: string;
  webBaseURL: string;
  host: string;
  packagesPath: string;
}

const GIT_REPO_WITH_DOT_GIT_URL_RE =
  /^(https:\/\/([A-Za-z0-9_.-]+)(?::[0-9]+)?(?:\/[A-Za-z0-9_.~-]+)+?\.git)(?:\/([^?#]*))?$/;
const GIT_REPO_URL_RE =
  /^(https:\/\/([A-Za-z0-9_.-]+)(?::[0-9]+)?\/[A-Za-z0-9_.~-]+\/[A-Za-z0-9_.~-]+)(?:\/([^?#]*))?$/;

const parseGitURL = (rawURL: string): ParsedGitURL | null => {
  let matches = GIT_REPO_WITH_DOT_GIT_URL_RE.exec(rawURL);
  if (!matches) {
    matches = GIT_REPO_URL_RE.exec(rawURL);
  }
  if (!matches) {
    return null;
  }

  const withoutScheme = rawURL.slice('https://'.length);
  const slashIdx = withoutScheme.indexOf('/');
  if (slashIdx >= 0) {
    const segments = withoutScheme.slice(slashIdx + 1).split('/');
    if (segments.some((seg) => seg === '.' || seg === '..' || seg === '.git')) {
      return null;
    }
  }

  const repoBaseURL = matches[1];
  const host = matches[2].toLowerCase();
  const packagesPath = (matches[3] || '').replace(/^\/+|\/+$/g, '');

  return {
    repoBaseURL,
    webBaseURL: repoBaseURL.replace(/\.git$/, ''),
    host,
    packagesPath,
  };
};

export default parseGitURL;
