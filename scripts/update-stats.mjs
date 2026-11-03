import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { writeProfile } from './render-profile.mjs';

export async function collectStats({owner, profileRepo = owner, token, privateToken, fetchImpl = fetch}) {
  async function api(path, credential = token) {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'pixel-profile-stats' };
    if (credential) headers.Authorization = `Bearer ${credential}`;
    const response = await fetchImpl(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(30_000) });
    // Do not log private repository paths or response bodies.
    if (!response.ok) throw new Error(`GitHub API request failed (${response.status}). Check token access and rate limits.`);
    return response.json();
  }
  async function paginated(path, credential) {
    const result = [];
    for (let page = 1; ; page++) {
      const batch = await api(`${path}&per_page=100&page=${page}`, credential);
      result.push(...batch);
      if (batch.length < 100) return result;
    }
  }
  const allRepos = await paginated(`/users/${encodeURIComponent(owner)}/repos?type=owner`, token);
  if (privateToken) {
    // This token is scoped to the user's selected private repositories.
    const privateRepos = await paginated('/user/repos?visibility=private&affiliation=owner', privateToken);
    allRepos.push(...privateRepos.filter((repo) => repo.owner.login.toLowerCase() === owner.toLowerCase()));
  }
  const repos = [...new Map(allRepos.filter((repo) => !repo.fork &&
    repo.name.toLowerCase() !== profileRepo.toLowerCase()).map((repo) => [repo.id, repo])).values()];
  const languages = {};
  for (let start = 0; start < repos.length; start += 5) {
    const results = await Promise.all(repos.slice(start, start + 5).map((repo) =>
      api(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}/languages`, repo.private ? privateToken : token)));
    for (const result of results) {
      for (const [name, bytes] of Object.entries(result)) languages[name] = (languages[name] || 0) + bytes;
    }
  }
  return {repos, languages};
}


async function main() {
  const owner = process.env.PROFILE_USERNAME || process.env.GITHUB_REPOSITORY_OWNER || 'jaideepSekhon';
  const privateToken = process.env.PROFILE_STATS_TOKEN;
  const {languages} = await collectStats({
    owner, profileRepo: process.env.GITHUB_REPOSITORY?.split('/')[1] || owner,
    token: process.env.GITHUB_TOKEN, privateToken,
  });
  const snapshot = {
    languages,
    updated: new Date().toISOString().slice(0,16).replace('T',' ')+' UTC',
    includePrivate: Boolean(privateToken),
    basis: 'github-code-bytes',
  };
  await writeProfile(snapshot);
  await writeFile(new URL('../data/languages.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
  console.log('Updated terminal language totals successfully.');
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await main();
