export default (
  title: string = 'Artifact Hub',
  description: string = 'Find, install and publish Kubernetes package'
): void => {
  document.title = title;
  document.querySelector(`meta[property='og:title']`)!.setAttribute('content', title);
  document.querySelector(`meta[name='twitter:title']`)!.setAttribute('content', title);
  document.querySelector(`meta[name='description']`)!.setAttribute('content', description);
  document.querySelector(`meta[property='og:description']`)!.setAttribute('content', description);
  document.querySelector(`meta[name='twitter:description']`)!.setAttribute('content', description);
};
