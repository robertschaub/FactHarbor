// XWiki 2.1 Parser — extracted from Docs/xwiki-pages/viewer-impl/xwiki-viewer.html
// Standalone version for use in VS Code webview preview

class XWikiParser {
  constructor() { this.headings=[]; this.mermaidCounter=0; this._placeholders={}; this.wikiLinks=[]; }

  parse(source) {
    this.headings=[]; this.mermaidCounter=0; this._placeholders={}; this.wikiLinks=[];
    let html='';
    source = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    source = this.extractBlockMacros(source);
    const lines=source.split('\n');
    let i=0,listStack=[],inList=false,inTable=false,tableRows=[],tableGroupDepth=0;
    let pendingParams = null;

    while(i<lines.length){
      let line=lines[i];
      let trimmed = line.trim();

      // Parse parameter line: (% class="..." style="..." %)
      const paramMatch = trimmed.match(/^\(%\s*(.*?)\s*%\)$/);
      if(paramMatch){
        pendingParams = this.parseParams(paramMatch[1]);
        i++; continue;
      }

      // Inside a table with open ((( group — keep collecting lines
      if(inTable && tableGroupDepth > 0){
        tableRows.push(line);
        tableGroupDepth += (line.match(/\(\(\(/g)||[]).length;
        tableGroupDepth -= (line.match(/\)\)\)/g)||[]).length;
        i++; continue;
      }

      // Parse group start: (((
      if(trimmed === '(((' || trimmed.startsWith('(((')){
        if(inList){html+=this.cls(listStack);listStack=[];inList=false}
        if(inTable){html+=this.renderTable(tableRows);tableRows=[];inTable=false;tableGroupDepth=0}
        const groupAttrs = this.buildGroupAttrs(pendingParams);
        html += `<div${groupAttrs}>\n`;
        pendingParams = null;
        const afterOpen = trimmed.slice(3).trim();
        if(afterOpen){
          lines[i] = afterOpen;
          continue;
        }
        i++; continue;
      }

      // Parse group end: )))
      if(trimmed === ')))'){
        if(inList){html+=this.cls(listStack);listStack=[];inList=false}
        if(inTable){html+=this.renderTable(tableRows);tableRows=[];inTable=false;tableGroupDepth=0}
        html += '</div>\n';
        i++; continue;
      }

      if(line.trim()===''){if(inList){html+=this.cls(listStack);listStack=[];inList=false}if(inTable){if(tableGroupDepth>0){tableRows.push(line);i++;continue}html+=this.renderTable(tableRows);tableRows=[];inTable=false;tableGroupDepth=0}pendingParams=null;i++;continue}
      if(/^----\s*$/.test(line)){if(inList){html+=this.cls(listStack);listStack=[];inList=false}if(inTable){if(tableGroupDepth>0){tableRows.push(line);i++;continue}html+=this.renderTable(tableRows);tableRows=[];inTable=false;tableGroupDepth=0}html+='<hr>\n';pendingParams=null;i++;continue}
      const hm=line.match(/^(={1,6})\s+(.+?)\s+\1\s*$/)||line.match(/^(={1,6})\s+(.+?)\s*$/);
      if(hm){if(inList){html+=this.cls(listStack);listStack=[];inList=false}if(inTable){if(tableGroupDepth>0){tableRows.push(line);i++;continue}html+=this.renderTable(tableRows);tableRows=[];inTable=false;tableGroupDepth=0}const lv=hm[1].length,rt=hm[2],id=this.slug(rt);this.headings.push({level:lv,text:rt,id});const attrs=pendingParams?this.buildAttrs(pendingParams):'';html+=`<h${lv} id="${id}"${attrs}>${this.inl(rt)}</h${lv}>\n`;pendingParams=null;i++;continue}
      if(line.trim().startsWith('|')){if(inList){html+=this.cls(listStack);listStack=[];inList=false}inTable=true;tableRows.push(line);tableGroupDepth+=(line.match(/\(\(\(/g)||[]).length;tableGroupDepth-=(line.match(/\)\)\)/g)||[]).length;i++;continue}else if(inTable){html+=this.renderTable(tableRows);tableRows=[];inTable=false;tableGroupDepth=0}
      const ul=line.match(/^(\*+)\s+(.*)/);
      if(ul){
        const content = ul[2].trim();
        if(content === '(((' || content.startsWith('(((')){
          inList=true;
          const richContent = this.collectGroup(lines, i, content);
          html += this.li(listStack, ul[1].length, 'ul', richContent.html);
          i = richContent.nextIndex;
          continue;
        }
        inList=true;html+=this.li(listStack,ul[1].length,'ul',this.inl(ul[2]));i++;continue;
      }
      const ol=line.match(/^(1+)\.\s+(.*)/);
      if(ol){
        const content = ol[2].trim();
        if(content === '(((' || content.startsWith('(((')){
          inList=true;
          const richContent = this.collectGroup(lines, i, content);
          html += this.li(listStack, ol[1].length, 'ol', richContent.html);
          i = richContent.nextIndex;
          continue;
        }
        inList=true;html+=this.li(listStack,ol[1].length,'ol',this.inl(ol[2]));i++;continue;
      }
      if(inList){html+=this.cls(listStack);listStack=[];inList=false}
      const dm=line.match(/^;\s+(.*)/);
      if(dm){let d='<dl><dt>'+this.inl(dm[1])+'</dt>';i++;while(i<lines.length){const dd=lines[i].match(/^:\s+(.*)/);if(dd){d+='<dd>'+this.inl(dd[1])+'</dd>';i++}else break}html+=d+'</dl>\n';pendingParams=null;continue}
      if(line.startsWith('>')){let ql=[];while(i<lines.length&&lines[i].startsWith('>')){ql.push(lines[i].replace(/^>\s?/,''));i++}html+='<blockquote>'+ql.map(l=>this.inl(l)).join('<br>')+'</blockquote>\n';pendingParams=null;continue}
      if(line.match(/^%%XWIKI_BLOCK_\w+_\d+%%$/)){html+=line+'\n';pendingParams=null;i++;continue}

      // Paragraph
      let pl=[line];i++;
      while(i<lines.length){
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        if(nextTrimmed === '') break;
        if(/^={1,6}\s/.test(nextLine)) break;
        if(nextTrimmed.startsWith('|')) break;
        if(/^\*+\s/.test(nextLine)) break;
        if(/^1+\.\s/.test(nextLine)) break;
        if(nextLine.startsWith('>')) break;
        if(nextLine.startsWith(';')) break;
        if(/^----/.test(nextLine)) break;
        if(/^%%XWIKI_BLOCK_/.test(nextLine)) break;
        if(/^\(%.*%\)$/.test(nextTrimmed)) break;
        if(nextTrimmed.startsWith('(((')) break;
        if(nextTrimmed === ')))') break;
        pl.push(nextLine);
        i++;
      }
      const attrs = pendingParams ? this.buildAttrs(pendingParams) : '';
      html+=`<p${attrs}>`+pl.map(l=>this.inl(l)).join(' ')+'</p>\n';
      pendingParams = null;
    }
    if(inList) html+=this.cls(listStack);
    if(inTable) html+=this.renderTable(tableRows);
    return html;
  }

  collectGroup(lines, startLine, content) {
    let i = startLine;
    let afterOpen = content.slice(3).trim();
    let innerLines = [];
    if (afterOpen) innerLines.push(afterOpen);
    i++;
    let depth = 1;
    while (i < lines.length && depth > 0) {
      const trimmed = lines[i].trim();
      if (trimmed === '(((') depth++;
      else if (/^[\*1]+[\.\s]\s*\(\(\(/.test(trimmed)) depth++;
      if (trimmed === ')))') {
        depth--;
        if (depth === 0) { i++; break; }
      }
      innerLines.push(lines[i]);
      i++;
    }
    const innerSource = innerLines.join('\n');
    const subParser = new XWikiParser();
    let innerHtml = subParser.parse(innerSource);
    innerHtml = subParser.resolvePlaceholders(innerHtml);
    this.headings.push(...subParser.headings);
    this.wikiLinks.push(...subParser.wikiLinks);
    Object.assign(this._placeholders, subParser._placeholders);
    return { html: innerHtml, nextIndex: i };
  }

  parseParams(str){
    const params = {};
    const re = /(\w+)\s*=\s*["']([^"']*)["']/g;
    let m;
    while((m = re.exec(str)) !== null){
      params[m[1]] = m[2];
    }
    return params;
  }

  buildAttrs(params){
    let attrs = '';
    if(params.class) attrs += ` class="${this.esc(params.class)}"`;
    if(params.style) attrs += ` style="${this.esc(params.style)}"`;
    if(params.id) attrs += ` id="${this.esc(params.id)}"`;
    if(params.title) attrs += ` title="${this.esc(params.title)}"`;
    return attrs;
  }

  buildGroupAttrs(params){
    let classes = 'xwiki-group';
    let style = '';
    let other = '';
    if(params){
      if(params.class) classes += ' ' + params.class;
      if(params.style) style = params.style;
      if(params.id) other += ` id="${this.esc(params.id)}"`;
      if(params.title) other += ` title="${this.esc(params.title)}"`;
    }
    let attrs = ` class="${this.esc(classes)}"`;
    if(style) attrs += ` style="${this.esc(style)}"`;
    attrs += other;
    return attrs;
  }

  extractBlockMacros(s){let r=s,x=0;
    r=r.replace(/\{\{\{([\s\S]*?)\}\}\}/g,(m,c)=>{const k=`%%XWIKI_BLOCK_VERBATIM_${x++}%%`;this._placeholders[k]={type:'verbatim',content:c};return k});
    r=r.replace(/\{\{mermaid(?:\s[^}]*)?\}\}([\s\S]*?)\{\{\/mermaid\}\}/gi,(m,c)=>{const k=`%%XWIKI_BLOCK_MERMAID_${x++}%%`;this._placeholders[k]={type:'mermaid',content:c.trim()};return k});
    r=r.replace(/\{\{code(?:\s+language="([^"]*)")?\s*\}\}([\s\S]*?)\{\{\/code\}\}/gi,(m,l,c)=>{const k=`%%XWIKI_BLOCK_CODE_${x++}%%`;this._placeholders[k]={type:'code',lang:l||'',content:c.replace(/^\n/,'').replace(/\n$/,'')};return k});
    for(const bt of['info','warning','error','success']){const re=new RegExp(`\\{\\{${bt}(?:\\s+title="([^"]*)")?\\s*\\}\\}([\\s\\S]*?)\\{\\{\\/${bt}\\}\\}`,'gi');r=r.replace(re,(m,t,c)=>{const k=`%%XWIKI_BLOCK_BOX_${x++}%%`;this._placeholders[k]={type:'box',boxType:bt,title:t||'',content:c.trim()};return k})}
    r=r.replace(/\{\{toc\s*\/?\}\}/gi,()=>{const k=`%%XWIKI_BLOCK_TOC_${x++}%%`;this._placeholders[k]={type:'toc'};return k});
    r=r.replace(/\{\{include\s+reference="([^"]+)"[^}]*\/?\}\}/gi,(m,ref)=>{const k=`%%XWIKI_BLOCK_INCLUDE_${x++}%%`;this._placeholders[k]={type:'include',reference:ref};return k});
    return r;
  }

  resolvePlaceholders(html){
    for(const[k,d]of Object.entries(this._placeholders)){let r='';
      switch(d.type){
        case'mermaid':{const id=`mermaid-${this.mermaidCounter++}`;r=`<div class="mermaid-container"><div class="mermaid-label">Mermaid</div><div class="mermaid" id="${id}">${this.esc(d.content)}</div></div>`;break}
        case'code':{const ll=d.lang?`<span class="lang-label">${this.esc(d.lang)}</span>`:'';r=`<pre>${ll}<code>${this.esc(d.content)}</code></pre>`;break}
        case'box':{const ic={info:'ℹ️',warning:'⚠️',error:'❌',success:'✅'};const th=d.title?`<div class="box-title">${ic[d.boxType]||''} ${this.esc(d.title)}</div>`:'';r=`<div class="xwiki-box ${d.boxType}">${th}${this.inl(d.content)}</div>`;break}
        case'verbatim':{
          const c = d.content.replace(/^\n/,'').replace(/\n$/,'');
          r=`<pre class="xwiki-verbatim"><code>${this.esc(c)}</code></pre>`;
          break;
        }
        case'toc':r=this.renderTOC();break;
        case'include':{
          const ref = d.reference;
          r=`<div class="xwiki-include" data-include-ref="${this.esc(ref)}"><span class="include-icon">📄</span><span class="include-label">Include:</span> <a class="wiki-link" data-wiki-ref="${this.esc(ref)}" href="#">${this.esc(ref)}</a></div>`;
          break;
        }
      }
      html=html.replace(k,r);
    }
    return html;
  }

  inl(text){
    if(!text)return'';
    text=this.esc(text);
    text=text.replace(/##(.+?)##/g,'<code>$1</code>');
    text=text.replace(/`([^`]+?)`/g,'<code>$1</code>');
    text=text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    text=text.replace(/(?<![:\w])\/\/(.+?)\/\//g,'<em>$1</em>');
    text=text.replace(/--(.+?)--/g,'<del>$1</del>');
    text=text.replace(/\^\^(.+?)\^\^/g,'<sup>$1</sup>');
    text=text.replace(/,,(.+?),,/g,'<sub>$1</sub>');
    // External links
    text=text.replace(/\[\[([^\]]+?)&gt;&gt;(https?:\/\/[^\]]+?)\]\]/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
    text=text.replace(/\[\[(https?:\/\/[^\]]+?)\]\]/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
    // Wiki links
    text=text.replace(/\[\[([^\]]+?)&gt;&gt;(?!https?:\/\/)([^\]]+?)\]\]/g,(m,label,ref)=>{
      ref=ref.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
      this.wikiLinks.push(ref);
      return `<a class="wiki-link" data-wiki-ref="${this.esc(ref)}" href="#">${label}</a>`;
    });
    text=text.replace(/\[\[(?!https?:\/\/)([^\]]+?)\]\]/g,(m,ref)=>{
      const clean=ref.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
      this.wikiLinks.push(clean);
      return `<a class="wiki-link" data-wiki-ref="${this.esc(clean)}" href="#">${ref}</a>`;
    });
    text=text.replace(/\[\[image:([^\]|]+?)(?:\|[^\]]*)?\]\]/g,'<img src="$1" alt="image">');
    text=text.replace(/image:(https?:\/\/\S+)/g,'<img src="$1" alt="image">');
    text=text.replace(/\\\\/g,'<br>');
    return text;
  }

  li(stk,d,t,c){let h='';while(stk.length>d)h+=`</li></${stk.pop()}>`;if(stk.length<d){while(stk.length<d){h+=`<${t}>`;stk.push(t)}h+=`<li>${c}`}else h+=`</li><li>${c}`;return h}
  cls(stk){let h='';while(stk.length>0)h+=`</li></${stk.pop()}>`;return h+'\n'}
  renderTable(rawLines){
    if(!rawLines.length)return'';
    const logicalRows=[];
    let cur='',depth=0;
    for(const line of rawLines){
      if(line.trim().startsWith('|')&&depth===0){
        if(cur)logicalRows.push(cur);
        cur=line;
      }else{
        cur+='\n'+line;
      }
      depth+=(line.match(/\(\(\(/g)||[]).length;
      depth-=(line.match(/\)\)\)/g)||[]).length;
      if(depth<0)depth=0;
    }
    if(cur)logicalRows.push(cur);
    let h='<table>';
    for(const row of logicalRows){
      const cells=this.splitTableCells(row);
      h+='<tr>';
      for(const cell of cells){
        const ct=cell.trim();
        if(!ct)continue;
        const isHdr=ct.startsWith('=');
        const content=isHdr?ct.slice(1):ct;
        const rendered=this.renderCellContent(content.trim());
        h+=isHdr?`<th>${rendered}</th>`:`<td>${rendered}</td>`;
      }
      h+='</tr>';
    }
    return h+'</table>\n';
  }
  splitTableCells(row){
    const cells=[];let cur='',depth=0,i=0;
    while(i<row.length&&row[i]!=='|')i++;
    if(i<row.length)i++;
    while(i<row.length){
      if(row[i]==='('&&row.substring(i,i+3)==='((('){depth++;cur+='(((';i+=3;continue}
      if(row[i]===')'&&row.substring(i,i+3)===')))'){depth--;if(depth<0)depth=0;cur+=')))';i+=3;continue}
      if(row[i]==='|'&&depth===0){cells.push(cur);cur='';i++;continue}
      cur+=row[i];i++;
    }
    if(cur.trim())cells.push(cur);
    return cells;
  }
  renderCellContent(content){
    if(content.indexOf('(((')===-1) return this.inl(content);
    let result='',i=0;
    while(i<content.length){
      if(content.substring(i,i+3)==='((('){
        let depth=1,j=i+3;
        while(j<content.length&&depth>0){
          if(content.substring(j,j+3)==='((('){depth++;j+=3}
          else if(content.substring(j,j+3)===')))'){depth--;if(depth===0)break;j+=3}
          else j++;
        }
        const inner=content.substring(i+3,j);
        const subParser=new XWikiParser();
        let html=subParser.parse(inner.trim());
        html=subParser.resolvePlaceholders(html);
        this.headings.push(...subParser.headings);
        this.wikiLinks.push(...subParser.wikiLinks);
        Object.assign(this._placeholders,subParser._placeholders);
        result+='<div class="xwiki-cell-group">'+html+'</div>';
        i=j+3;
      }else{
        let nextGroup=content.indexOf('(((',i);
        if(nextGroup===-1)nextGroup=content.length;
        const seg=content.substring(i,nextGroup).trim();
        if(seg)result+=this.inl(seg);
        i=nextGroup;
      }
    }
    return result;
  }
  renderTOC(){if(!this.headings.length)return'';let h='<div class="xwiki-toc"><div class="toc-title">Table of Contents</div><ul>';for(const hd of this.headings)h+=`<li class="toc-h${hd.level}"><a href="#${hd.id}">${this.esc(hd.text)}</a></li>`;return h+'</ul></div>'}
  esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  escAttr(t){return t.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
  slug(t){return t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}
}

// Export for Node.js / VS Code webview
if(typeof module !== 'undefined') module.exports = { XWikiParser };
