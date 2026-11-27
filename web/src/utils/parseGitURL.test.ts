import parseGitURL from './parseGitURL';

describe('parseGitURL', () => {
  it.each([
    [
      'https://github.com/user/repo',
      {
        repoBaseURL: 'https://github.com/user/repo',
        webBaseURL: 'https://github.com/user/repo',
        host: 'github.com',
        packagesPath: '',
      },
    ],
    [
      'https://github.com/user/repo/path/to/packages/',
      {
        repoBaseURL: 'https://github.com/user/repo',
        webBaseURL: 'https://github.com/user/repo',
        host: 'github.com',
        packagesPath: 'path/to/packages',
      },
    ],
    [
      'https://codeberg.org/k8s-gateway/k8s_gateway',
      {
        repoBaseURL: 'https://codeberg.org/k8s-gateway/k8s_gateway',
        webBaseURL: 'https://codeberg.org/k8s-gateway/k8s_gateway',
        host: 'codeberg.org',
        packagesPath: '',
      },
    ],
    [
      'https://git.sr.ht/~user/repo/packages',
      {
        repoBaseURL: 'https://git.sr.ht/~user/repo',
        webBaseURL: 'https://git.sr.ht/~user/repo',
        host: 'git.sr.ht',
        packagesPath: 'packages',
      },
    ],
    [
      'https://gitlab.com/testing-farm/integrations/tekton.git',
      {
        repoBaseURL: 'https://gitlab.com/testing-farm/integrations/tekton.git',
        webBaseURL: 'https://gitlab.com/testing-farm/integrations/tekton',
        host: 'gitlab.com',
        packagesPath: '',
      },
    ],
    [
      'https://gitlab.com/MaxIV/kubernetes/mortalgpu.git/assets/kyverno/',
      {
        repoBaseURL: 'https://gitlab.com/MaxIV/kubernetes/mortalgpu.git',
        webBaseURL: 'https://gitlab.com/MaxIV/kubernetes/mortalgpu',
        host: 'gitlab.com',
        packagesPath: 'assets/kyverno',
      },
    ],
    [
      'https://github.com/user/repo.git/',
      {
        repoBaseURL: 'https://github.com/user/repo.git',
        webBaseURL: 'https://github.com/user/repo',
        host: 'github.com',
        packagesPath: '',
      },
    ],
    [
      'https://github.com/user/my.git.repo/packages',
      {
        repoBaseURL: 'https://github.com/user/my.git.repo',
        webBaseURL: 'https://github.com/user/my.git.repo',
        host: 'github.com',
        packagesPath: 'packages',
      },
    ],
    [
      'https://GitHub.COM/user/repo/path',
      {
        repoBaseURL: 'https://GitHub.COM/user/repo',
        webBaseURL: 'https://GitHub.COM/user/repo',
        host: 'github.com',
        packagesPath: 'path',
      },
    ],
    [
      'https://git.example.com:8443/team/sub/project.git/packages',
      {
        repoBaseURL: 'https://git.example.com:8443/team/sub/project.git',
        webBaseURL: 'https://git.example.com:8443/team/sub/project',
        host: 'git.example.com',
        packagesPath: 'packages',
      },
    ],
  ])('parses valid git url %s', (input, expected) => {
    expect(parseGitURL(input)).toEqual(expected);
  });

  it.each([
    'https://k8s-gateway.codeberg.page/k8s_gateway/',
    'https://github.com/incomplete',
    'http://github.com/user/repo',
    'https://gitlab.com/group/.git',
    'https://gitlab.com/group/subgroup/.git',
    'https://github.com/user/repo?ref=main',
    'https://gitlab.com/group/subgroup/repo.git?ref=main',
    'https://git.example.org/group/repo+name.git/catalog',
    'https://github.com/user/repo/../../etc',
    'https://gitlab.com/group/subgroup/repo.git/../secret',
  ])('returns null for invalid git url %s', (input) => {
    expect(parseGitURL(input)).toBeNull();
  });
});
