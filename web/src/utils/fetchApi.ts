export default (url: string) => {
  return fetch(url)
    .then(res => (res.ok ? res : Promise.reject(res)))
    .then(res => res.json());
}
