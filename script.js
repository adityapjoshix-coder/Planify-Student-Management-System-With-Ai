var K='planify.dash.v3',$=function(s){return document.querySelector(s)},$$=function(s){return[].slice.call(document.querySelectorAll(s))};
var DEF={name:'Alex Morgan',role:'Student',ac:'#6C7AF2',theme:'auto',r:14,bt:'Welcome to Planify',bx:'Your whole school week in one place. Click any text to edit it.',mm:'text',ph:[],iv:4,bs:'dock',ap:'claude',pq:'',tx:'',td:'',ou:'http://localhost:11434',om:'llama3.2',au:'https://api.openai.com/v1',ak:'',am:'gpt-4o-mini',rep:'',rm:'1',ld:'0',sn:'chime',vl:80,rp:'3',sf:'',
order:{main:['banner','thought','stats','inbox','tasks','exams'],side:['calendar','sched']},hide:{},
stats:[{t:'Project Frog Surgery',s:'Biology',n:'Due 12 Aug, 10:45',p:75},{t:'Project Earth Quantum',s:'Physics',n:'Due 14 Aug, 3:00 PM',p:60}],
inbox:[{n:'Dorothy Richards',t:'09:32',m:'Don’t forget to work on assignment page 36.',f:'Homework.pdf'},{n:'Ernest Williamson',t:'23:45',m:'Have you made the history assignment?',f:'Syllabus History.pdf'}],
tasks:[{t:'Craft assignment',s:'Art · Chapter 2',m:'12:45 PM',d:1},{t:'Daily Task 2',s:'Physics · Page 18',m:'09:40 PM',d:0},{t:'Daily Task 2',s:'Chemistry · Page 23',m:'08:05 PM',d:0}],
exams:[{s:'Physics',c:'Class 3',d:'Tue',t:'08:30 AM'},{s:'Biology',c:'Lab 1',d:'Thu',t:'08:30 AM'},{s:'Math',c:'Class 8',d:'Mon',t:'08:30 AM'},{s:'Chemistry',c:'Lab 5',d:'Fri',t:'08:30 AM'}],
sched:[{s:'Physics',n:'Chapter 3 · Lab 3',tm:'9:00 AM'},{s:'History',n:'Chapter 4 · Class',tm:'10:30 AM'},{s:'Computer',n:'Chapter 2 · Lab 10',tm:'12:00 PM'},{s:'Geography',n:'Chapter 3 · Class',tm:'2:00 PM'},{s:'Math',n:'Chapter 4 · Class',tm:'3:30 PM'}]};
var NEW={stats:{t:'New project',s:'Subject',n:'Due soon',p:50},inbox:{n:'New sender',t:'now',m:'Write a message…',f:''},tasks:{t:'New task',s:'Subject · Page',m:'9:00 AM',d:0},exams:{s:'Subject',c:'Class',d:'Mon',t:'9:00 AM'},sched:{s:'Subject',n:'Chapter · Class',tm:'9:00 AM'}};
var THS=['Small steps every day beat big plans you never start.','Done is better than perfect. Start, then improve.','Your future self will thank you for the work you do today.','Focus on progress, not on being flawless.','A tidy plan makes a calm mind.','Ask one more question. Curiosity is your superpower.','Rest is part of studying, not the opposite of it.','You don’t need to see the whole staircase, just take the next step.','Mistakes are proof that you are trying.','Consistency turns ordinary days into extraordinary results.','Be kind to yourself; learning takes time.','One focused hour is worth three distracted ones.','Today’s effort is tomorrow’s confidence.','Break big goals into tiny tasks and tick them off.','You are closer than you were yesterday.','Begin with the hardest task while your energy is fresh.'];
var TT={thought:'Thought of the day',banner:'Welcome media',stats:'Project statistic',inbox:'Inbox',tasks:'Task',exams:'Exam schedule',calendar:'Calendar',sched:'Today schedule'};
var V={stats:'report',tasks:'task',exams:'test'},AV=['#B7E4C7','#FFD9C2','#BFE6F5','#D9D6FA','#FFE9A8','#F9C6CF'];
var st,view='home',mn=null,VID=null,tm=null,ctl=null,now=new Date(),cur={y:now.getFullYear(),m:now.getMonth()},sel=dk(now),showAll=false,SNZ=[],FR={},rt=null,ca=null,AC=null,SNDURL=null;
try{st=Object.assign(JSON.parse(JSON.stringify(DEF)),JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){st=JSON.parse(JSON.stringify(DEF))}
if(st.order.main.indexOf('thought')<0)st.order.main.splice(1,0,'thought');
st.tasks.forEach(function(t){if(!t.dt)t.dt=dk(now)});
try{FR=JSON.parse(localStorage.getItem('planify.fired')||'{}')}catch(z){}
function save(){try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function e(p,v,c){return'<span class="ed '+(c||'')+'" contenteditable="true" data-p="'+p+'">'+esc(v)+'</span>'}
function X(p,i){return'<button class="x" data-a="del" data-p="'+p+'" data-i="'+i+'" aria-label="Delete">×</button>'}
function H(k,add){return'<div class="wh"><h3>'+TT[k]+'</h3>'+(add?'<button class="lk" data-a="add" data-p="'+k+'">+ Add</button>':'')+'</div>'}
var W={
banner:function(){
 if(st.bs==='hide')return'';
 var m=st.mm,in_='';
 if(m==='photos'&&st.ph.length)in_=st.ph.map(function(s,i){return'<img alt="" src="'+s+'"'+(i?'':' class="on"')+'>'}).join('');
 else if(m==='video'&&VID)in_='<video src="'+VID+'" autoplay loop muted playsinline></video>';
 var hint=(m!=='text'&&!in_)?'<small class="hint">Add '+(m==='video'?'a video':'photos')+' in Customize › Banner media</small>':'';
 return'<section class="w banner'+(st.bs==='float'?' fl':'')+'"><div class="ban">'+in_+'<div class="ov"><span class="gr">Hi, '+esc(st.name)+'!</span>'+e('bt',st.bt,'h')+e('bx',st.bx,'p')+hint+'</div><div class="bc"><button data-a="pop" title="Pop out or dock" aria-label="Pop out or dock">⤢</button><button data-a="hide" title="Hide" aria-label="Hide">×</button></div></div></section>'},
stats:function(){return'<section class="w">'+H('stats',1)+st.stats.map(function(s,i){var q='stats.'+i+'.';return'<div class="card stat"><div class="ring" style="--p:'+s.p+'"><div><span>'+e(q+'p',s.p)+'</span><small>Percent</small></div></div><div class="g">'+e(q+'t',s.t,'b')+e(q+'s',s.s,'m')+e(q+'n',s.n,'m')+'</div>'+X('stats',i)+'</div>'}).join('')+'</section>'},
inbox:function(){return'<section class="w">'+H('inbox',1)+'<div class="card">'+st.inbox.map(function(s,i){var q='inbox.'+i+'.';return'<div class="row"><div class="av" style="background:'+AV[i%6]+'">'+esc((s.n||'?').charAt(0))+'</div><div class="g"><b>'+e(q+'n',s.n)+'</b> <span class="m" style="display:inline;float:right">'+e(q+'t',s.t)+'</span>'+e(q+'m',s.m,'m')+(s.f?'<span class="chipf">'+e(q+'f',s.f)+'</span>':'')+'</div>'+X('inbox',i)+'</div>'}).join('')+'</div></section>'},
tasks:function(){var lab=sel===dk(now)?'Today':new Date(sel+'T00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}),L=st.tasks.map(function(s,i){return[s,i]}).filter(function(x){return showAll||x[0].dt===sel});
 return'<section class="w"><div class="wh"><h3>Task · '+(showAll?'All dates':lab)+'</h3><span><button class="lk" data-a="all">'+(showAll?'Show '+lab:'Show all')+'</button> <button class="lk" data-a="add" data-p="tasks">+ Add</button></span></div>'+(L.length?L.map(function(x){var s=x[0],i=x[1],q='tasks.'+i+'.';return'<div class="row card'+(s.d?' on':'')+'" style="margin-bottom:8px"><div class="g">'+e(q+'t',s.t,'b')+e(q+'s',s.s,'m')+'<input type="date" class="dti" data-dt="'+i+'" value="'+esc(s.dt||'')+'" aria-label="Task date"></div><div class="tm">'+e(q+'m',s.m)+'</div><button class="pill'+(s.d?' d':'')+'" data-a="tog" data-i="'+i+'">'+(s.d?'Done':'Pending')+'</button>'+X('tasks',i)+'</div>'}).join(''):'<div class="card m">No tasks on '+lab+'. Click “+ Add” to create one for this day.</div>')+'</section>'},
exams:function(){return'<section class="w">'+H('exams',1)+'<div class="card">'+st.exams.map(function(s,i){var q='exams.'+i+'.';return'<div class="row'+(i?'':' on')+'"><div class="g">'+e(q+'s',s.s,'b')+'</div><div class="m" style="width:70px">'+e(q+'c',s.c)+'</div><div class="m" style="width:36px">'+e(q+'d',s.d)+'</div><div class="m" style="width:72px">'+e(q+'t',s.t)+'</div>'+X('exams',i)+'</div>'}).join('')+'</div></section>'},
thought:function(){var k=now.getFullYear()+'-'+now.getMonth()+'-'+now.getDate();if(st.td!==k){st.td=k;st.tx=''}var t=st.tx||THS[Math.floor((now-new Date(now.getFullYear(),0,0))/864e5)%THS.length];return'<section class="w thought"><div class="tb"><div class="qm" aria-hidden="true">“</div><div class="g"><span class="m">Good thought for today</span>'+e('tx',t,'tq')+'</div><button class="btn o" data-a="nt" title="Show another thought">↻ New</button></div></section>'},
calendar:function(){
 var HAS=hasMap(),f=new Date(cur.y,cur.m,1),lead=(f.getDay()+6)%7,dim=new Date(cur.y,cur.m+1,0).getDate(),h='<tr>'+['Mo','Tu','We','Th','Fr','Sa','Su'].map(function(d){return'<th>'+d+'</th>'}).join('')+'</tr><tr>';
 for(var i=0;i<lead;i++)h+='<td></td>';
 for(var d=1;d<=dim;d++){if((lead+d-1)%7===0&&d>1)h+='</tr><tr>';var t=cur.y===now.getFullYear()&&cur.m===now.getMonth()&&d===now.getDate(),key=cur.y+'-'+pad(cur.m+1)+'-'+pad(d);h+='<td><button data-a="day" data-p="'+d+'" class="'+(t?'t ':'')+(key===sel?'s ':'')+(HAS[key]?'h':'')+'">'+d+'</button></td>'}
 return'<section class="w"><div class="wh"><h3>Calendar</h3><span><button class="x" data-a="cal" data-p="-1" aria-label="Previous month">‹</button> '+new Date(cur.y,cur.m,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})+' <button class="x" data-a="cal" data-p="1" aria-label="Next month">›</button></span></div><table class="cal">'+h+'</tr></table></section>'},
sched:function(){return'<section class="w">'+H('sched',1)+st.sched.map(function(s,i){var q='sched.'+i+'.';return'<div class="row"><div class="av" style="background:'+AV[i%6]+'">'+esc((s.s||'?').charAt(0).toUpperCase())+'</div><div class="g">'+e(q+'s',s.s,'b')+e(q+'n',s.n,'m')+e(q+'tm',s.tm||'Add time…','m')+(s.x!=null?e(q+'x',s.x,'m'):'')+'</div>'+(s.b?'🔔':'')+'<div class="mw"><button class="x" data-a="menu" data-i="'+i+'" aria-label="Options">⋯</button>'+(mn===i?'<div class="menu"><button data-a="note" data-i="'+i+'">Add note</button><button data-a="edit" data-i="'+i+'">Edit</button><button data-a="bell" data-i="'+i+'">Notify me</button><button data-a="del" data-p="sched" data-i="'+i+'">Delete</button></div>':'')+'</div></div>'}).join('')+'</section>'}};
function R(){
 var p=st.ap,f='',n='',op=[['claude','Claude (built in)'],['ollama','Ollama (local)'],['openai','OpenAI-compatible']].map(function(o){return'<option value="'+o[0]+'"'+(o[0]===p?' selected':'')+'>'+o[1]+'</option>'}).join('');
 if(p==='ollama')f='<input data-s="ou" value="'+esc(st.ou)+'" aria-label="Ollama URL"><input data-s="om" value="'+esc(st.om)+'" aria-label="Model">';
 if(p==='openai'){f='<input data-s="au" value="'+esc(st.au)+'" aria-label="API base URL"><input type="password" data-s="ak" value="'+esc(st.ak)+'" placeholder="API key" aria-label="API key" autocomplete="off"><input data-s="am" value="'+esc(st.am)+'" aria-label="Model">';n='<small class="m" style="margin-bottom:8px">Works with OpenAI, Groq, OpenRouter, Gemini (OpenAI mode) and similar. Your key stays in this browser only.</small>'}
 if(p==='claude')n='<small class="m" style="margin-bottom:8px">Uses Claude directly, no setup. Available on the hosted page.</small>';
 return'<section class="w rep"><div class="wh"><h3>AI report</h3></div><div class="card"><div class="rr"><select data-s="ap" aria-label="AI provider">'+op+'</select>'+f+'</div>'+n+'<div class="rr"><input data-s="pq" value="'+esc(st.pq)+'" placeholder="Ask anything, e.g. Make me a study plan for Thursday" aria-label="Your prompt"><button class="btn" data-a="gen">Send</button><button class="btn o" data-a="gen" data-p="report">Weekly report</button><button class="btn o" data-a="stop">Stop</button></div><div class="out2" id="rep">'+esc(st.rep||'Type a question and press Send, or tap “Weekly report” for a summary of your tasks, exams and projects.')+'</div></div></section>'}
function render(){
 var s=document.documentElement.style;s.setProperty('--ac',st.ac);s.setProperty('--r',st.r+'px');
 if(st.theme==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',st.theme);
 $('#un').textContent=st.name;$('#ur').textContent=st.role;$('#av').textContent=(st.name||'?').charAt(0).toUpperCase();
 $$('#nav button').forEach(function(b){b.setAttribute('aria-current',b.dataset.p===view)});
 var vis=function(k){return!st.hide[k]&&(view==='home'||V[k]===view)};
 $('#main').innerHTML=st.order.main.filter(vis).map(function(k){return W[k]()}).join('')+(view==='report'?R():'');
 $('#side').innerHTML=st.order.side.filter(function(k){return!st.hide[k]}).map(function(k){return W[k]()}).join('');
 clearInterval(tm);var im=$$('.ban img');if(im.length>1){var j=0;tm=setInterval(function(){im[j].classList.remove('on');j=(j+1)%im.length;im[j].classList.add('on')},st.iv*1000)}
 var w='';['main','side'].forEach(function(r){w+=st.order[r].map(function(k,i){return'<div class="wr"><input type="checkbox" style="width:auto" data-w="'+k+'" '+(st.hide[k]?'':'checked')+' aria-label="Show '+TT[k]+'"><span>'+TT[k]+'</span><button data-a="mv" data-p="'+r+'" data-k="'+k+'" data-d="-1" aria-label="Move up">↑</button><button data-a="mv" data-p="'+r+'" data-k="'+k+'" data-d="1" aria-label="Move down">↓</button></div>'}).join('')+(r==='main'?'<hr style="border:0;border-top:1px solid var(--ln)">':'')});
 $('#wl').innerHTML=w}
function rs(f,cb){var r=new FileReader();r.onload=function(){var m=new Image();m.onload=function(){var k=Math.min(1,1000/m.width),c=document.createElement('canvas');c.width=m.width*k;c.height=m.height*k;c.getContext('2d').drawImage(m,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.72))};m.src=r.result};r.readAsDataURL(f)}
$('#fph').onchange=function(){var fs=[].slice.call(this.files).slice(0,5-st.ph.length),n=fs.length;this.value='';fs.forEach(function(f){rs(f,function(d){st.ph.push(d);if(--n===0){st.mm='photos';$('[data-s=mm]').value='photos';save();render()}})})};
$('#fvd').onchange=function(){if(this.files[0]){VID=URL.createObjectURL(this.files[0]);st.mm='video';$('[data-s=mm]').value='video';save();render()}};
$('#sw').innerHTML=['#6C7AF2','#2F5BEA','#14966B','#E5484D','#F08A24','#9B5DE5'].map(function(c){return'<button data-a="ac" data-p="'+c+'" style="background:'+c+'" aria-label="Accent '+c+'"></button>'}).join('');
function sync(){$$('#dr [data-s]').forEach(function(i){i.value=st[i.dataset.s]});$('#sfn').textContent=st.sf?'Using: '+st.sf:''}
async function eachLine(r,fn){var rd=r.body.getReader(),dc=new TextDecoder(),buf='';for(;;){var x=await rd.read();if(x.done)break;buf+=dc.decode(x.value,{stream:true});var ls=buf.split('\n');buf=ls.pop();ls.forEach(function(l){if(l.trim())fn(l.trim())})}}
async function gen(mode){
 var o=$('#rep');o.textContent='';ctl=new AbortController();
 var q=(mode==='report'?'':(st.pq||'').trim()),p0=q?'You are a friendly study coach for the student '+st.name+'. Answer this question, using their planner data where relevant: '+q+'\n':'You are a friendly study coach. Write a short weekly report (summary, risks, 3 next steps) for the student '+st.name+'.\n',p=p0+'Tasks: '+st.tasks.map(function(t){return t.t+' ('+t.s+', '+t.m+', '+(t.d?'done':'pending')+')'}).join('; ')+'\nExams: '+st.exams.map(function(x){return x.s+' '+x.d+' '+x.t}).join('; ')+'\nProjects: '+st.stats.map(function(x){return x.t+' '+x.p+'% complete'}).join('; ');
 try{
  if(st.ap==='claude'){
   var sm=window.claude&&claude.use?await claude.use('sample'):null;
   if(!sm)throw new Error('Built-in Claude only runs on the hosted page. Choose Ollama or OpenAI-compatible here.');
   var rr=await sm(p,{signal:ctl.signal,cache:false,onText:function(x){o.textContent=x.text}});o.textContent=rr.text;
  }else if(st.ap==='openai'){
   if(!st.ak)throw new Error('Enter your API key first.');
   var r=await fetch(st.au.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+st.ak},body:JSON.stringify({model:st.am,stream:true,messages:[{role:'user',content:p}]}),signal:ctl.signal});
   if(!r.ok)throw new Error('HTTP '+r.status+' (check key, model and base URL)');
   await eachLine(r,function(l){if(l.indexOf('data:')!==0||l.indexOf('[DONE]')>0)return;try{o.textContent+=JSON.parse(l.slice(5)).choices[0].delta.content||''}catch(z){}});
  }else{
   var r3=await fetch(st.ou.replace(/\/$/,'')+'/api/generate',{method:'POST',body:JSON.stringify({model:st.om,prompt:p,stream:true}),signal:ctl.signal});
   if(!r3.ok)throw new Error('HTTP '+r3.status);
   await eachLine(r3,function(l){try{o.textContent+=JSON.parse(l).response||''}catch(z){}});
  }
  st.rep=o.textContent;save()
 }catch(z){if(z.name!=='AbortError'){o.textContent='Could not generate the report: '+(z.message||z.code)+(st.ap==='ollama'?'\n\nCheck that Ollama is running, the model is pulled, and it was started with OLLAMA_ORIGINS=*. Ollama only works from the downloaded copy.':'')}}}

/* ---------- date helpers ---------- */
function pad(n){return(n<10?'0':'')+n}
function dk(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function hasMap(){var o={};st.tasks.forEach(function(t){if(t.dt)o[t.dt]=1});return o}
function pt(s){s=String(s||'');var m=/(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*([ap])\.?m\b/i.exec(s)||/(\d{1,2})\s*[:.]\s*(\d{2})()/.exec(s);if(!m)return null;var h=+m[1],n=+(m[2]||0),ap=(m[3]||'').toLowerCase();if(ap==='p'&&h<12)h+=12;if(ap==='a'&&h===12)h=0;if(h>23||n>59)return null;return h*60+n}

/* ---------- reminders, alarm and sound ---------- */
var SND={chime:[[880,0,.3],[1175,.25,.3],[1568,.5,.7]],bell:[[523,0,1.4,'triangle'],[1047,0,1.1],[1568,.02,.6]],beep:[[1000,0,.18,'square'],[1000,.3,.18,'square'],[1000,.6,.18,'square']],digital:[[1500,0,.1,'square'],[1200,.14,.1,'square'],[1500,.28,.1,'square'],[1200,.42,.1,'square']],soft:[[440,0,.6],[554,.35,.6],[659,.7,.9]]};
function ctx(){AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}
function patLen(n){var m=0;(SND[n]||SND.chime).forEach(function(x){m=Math.max(m,x[1]+x[2])});return m}
function playOnce(name,vol){var c=ctx(),t0=c.currentTime+.02;(SND[name]||SND.chime).forEach(function(n){var o=c.createOscillator(),g=c.createGain(),s=t0+n[1],pk=vol*(n[3]==='square'?.25:.5);o.type=n[3]||'sine';o.frequency.value=n[0];o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(Math.max(pk,.0002),s+.02);g.gain.exponentialRampToValueAtTime(.0001,s+n[2]);o.start(s);o.stop(s+n[2]+.05)})}
function stopRing(){clearTimeout(rt);rt=null;if(ca){ca.pause();ca=null}}
function ring(reps){stopRing();var n=0,vol=Math.max(0,Math.min(1,(+st.vl||0)/100)),name=st.sn;
 (function go(){n++;
  function next(){if((reps&&n>=reps)||n>=40){rt=null;return}rt=setTimeout(go,700)}
  if(name==='custom'&&SNDURL){ca=new Audio(SNDURL);ca.volume=vol;ca.onended=next;ca.play().catch(function(){note('Click anywhere on the page once so the browser allows sound.')})}
  else{try{playOnce(name==='custom'?'chime':name,vol)}catch(z){}rt=setTimeout(next,patLen(name)*1000+700)}
 })()}
function note(msg){var d=document.createElement('div');d.className='tst';d.textContent=msg;$('#al').appendChild(d);setTimeout(function(){d.remove()},5500)}
function askN(v){if(!window.Notification){if(v)note('This browser can’t show system alerts. In-page alarms still work.');return}if(Notification.permission==='default'||v)Notification.requestPermission().then(function(r){if(v)note(r==='granted'?'Browser alerts are on.':'Browser alerts are blocked. In-page alarms and sound still work.')})}
function fire(L){var it2=L.length>3?[{title:L.length+' reminders due',body:L.map(function(x){return x.title}).join(', ')}]:L;
 it2.forEach(function(it){var d=document.createElement('div');d.className='alc';d.innerHTML='<b>'+esc(it.title)+'</b><span class="m">'+esc(it.body||'')+'</span><div class="ab"><button class="btn o" data-a="snz">Snooze 5 min</button><button class="btn" data-a="ok">Dismiss</button></div>';d._it=it;$('#al').appendChild(d);try{if(window.Notification&&Notification.permission==='granted')new Notification('Planify · '+it.title,{body:it.body||''})}catch(z){}});
 ring(+st.rp)}
function items(){var L=[],n=new Date(),td=dk(n),wd=['sun','mon','tue','wed','thu','fri','sat'][n.getDay()];
 st.tasks.forEach(function(t){var m=pt(t.m);if(t.d||!t.dt||m==null)return;var at=new Date(t.dt+'T00:00');at.setMinutes(m);L.push({k:'t|'+t.dt+'|'+t.t+'|'+t.m,at:at,title:t.t,body:(t.s||'')+' · '+t.m+(t.dt!==td?' · '+t.dt:'')})});
 st.sched.forEach(function(s){var m=pt(s.tm);if(!s.b||m==null)return;var at=new Date(td+'T00:00');at.setMinutes(m);L.push({k:'s|'+td+'|'+s.s+'|'+s.tm,at:at,title:'Class: '+s.s,body:(s.n||'')+' · '+s.tm})});
 st.exams.forEach(function(x){var m=pt(x.t);if(String(x.d).slice(0,3).toLowerCase()!==wd||m==null)return;var at=new Date(td+'T00:00');at.setMinutes(m);L.push({k:'e|'+td+'|'+x.s+'|'+x.t,at:at,title:'Exam: '+x.s,body:(x.c||'')+' · '+x.t})});
 return L}
function chk(){if(st.rm==='0')return;var n=Date.now(),due=[];
 items().forEach(function(it){if(!FR[it.k]&&n>=it.at.getTime()-(+st.ld||0)*6e4){FR[it.k]=1;due.push(it)}});
 SNZ=SNZ.filter(function(z){if(n>=z.at){due.push(z.it);return false}return true});
 if(due.length){try{localStorage.setItem('planify.fired',JSON.stringify(FR))}catch(z){}fire(due)}}

/* custom alarm sound is kept in IndexedDB */
function idb(){return new Promise(function(ok,no){try{var r=indexedDB.open('planify-media',1);r.onupgradeneeded=function(){r.result.createObjectStore('m')};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}}catch(z){no(z)}})}
function idbDo(mode,f){return idb().then(function(d){return new Promise(function(ok,no){var q=f(d.transaction('m',mode).objectStore('m'));q.onsuccess=function(){ok(q.result)};q.onerror=function(){no(q.error)}})})}
function mPut(k,b){return idbDo('readwrite',function(s){return s.put(b,k)})}
function mGet(k){return idbDo('readonly',function(s){return s.get(k)})}
function mDel(k){return idbDo('readwrite',function(s){return s.delete(k)})}
function setSnd(b){if(SNDURL)URL.revokeObjectURL(SNDURL);SNDURL=URL.createObjectURL(b)}
function loadSnd(){mGet('snd').then(function(b){if(b)setSnd(b)}).catch(function(){})}
function clrSnd(){mDel('snd').catch(function(){});if(SNDURL)URL.revokeObjectURL(SNDURL);SNDURL=null;st.sn='chime';st.sf='';save();sync()}
$('#fsn').onchange=function(){var f=this.files[0];this.value='';if(!f)return;if(f.size>8e6){note('Please choose a sound under 8 MB.');return}mPut('snd',f).then(function(){setSnd(f);st.sn='custom';st.sf=f.name;save();sync();note('Your sound is saved. Press Test sound to hear it.')}).catch(function(){note('Couldn’t store that sound in this browser.')})};

document.addEventListener('click',function(ev){
 var b=ev.target.closest('[data-a]');
 if(!AC)try{ctx()}catch(z){}
 if(!b){if(mn!==null){mn=null;render()}return}
 var a=b.dataset.a,p=b.dataset.p,i=+b.dataset.i;
 if(a==='ok'||a==='snz'){var cd=b.closest('.alc');if(cd){if(a==='snz')SNZ.push({at:Date.now()+3e5,it:cd._it});cd.remove();if(!$('#al .alc'))stopRing()}return}
 if(a==='view'){view=p}
 else if(a==='dr'){$('#dr').classList.toggle('on');sync();return}
 else if(a==='mt'){st.bs=st.bs==='hide'?'dock':'hide'}
 else if(a==='pop'){st.bs=st.bs==='float'?'dock':'float'}
 else if(a==='hide'){var el=$('.banner');if(el)el.classList.add('out');setTimeout(function(){st.bs='hide';save();render()},220);return}
 else if(a==='add'){var nw=JSON.parse(JSON.stringify(NEW[p]));if(p==='tasks'){nw.dt=sel;showAll=false}st[p].push(nw)}
 else if(a==='del'){st[p].splice(i,1);mn=null}
 else if(a==='nt'){var c=st.tx,t3;do{t3=THS[Math.floor(Math.random()*THS.length)]}while(t3===c&&THS.length>1);st.tx=t3}
 else if(a==='tog'){st.tasks[i].d=st.tasks[i].d?0:1}
 else if(a==='menu'){mn=mn===i?null:i}
 else if(a==='note'){st.sched[i].x=st.sched[i].x||'Add a note…';mn=null}
 else if(a==='edit'){mn=null;render();var t=$$('#side .b')[i];if(t)t.focus();return}
 else if(a==='bell'){var sb=st.sched[i];sb.b=!sb.b;mn=null;if(sb.b){askN();if(pt(sb.tm)==null)note('Set a time on this class (like 9:00 AM) so Planify knows when to remind you.')}}
 else if(a==='cal'){cur.m+=+p;if(cur.m<0){cur.m=11;cur.y--}if(cur.m>11){cur.m=0;cur.y++}}
 else if(a==='day'){sel=cur.y+'-'+pad(cur.m+1)+'-'+pad(+p);showAll=false}
 else if(a==='ac'){st.ac=p;sync()}
 else if(a==='mv'){var ar=st.order[p],k=ar.indexOf(b.dataset.k),j=k+(+b.dataset.d);if(j>=0&&j<ar.length){var t2=ar[k];ar[k]=ar[j];ar[j]=t2}}
 else if(a==='clr'){st.ph=[];VID=null;st.mm='text';sync()}
 else if(a==='reset'){if(!confirm('Reset all Planify data and settings?'))return;st=JSON.parse(JSON.stringify(DEF));VID=null;sync()}
 else if(a==='all'){showAll=!showAll}
 else if(a==='tsnd'){ring(1);return}
 else if(a==='ntf'){askN(true);return}
 else if(a==='csn'){clrSnd();return}
 else if(a==='gen'){gen(p);return}
 else if(a==='stop'){if(ctl)ctl.abort();return}
 save();render()});
document.addEventListener('focusout',function(ev){var t=ev.target;if(!t.classList||!t.classList.contains('ed'))return;
 var q=t.dataset.p.split('.'),v=t.textContent.trim(),o=st,last=q[q.length-1];
 if(last==='p'&&q[0]==='stats'){v=Math.max(0,Math.min(100,parseInt(v)||0));t.textContent=v;t.closest('.ring').style.setProperty('--p',v)}
 for(var j=0;j<q.length-1;j++)o=o[q[j]];o[last]=v;save()});
document.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&ev.target.classList&&ev.target.classList.contains('ed')){ev.preventDefault();ev.target.blur()}});
document.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&ev.target.dataset&&ev.target.dataset.s==='pq')gen()});
document.addEventListener('input',function(ev){var t=ev.target,k=t.dataset&&t.dataset.s;if(!k)return;st[k]=(t.type==='range')?+t.value:t.value;save();if(['ou','om','au','ak','am','pq','vl','sn','rm','ld','rp'].indexOf(k)<0)render()});
document.addEventListener('change',function(ev){var t=ev.target;if(t.dataset&&t.dataset.w){st.hide[t.dataset.w]=!t.checked;save();render()}
 else if(t.dataset&&t.dataset.dt!=null){st.tasks[+t.dataset.dt].dt=t.value||dk(now);save();render()}});
sync();render();loadSnd();chk();setInterval(chk,15000);document.addEventListener('visibilitychange',function(){if(!document.hidden)chk()});
