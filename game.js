'use strict';
const ASSET_BASE=new URL('assets/',document.currentScript.src||location.href).href;
const $=s=>document.querySelector(s);
const clone=x=>JSON.parse(JSON.stringify(x));
const SAVE_KEY='vn:'+GAME_ID+':v1';
const speakerName=s=>({'女主':'曾黎','男主':'骆文','冤魂':'张明','员工':'员工'}[s]||s);
const fresh=()=>({schemaVersion:1,ch:0,phase:'intro',cursor:0,inv:[],selected:null,flags:{},chatProgress:{},chatChoices:{},unlocked:0,log:[],seen:[],ending:null,endings:[],checkpoints:{}});
let state=fresh(),storageOK=true;
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e.timer);e.timer=setTimeout(()=>e.classList.remove('show'),1800);}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){if(storageOK)toast('浏览器无法保存，当前进度仅在本页保留');storageOK=false;}}
function load(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY));if(!x)return false;
 const c=CHAPTERS[x.ch];if(x.schemaVersion!==1||!Number.isInteger(x.ch)||!c||!['intro','task','outro','end'].includes(x.phase)||!Number.isInteger(x.cursor)||x.cursor<0||!Array.isArray(x.inv)||!Array.isArray(x.log)||!Array.isArray(x.seen)||!Array.isArray(x.endings)||!x.flags||!x.chatProgress||!x.chatChoices||!x.checkpoints)throw Error('save');
 if(['intro','outro'].includes(x.phase)&&x.cursor>=c[x.phase].length)throw Error('cursor');
 if(x.phase==='end'&&!ENDINGS.some(e=>e.id===x.ending))throw Error('ending');state=x;return true;
 }catch(e){toast('存档不可用，可从头开始');return false;}}
function cur(){return CHAPTERS[state.ch];}
function baseCheckpoint(){return clone({inv:state.inv,flags:state.flags,chatProgress:state.chatProgress,chatChoices:state.chatChoices,log:state.log,seen:state.seen});}
function enterChapter(i){state.ch=i;state.phase='intro';state.cursor=0;state.selected=null;state.ending=null;state.unlocked=Math.max(state.unlocked,i);state.checkpoints[i]=baseCheckpoint();closeModal();save();render();}
function applyScene(scene){if(!scene)return;if(scene.bg!==undefined)setBG(scene.bg);if(scene.loc!==undefined)$('#chLoc').textContent=scene.loc;if(scene.task!==undefined){$('#objective').hidden=!scene.task;$('#objText').textContent=scene.task;}}
function setBG(name){const bg=$('#bg');bg.dataset.name=name||'';bg.style.backgroundImage=name?'url("'+ASSET_BASE+encodeURIComponent(name)+'.webp"),linear-gradient(135deg,#3a3a3e,#4a4a4e 55%,#2e2e32)':'';}
function restoreScene(){const c=cur();setBG(c.bg);$('#chTitle').textContent=c.title;$('#chLoc').textContent=c.loc;$('#chIndex').textContent=String(state.ch+1).padStart(2,'0')+' / '+String(CHAPTERS.length).padStart(2,'0');$('#objective').hidden=true;
 if(state.phase==='intro')c.intro.slice(0,state.cursor+1).forEach(n=>applyScene(n.scene));
 else{c.intro.forEach(n=>applyScene(n.scene));applyScene(c.task&&c.task.scene);if(state.phase==='outro')c.outro.slice(0,state.cursor+1).forEach(n=>applyScene(n.scene));}
}
function addLog(id,who,text){if(state.seen.includes(id))return;state.seen.push(id);state.log.push({who,text});}
function button(text,cls,fn){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=fn;return b;}
function render(){
 $('#cover').hidden=true;$('#play').hidden=false;$('#ending').hidden=true;$('.inventory').hidden=false;$('#hotspots').replaceChildren();restoreScene();renderInventory();
 if(state.phase==='end'){renderEnding();return;}
 if(state.phase==='task'){$('#dialogue').hidden=true;renderTask();save();return;}
 $('#dialogue').hidden=false;
 const n=cur()[state.phase][state.cursor];if(!n){advancePhase();return;}
 $('#speaker').textContent=speakerName(n.speaker);$('#speaker').dataset.speaker=n.speaker;$('#lineText').textContent=n.text;$('#lineText').dataset.speaker=n.speaker;$('#moment').textContent=$('#chLoc').textContent;
 addLog(state.ch+':'+state.phase+':'+state.cursor,n.speaker,n.text);
 $('#choices').replaceChildren();$('#nextBtn').hidden=!!n.choices;
 (n.choices||[]).forEach((o,i)=>$('#choices').append(button(o.text,'choice',()=>{
 Object.assign(state.flags,o.set||{});addLog(state.ch+':'+state.phase+':'+state.cursor+':choice','女主',o.text);
 state.cursor=o.goto===undefined?state.cursor+1:o.goto;render();})));
 save();
}
function advance(){if(state.phase==='task'||state.phase==='end')return;if(cur()[state.phase][state.cursor]?.choices)return;state.cursor++;render();}
function advancePhase(){state.cursor=0;
 if(state.phase==='intro'){state.phase='task';if(!cur().task){advancePhase();return;}}
 else if(state.phase==='task'){state.phase='outro';}
 else if(state.ch+1<CHAPTERS.length){enterChapter(state.ch+1);return;}
 else{finish();return;}render();}
function renderTask(){const t=cur().task;$('#objective').hidden=false;$('#objText').textContent=t.objective;
 if(t.kind==='hotspot'){const chId=cur().id;const giveHs=t.hotspots.filter(h=>!h.complete);const allInspected=giveHs.every(h=>state.flags[chId+':insp:'+h.id]);
  t.hotspots.forEach(h=>{const insp=!!state.flags[chId+':insp:'+h.id];const el=button('','hotspot'+(insp?' inspected':''),()=>{
  if(h.complete&&!allInspected){toast('需要先调查所有线索点');return;}
  if(h.need&&state.selected!==h.need){toast('需要先选择：'+ITEM_NAMES[h.need]);return;}
  if(h.give&&!state.inv.includes(h.give)){state.inv.push(h.give);toast('获得 · '+ITEM_NAMES[h.give]);}
  state.flags[chId+':insp:'+h.id]=true;save();
  if(h.inspect){const m=openModal('调查');if(h.img){const img=document.createElement('img');img.src=ASSET_BASE+encodeURIComponent(h.img)+'.webp';img.alt=h.label;img.style.cssText='width:100%;border:1px solid #ffffff40;margin-bottom:20px';m.append(img);}const p=document.createElement('p');p.textContent=h.inspect;p.style.cssText='font-size:15px;line-height:1.9;color:#ccc;margin-bottom:24px';m.append(p);m.append(button(h.complete?'进入剧情':'继续调查','small-btn',()=>{closeModal();if(h.complete)advancePhase();else render();}));}
  else if(h.complete){advancePhase();return;}else render();});
  el.dataset.hot=h.id;el.setAttribute('aria-label',h.label);el.title=h.label;el.style.left=h.x+'%';el.style.top=h.y+'%';
  const dot=document.createElement('span');dot.className='dot';el.append(dot);const label=document.createElement('span');label.className='hotlabel';label.textContent=(insp?'✓ ':'')+h.label;el.append(label);$('#hotspots').append(el);});}
 else if(t.kind==='chat'){$('#hotspots').append(button('打开聊天','chat-open',()=>openChat(t.topic)));openChat(t.topic);}
 else if(t.kind==='forum'){const ch=cur();const canPost=ch.id==='digging';renderForum(canPost);}
 else throw Error('未实现的任务类型：'+t.kind);
}
function renderInventory(){$('#items').replaceChildren();state.inv.forEach(id=>{const b=button(ITEM_NAMES[id]||id,'item'+(state.selected===id?' selected':''),()=>{const m=openModal(ITEM_NAMES[id]||id);const desc=ITEM_DESCS[id]||'';const p=document.createElement('p');p.textContent=desc;p.style.cssText='font-size:14px;line-height:1.9;color:#ccc;margin-bottom:24px';m.append(p);m.append(button(state.selected===id?'取消选择':'选择此物品','small-btn',()=>{state.selected=state.selected===id?null:id;closeModal();save();renderInventory();}));});b.dataset.item=id;$('#items').append(b);});}
function openModal(title){$('#modalBody').replaceChildren();const h=document.createElement('h2');h.textContent=title;$('#modalBody').append(h);$('#modal').hidden=false;return $('#modalBody');}
function closeModal(){$('#modal').hidden=true;}
function renderForum(canPost){const f=FORUM;const m=openModal(canPost?'网络调查与舆论引导':'校园论坛 · 文远科技事件');
 const wrap=document.createElement('div');wrap.style.cssText='max-height:60vh;overflow:auto';
 const tabs=document.createElement('div');tabs.style.cssText='display:flex;gap:8px;margin-bottom:16px';
 const tabBtn=(label,active,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className='small-btn'+(active?'':'');b.style.cssText=active?'border-color:#e8dfcc;color:#e8dfcc':'opacity:.6';b.onclick=()=>{fn();};return b;};
 let mode='posts';
 function paint(){wrap.replaceChildren();
  if(mode==='posts'){const publishedPosts=f.draftChoices.filter((_,i)=>state.flags['forum:post:'+i]).map(c=>c.publishedPost).filter(Boolean);const allPosts=[...publishedPosts,...f.posts];allPosts.forEach(p=>{const card=document.createElement('div');card.style.cssText='border:1px solid #ffffff30;padding:14px;margin-bottom:12px';if(publishedPosts.includes(p)){card.style.borderColor='#e8dfcc60';}const h=document.createElement('h3');h.textContent=p.title;h.style.cssText='font-size:15px;color:#f5f5f5;margin:0 0 8px';card.append(h);const meta=document.createElement('small');meta.textContent=p.author+' · '+p.time;meta.style.cssText='color:#999;font-size:10px;display:block;margin-bottom:8px';card.append(meta);const body=document.createElement('p');body.textContent=p.content;body.style.cssText='font-size:13px;color:#ccc;line-height:1.7;margin:0 0 10px';card.append(body);p.replies.forEach(r=>{const rep=document.createElement('div');rep.style.cssText='font-size:12px;color:#aaa;padding:4px 0 4px 12px;border-left:2px solid #ffffff20';rep.textContent=r.author+'：'+r.text;card.append(rep);});wrap.append(card);});
  if(canPost){const postSec=document.createElement('div');postSec.style.cssText='margin-top:16px;border-top:1px solid #ffffff30;padding-top:16px';const pl=document.createElement('p');pl.textContent='选择舆论引导策略：';pl.style.cssText='color:#e8dfcc;font-size:13px;margin-bottom:10px';postSec.append(pl);f.draftChoices.forEach((c,i)=>{const done=state.flags['forum:post:'+i];const b=button(c.text,'small-btn',()=>{state.flags['forum:post:'+i]=true;Object.assign(state.flags,c.set||{});save();toast(c.result||'已发布');paint();});b.style.cssText=done?'opacity:.5;border-color:#888':'margin-bottom:8px;display:block;width:100%;text-align:left';b.disabled=!!done;postSec.append(b);});const allDone=f.draftChoices.some((_,i)=>state.flags['forum:post:'+i]);if(allDone){const fin=button('完成舆论引导，继续剧情','small-btn',()=>{closeModal();advancePhase();});fin.style.cssText='margin-top:12px;border-color:#e8dfcc;color:#e8dfcc';postSec.append(fin);}wrap.append(postSec);}}
  else if(mode==='social'){(f.social||[]).forEach(s=>{const card=document.createElement('div');card.style.cssText='border:1px solid #ffffff30;padding:14px;margin-bottom:12px';const tag=document.createElement('span');tag.textContent=s.platform;tag.style.cssText='font-size:10px;color:#e8dfcc;border:1px solid #e8dfcc40;padding:2px 6px;margin-bottom:6px;display:inline-block';card.append(tag);const meta=document.createElement('small');meta.textContent=s.author+' · '+s.time;meta.style.cssText='color:#999;font-size:10px;display:block;margin-bottom:6px';card.append(meta);const body=document.createElement('p');body.textContent=s.text;body.style.cssText='font-size:13px;color:#ccc;line-height:1.7;margin:0';card.append(body);wrap.append(card);});}
  else if(mode==='company'){const c=f.company;const h=document.createElement('h3');h.textContent=c.name;h.style.cssText='font-size:18px;color:#f5f5f5;margin:0 0 12px';wrap.append(h);c.info.forEach(item=>{const row=document.createElement('div');row.style.cssText='display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #ffffff15';const k=document.createElement('span');k.textContent=item.label;k.style.cssText='color:#999;font-size:12px;min-width:80px';const v=document.createElement('span');v.textContent=item.value;v.style.cssText='color:#ccc;font-size:13px';row.append(k,v);wrap.append(row);});}
  tabs.replaceChildren(tabBtn('论坛帖子',mode==='posts',()=>{mode='posts';paint();}),tabBtn('社媒讨论',(f.social||[]).length>0&&mode==='social',()=>{mode='social';paint();}),tabBtn('公司信息',mode==='company',()=>{mode='company';paint();}));if(!(f.social||[]).length){tabs.querySelectorAll('button')[1]&&tabs.querySelectorAll('button')[1].remove();}if(!canPost){const cont=button('继续剧情','small-btn',()=>{closeModal();advancePhase();});cont.style.cssText='margin-top:16px;border-color:#e8dfcc;color:#e8dfcc';wrap.append(cont);}}
 m.append(tabs,wrap);paint();}
function openChat(topic){const msgs=CHATS[topic];if(!msgs)throw Error('未知聊天主题');
 let i=state.chatProgress[topic]||0;if(!Number.isInteger(i)||i<0||i>msgs.length){i=0;state.chatProgress[topic]=0;toast('该聊天进度不可用，已从头打开');}
 const replies=state.chatChoices[topic]||(state.chatChoices[topic]={});const m=openModal('聊天');
 const shell=document.createElement('div');shell.className='chat-shell';const body=document.createElement('div');body.id='chatBody';body.className='chat-body';const ctl=document.createElement('div');ctl.id='chatCtl';ctl.className='chat-controls';shell.append(body,ctl);m.append(shell);
 function bubble(who,text){const d=document.createElement('div');d.className='bubble '+({'女主':'him','男主':'me','冤魂':'friend','员工':'system'}[who]||'system');const small=document.createElement('small');small.textContent=speakerName(who);const t=document.createElement('span');t.textContent=text;d.append(small,t);body.append(d);}
 function paint(){body.replaceChildren();msgs.slice(0,i).forEach((n,k)=>{bubble(n.speaker,n.text);if(n.choices&&replies[k]!==undefined)bubble('女主',n.choices[replies[k]].text);});ctl.replaceChildren();
 const pending=i>0&&msgs[i-1].choices&&replies[i-1]===undefined;
 if(pending)msgs[i-1].choices.forEach((o,k)=>ctl.append(button(o.text,'chat-choice',()=>{replies[i-1]=k;Object.assign(state.flags,o.set||{});addLog('chat:'+topic+':'+(i-1)+':reply','女主',o.text);save();paint();})));
 else if(i<msgs.length)ctl.append(button('继续','chat-next',()=>{addLog('chat:'+topic+':'+i,msgs[i].speaker,msgs[i].text);i++;state.chatProgress[topic]=i;save();paint();}));
 else ctl.append(button('结束对话','chat-finish',()=>{closeModal();advancePhase();}));body.scrollTop=body.scrollHeight;
 }paint();save();
}
function finish(){const e=ENDINGS.find(x=>x.when(state));if(!e)throw Error('没有匹配结局');state.phase='end';state.ending=e.id;if(!state.endings.includes(e.id))state.endings.push(e.id);save();render();}
function renderEnding(){const e=ENDINGS.find(x=>x.id===state.ending);$('#dialogue').hidden=true;$('#objective').hidden=true;$('.inventory').hidden=true;$('#ending').hidden=false;$('#endingTag').textContent=e.tag;$('#endingTitle').textContent=e.title;$('#endingText').textContent=e.text;}
function startNew(){const endings=state.endings.slice();state=fresh();state.endings=endings;enterChapter(0);}
function openLog(){const m=openModal('对白回看');state.log.forEach(l=>{const d=document.createElement('div');d.className='log-entry';const name=document.createElement('small');name.textContent=speakerName(l.who);d.append(name,document.createTextNode(l.text));m.append(d);});}
function openChapters(){const m=openModal('章节');CHAPTERS.forEach((c,i)=>{const b=button(String(i+1).padStart(2,'0')+' · '+c.title,'chapter-link',()=>{const cp=state.checkpoints[i];if(!cp){toast('尚无该章起点，请从头开始');return;}Object.assign(state,clone(cp));state.ch=i;state.phase='intro';state.cursor=0;state.selected=null;state.ending=null;for(const k of Object.keys(state.checkpoints))if(Number(k)>i)delete state.checkpoints[k];state.unlocked=i;closeModal();save();render();});b.disabled=i>state.unlocked||!state.checkpoints[i];m.append(b);});}
$('#startBtn').onclick=startNew;$('#replayBtn').onclick=startNew;
$('#continueBtn').onclick=()=>{if(load())render();else startNew();};
$('#nextBtn').onclick=advance;$('#closeModal').onclick=closeModal;$('.modal-shade').onclick=closeModal;
$('#logBtn').onclick=openLog;$('#chapterBtn').onclick=openChapters;$('#endingChapterBtn').onclick=openChapters;
$('#helpBtn').onclick=()=>{const p=document.createElement('p');p.textContent='点击或按空格推进对话；选项处做出选择会影响结局走向。调查阶段：点击场景中发光热点进行调查，弹出调查结果对话框，需要全部调查完才能继续剧情。点击物品栏物品可查看详细介绍，需要物品的热点请先在物品弹窗中选择该物品。聊天可关闭后重新打开，进度会保留。';openModal('怎么玩').append(p);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();return;}if(![' ','Enter'].includes(e.key)||e.repeat)return;
 if(e.target.closest('button,input,textarea,select,[contenteditable]'))return;
 if($('#play').hidden||!$('#modal').hidden||$('#dialogue').hidden||$('#nextBtn').hidden||!$('#ending').hidden)return;e.preventDefault();advance();});
if(load())$('#continueBtn').hidden=false;
