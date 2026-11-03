import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;',
})[c]);

export function languageShares(languages) {
  const entries = Object.entries(languages).filter(([,value])=>Number.isFinite(value) && value>0)
    .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
  const total = entries.reduce((sum,[,value])=>sum+value,0);
  const top = entries.slice(0,6);
  const remainder = total - top.reduce((sum,[,value])=>sum+value,0);
  if (remainder>0) top.push(['Other',remainder]);
  return top.map(([name,value])=>[name,`${(value/total*100).toFixed(1)}%`]);
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['https:','http:','mailto:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function wrap(value, limit) {
  const lines=[''];
  for (const word of value.split(/\s+/)) {
    const last=lines.length-1;
    if (lines[last] && lines[last].length+word.length+1>limit) lines.push(word);
    else lines[last]+=(lines[last]?' ':'')+word;
  }
  return lines;
}

function normalizeProfile(profile) {
  return {
    ...profile,
    name: profile.name || profile.username || 'Developer',
    username: profile.username || 'developer',
    host: profile.host || profile.username || 'localhost',
    focus: profile.focus || '',
    description: profile.description || '',
    toolkit: profile.toolkit || [],
    tools: profile.tools || [],
    learning: profile.learning || [],
    sections: profile.sections || {},
  };
}

function contactEntries(profile) {
  if (profile.sections?.contacts === false) return [];
  const entries = [];
  if (profile.username) entries.push(['GitHub',`https://github.com/${encodeURIComponent(profile.username)}`]);
  for (const [key,label] of [['portfolio','Portfolio'],['x','X'],['linkedin','LinkedIn']]) {
    // Deleted keys disappear; keys explicitly kept empty remain editable placeholders.
    if (Object.hasOwn(profile.links || {},key)) entries.push([label,profile.links[key]]);
  }
  if (profile.email) entries.push(['Mail',`mailto:${profile.email}`]);
  return entries;
}

export function renderTerminal({profile, snapshot, tigerData, mobile=false}) {
  const entries = contactEntries(profile);
  profile = normalizeProfile(profile);
  const showToolkit = profile.sections.toolkit !== false;
  const showLanguages = profile.sections.languages !== false;
  const width = mobile ? 420 : 840;
  const shares = languageShares(snapshot.languages);
  const extra = Math.max(0,Math.ceil(shares.length/2)-3)*22;
  const height = (mobile ? 684 : 566)+extra;
  const x = mobile ? 20 : 326;
  const text = (value,x,y,kind='',size=14) => `<text x="${x}" y="${y}" class="${kind}" font-size="${size}">${escape(value)}</text>`;
  const line = (key,value,y) => `<text x="${x}" y="${y}" font-size="${mobile?12:14}"><tspan class="key">${escape(key.padEnd(10))}</tspan><tspan>${escape(value)}</tspan></text>`;
  const section = (name,y) => text(`── ${name} ${'─'.repeat(mobile?28-name.length:38-name.length)}`,x,y,'muted',12);
  const host = `${profile.username.toLowerCase()}@${profile.host}`;
  let body = `<rect x="1" y="1" width="${width-2}" height="${height-2}" rx="7" fill="#111a14" stroke="#344b35" stroke-width="2"/><path d="M1 39H${width-1}" stroke="#344b35"/>`;
  for (const [i,color] of ['#b07219','#b4c65b','#73ac65'].entries()) body += `<rect x="${20+i*17}" y="16" width="8" height="8" fill="${color}"/>`;
  body += text(`${profile.host} — bash`,86,26,'muted',12);
  body += text(`${host}:~$ fastfetch`,mobile?20:28,73,'prompt',mobile?12:15);
  body += `<image href="${escape(tigerData)}" x="${mobile?253:22}" y="${mobile?93:105}" width="${mobile?148:272}" height="${mobile?203:388}" preserveAspectRatio="xMidYMid meet"/>`;
  if (mobile) {
    const words = profile.name.split(' ');
    body += text(words.slice(0,-1).join(' '),20,112,'strong',18);
    body += text(words.at(-1),20,135,'strong',18);
    body += text(profile.focus,20,162,'',12);
    wrap(profile.description,28).slice(0,2).forEach((value,i)=>{
      body += text(value,20,183+i*16,'muted',11);
    });
    if (showToolkit && profile.toolkit.length) {
      body += text('toolkit',20,216,'key',12);
      body += text(profile.toolkit.slice(0,2).join(' / '),20,237,'',12);
      body += text(profile.toolkit.slice(2).join(' / '),20,258,'',12);
    }
    if (showToolkit && profile.tools.length) body += line('Tools',profile.tools.join(' / '),301);
    if (showToolkit && profile.learning.length) {
      body += line('Learning',profile.learning.slice(0,2).join(' / '),324);
      body += line('',profile.learning.slice(2).join(' / '),345);
    }
  } else {
    body += text(profile.name,x,112,'strong',22);
    body += text(profile.focus,x,138,'key',14);
    body += text(profile.description,x,165,'muted',13);
    if (showToolkit && (profile.toolkit.length || profile.tools.length || profile.learning.length)) body += section('toolkit',195);
    if (showToolkit && profile.toolkit.length) body += line('Stack',profile.toolkit.join(' / '),222);
    if (showToolkit && profile.tools.length) body += line('Tools',profile.tools.join(' / '),246);
    if (showToolkit && profile.learning.length) {
      body += line('Learning',profile.learning.slice(0,2).join(' / '),270);
      body += line('',profile.learning.slice(2).join(' / '),292);
    }
  }
  const languageY = mobile?379:324;
  if (showLanguages) body += section('languages',languageY);
  (showLanguages ? shares : []).forEach(([name,percent],i)=>{
    const px = x+(i%2)*(mobile?196:246), py = languageY+26+Math.floor(i/2)*22;
    body += text(name,px,py,'',mobile?12:13);
    body += text(percent,px+(mobile?178:220),py,'key',mobile?12:13).replace('<text ', '<text text-anchor="end" ');
  });
  if (showLanguages && !shares.length) body += text('No language data yet.',x,languageY+26,'muted',13);
  const contactY = (mobile?489:429)+extra;
  if (entries.length) body += section('contacts',contactY);
  const contacts = entries.map(([label,url])=>[label,
    label==='GitHub' ? `@${profile.username}` : label==='Mail' ? profile.email : safeUrl(url)?'open ↗':'[add URL]']);
  if (mobile) {
    contacts.forEach(([key,value],i)=>{body+=line(key,value,contactY+26+i*22);});
  } else {
    const primary = contacts.filter(([key])=>key==='GitHub' || key==='Mail');
    primary.forEach(([key,value],i)=>{body += line(key,value,contactY+25+i*22);});
    contacts.filter(([key])=>key!=='GitHub' && key!=='Mail').forEach(([key,value],i)=>{
      body+=text(`${key}: ${value}`,x+i*157,contactY+72,'',12);
    });
  }
  body += text('~ $ open links',mobile?20:28,height-22,'prompt',12);
  for (const [i,color] of ['#29432c','#386623','#508544','#78a762','#a4cb85','#d1e8b6'].entries()) {
    body+=`<rect x="${width-154+i*20}" y="${height-34}" width="20" height="12" fill="${color}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escape(profile.name)} — terminal profile</title>
<desc id="desc">${escape(profile.description)} ${showToolkit ? `Toolkit: ${escape(profile.toolkit.join(', '))}.` : ''} ${showLanguages ? `Languages by code bytes: ${shares.map(([name,percent])=>`${escape(name)} ${percent}`).join(', ')}. ${snapshot.includePrivate?'Public and selected private':'Original public'} repositories. Checked ${escape(snapshot.updated)}.` : ''} Click the terminal in the README to open profile links.</desc>
<style>text{font-family:Consolas,Menlo,ui-monospace,monospace;fill:#d0e4c4;white-space:pre}.key,.prompt{fill:#9cda7d}.muted{fill:#869b81}.strong{fill:#e2f0da;font-weight:600}</style>
${body}</svg>\n`;
}

export function renderLinks(profile) {
  const entries = contactEntries(profile);
  return `# ${normalizeProfile(profile).name.replace(/[\r\n]/g,' ')} · links\n\n`+entries.map(([label,url])=>
    safeUrl(url)?`- [${label}](<${safeUrl(url).replaceAll('>','%3E')}>)`:`- ${label}: add your URL in \`profile.json\``).join('\n')+'\n';
}

export async function writeProfile(snapshot) {
  const root = new URL('../',import.meta.url);
  const profile = JSON.parse(await readFile(new URL('profile.json',root),'utf8'));
  const tiger = await readFile(new URL('assets/tiger-outline.png',root));
  const tigerData = `data:image/png;base64,${tiger.toString('base64')}`;
  await mkdir(new URL('assets/',root),{recursive:true});
  const desktop = renderTerminal({profile,snapshot,tigerData});
  const mobile = renderTerminal({profile,snapshot,tigerData,mobile:true});
  await writeFile(new URL('assets/terminal.svg',root),desktop);
  await writeFile(new URL('assets/terminal-mobile.svg',root),mobile);
  await writeFile(new URL('LINKS.md',root),renderLinks(profile));
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const snapshot=JSON.parse(await readFile(new URL('../data/languages.json',import.meta.url),'utf8'));
  await writeProfile(snapshot);
  console.log('Rendered terminal profile from saved language data.');
}
