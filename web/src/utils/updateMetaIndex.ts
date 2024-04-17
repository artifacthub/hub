import getMetaTag from './getMetaTag';

const siteName = getMetaTag('siteName');

const updateMetaIndex = (
  title: string = siteName,
  description: string = 'Find, install and publish Cloud Native packages'
): void => {
  document.title = title;
  document.querySelector(`meta[property='og:title']`)!.setAttribute('content', title);
  document.querySelector(`meta[name='twitter:title']`)!.setAttribute('content', title);
  document.querySelector(`meta[name='description']`)!.setAttribute('content', description);
  document.querySelector(`meta[property='og:description']`)!.setAttribute('content', description);
  document.querySelector(`meta[name='twitter:description']`)!.setAttribute('content', description);
};

export default updateMetaIndex;
