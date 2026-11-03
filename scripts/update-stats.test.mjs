import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectStats } from './update-stats.mjs';
import { renderTerminal, renderLinks } from './render-profile.mjs';
// Tests use a fixed fixture so users can freely delete fields from profile.json.
const profile={name:'Jaideep Singh Sekhon',username:'jaideepSekhon',host:'jaideepsekhon',
  focus:'Backend development',description:'Building APIs.',toolkit:['Java'],tools:['Git'],
  learning:['Python'],email:'example@example.com',links:{portfolio:'',x:'',linkedin:''}};
const renderStats=(_repos,languages,updated,includePrivate=false)=>renderTerminal({profile,snapshot:{languages,updated,includePrivate},tigerData:''});

const repo = (id, name, extra = {}) => ({
  id, name, owner: {login: 'jaideepSekhon'}, fork: false, private: false,
  stargazers_count: 0, forks_count: 0, ...extra,
});

test('public pagination, fork/profile exclusions, private ownership and credentials', async () => {
  const publicPage = [repo(1, 'project'), repo(2, 'jaideepSekhon'), repo(3, 'fork', {fork:true})];
  // Fill the first page to exercise pagination with repeated API records.
  while (publicPage.length < 100) publicPage.push(repo(1, 'project'));
  const calls = [];
  const fetchImpl = async (url, options) => {
    const path = new URL(url).pathname;
    const page = new URL(url).searchParams.get('page');
    calls.push([path, options.headers.Authorization]);
    let data;
    if (path === '/users/jaideepSekhon/repos') data = page === '1' ? publicPage : [repo(4, 'python')];
    else if (path === '/user/repos') data = [
      repo(5, 'secret-project', {private:true}),
      repo(6, 'someone-elses', {private:true, owner:{login:'someone-else'}}),
    ];
    else if (path.endsWith('/project/languages')) data = {Java:300};
    else if (path.endsWith('/python/languages')) data = {Python:100};
    else if (path.endsWith('/secret-project/languages')) data = {Python:200};
    else throw Error(`Unexpected API call: ${path}`);
    return {ok:true, json:async()=>data};
  };
  const data = await collectStats({owner:'jaideepSekhon', token:'public-test-token', privateToken:'private-test-token', fetchImpl});
  assert.equal(data.repos.length, 3);
  assert.deepEqual(data.languages, {Java:300, Python:300});
  assert.ok(calls.some(([path,auth])=>path.endsWith('/secret-project/languages') && auth === 'Bearer private-test-token'));
  assert.ok(calls.some(([path,auth])=>path.endsWith('/project/languages') && auth === 'Bearer public-test-token'));
  const svg = renderStats(data.repos, data.languages, 'test', true);
  assert.match(svg, /Python 50.0%/);
  assert.doesNotMatch(svg, /STARS|FORKS|PUBLIC REPOS/);
  assert.doesNotMatch(svg, /secret-project|private-test-token/);
});

test('terminal renders language percentages, grouping, escaping, contacts and no graph', () => {
  const single=renderStats([],{Python:1},'test');
  assert.match(single,/Python 100.0%/);
  assert.match(single,/jaideepsekhon/);
  const empty=renderStats([],{},'test');
  assert.match(empty,/No language data yet/);
  assert.doesNotMatch(empty,/NaN|Infinity/);
  const many=renderStats([],{Java:900,Python:90,JavaScript:5,HTML:2,CSS:1,'A&B<>':1,Shell:1},'test');
  assert.match(many,/Other/);
  assert.match(many,/A&amp;B&lt;&gt;/);
  assert.doesNotMatch(many,/<circle|STARS EARNED|FORKS/);
  const links=renderLinks({...profile,links:{portfolio:'https://example.com',x:'javascript:alert(1)',linkedin:''}});
  assert.match(links,/https:\/\/example.com/);
  assert.doesNotMatch(links,/javascript:/);
  assert.match(links,/mailto:/);
});

test('failed private requests abort without leaking private paths or credentials', async () => {
  let call = 0;
  await assert.rejects(collectStats({owner:'jaideepSekhon', privateToken:'do-not-log', fetchImpl:async()=>{
    call++;
    return call === 1 ? {ok:true,json:async()=>[]} : {ok:false,status:403};
  }}), (error) => /403/.test(error.message) && !/do-not-log|user\/repos/.test(error.message));
});

test('deleted profile fields disappear from both terminal variants and link page', () => {
  const edited={...profile};
  delete edited.links;
  delete edited.tools;
  delete edited.learning;
  delete edited.email;
  for (const mobile of [false,true]) {
    const svg=renderTerminal({profile:edited,snapshot:{languages:{Java:1},updated:'test'},tigerData:'',mobile});
    assert.doesNotMatch(svg,/Portfolio|LinkedIn|\[add URL\]|Learning|Mail/);
    assert.match(svg,/Jaideep/);
  }
  assert.doesNotMatch(renderLinks(edited),/Portfolio|LinkedIn|mailto:/);
  const oneLink={...profile,links:{portfolio:'https://example.com'}};
  assert.doesNotMatch(renderLinks(oneLink),/LinkedIn|\- X:/);
});

test('section switches hide complete sections without depending on user configuration', () => {
  const edited={...profile,sections:{contacts:false,toolkit:false,languages:false}};
  const svg=renderTerminal({profile:edited,snapshot:{languages:{Python:1},updated:'test'},tigerData:''});
  assert.doesNotMatch(svg,/contacts|toolkit|languages|Python|Portfolio/);
  assert.doesNotMatch(renderLinks(edited),/https:|mailto:/);
});
