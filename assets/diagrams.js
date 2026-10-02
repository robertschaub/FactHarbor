
document.addEventListener('DOMContentLoaded',()=>{for(const img of document.querySelectorAll('.md-content img[src$=".svg"]')){
 const box=document.createElement('div');box.className='diagram-box';const controls=document.createElement('div');controls.className='diagram-controls';
 const view=document.createElement('div');view.className='diagram-viewport';img.replaceWith(box);box.append(controls,view);view.append(img);
 const label=document.createElement('span');label.textContent='Diagram';controls.append(label);
 for(const [text,mode] of [['Fit width','fit'],['100%','actual']]){const button=document.createElement('button');button.textContent=text;button.type='button';button.onclick=()=>{img.style.width=mode==='fit'?'auto':img.naturalWidth+'px';img.style.maxWidth=mode==='fit'?'100%':'none';};controls.append(button);}
 const full=document.createElement('a');full.textContent='Open full-size';full.href=img.src;full.target='_blank';full.rel='noopener';controls.append(full);
}});
