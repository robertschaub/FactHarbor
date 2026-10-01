import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const here=dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const directory=resolve(here,'../../Docs/site/diagrams');
const runtime=resolve(dirname(require.resolve('mermaid/package.json')),'dist/mermaid.min.js');
const channel=process.argv.includes('--edge') ? 'msedge' : undefined;
const browser=await chromium.launch({headless:true,channel});
try {
  const page=await browser.newPage({viewport:{width:2000,height:1200}});
  await page.route('**/*',route=>route.abort());
  await page.setContent('<html><body style="margin:0;background:white"></body></html>');
  await page.addScriptTag({path:runtime});
  await page.evaluate(()=>mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'default',fontFamily:'Arial',htmlLabels:false,flowchart:{curve:'linear'},sequence:{useMaxWidth:false},themeVariables:{fontFamily:'Arial',fontSize:'18px'},deterministicIds:true}));
  let count=0;
  for (const name of readdirSync(directory).filter(name=>name.endsWith('.mmd')).sort()) {
    const source=readFileSync(resolve(directory,name),'utf8');
    const sha=createHash('sha256').update(source).digest('hex');
    const svg=await page.evaluate(async({source,id,sha})=>{
      const {svg}=await mermaid.render(id,source);
      const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
      if (doc.querySelector('parsererror,.error-icon,.error-text')) throw Error('Invalid SVG');
      const element=doc.documentElement;
      const box=element.getAttribute('viewBox').split(/[ ,]+/).map(Number);
      if (!box[2] || !box[3]) throw Error('Empty diagram');
      element.setAttribute('width',Math.ceil(box[2]));element.setAttribute('height',Math.ceil(box[3]));
      element.style.maxWidth='none';
      const metadata=doc.createElementNS('http://www.w3.org/2000/svg','metadata');
      metadata.setAttribute('id','mermaid-source-sha256');metadata.textContent=sha;
      element.prepend(metadata);
      return new XMLSerializer().serializeToString(element);
    },{source,id:'diagram'+count++,sha});
    writeFileSync(resolve(directory,name.replace(/\.mmd$/,'.svg')),svg);
  }
  console.log(`Rendered ${count} diagrams without network requests.`);
} finally {
  await browser.close();
}
