import getGitHostingProvider from './getGitHostingProvider';

describe('getGitHostingProvider', () => {
  it.each([
    ['https://github.com/user/repo/path/to/policies', 'main', 'https://github.com/user/repo/raw/main/path/to/policies'],
    ['https://bitbucket.org/user/repo', undefined, 'https://bitbucket.org/user/repo/raw/master'],
    [
      'https://gitlab.com/group/subgroup/repo.git/policies',
      'main',
      'https://gitlab.com/group/subgroup/repo/-/raw/main/policies',
    ],
    ['https://codeberg.org/user/repo/policies', 'main', 'https://codeberg.org/user/repo/raw/branch/main/policies'],
    [
      'https://CODEBERG.ORG/user/repo/policies',
      'release#1',
      'https://CODEBERG.ORG/user/repo/raw/branch/release%231/policies',
    ],
    ['https://gitea.com/user/repo.git', null, 'https://gitea.com/user/repo/raw/branch/master'],
    ['https://gitee.com/user/repo/policies', 'main', 'https://gitee.com/user/repo/raw/main/policies'],
    ['https://git.sr.ht/~user/repo/policies', 'main', 'https://git.sr.ht/~user/repo/blob/main/policies'],
    ['https://git.example.com/org/repo', 'main', null],
  ])('builds raw URL for %s (branch: %s)', (url, branch, expected) => {
    expect(getGitHostingProvider(url, branch)).toBe(expected);
  });
});
