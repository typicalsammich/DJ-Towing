const menu=document.querySelector('.menu'),links=document.querySelector('.links');
if(menu&&links){
  menu.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-controls','primary-navigation');
  links.id=links.id||'primary-navigation';
  menu.addEventListener('click',()=>{
    const open=links.classList.toggle('open');
    menu.setAttribute('aria-expanded',String(open));
  });
  links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{links.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&links.classList.contains('open')){links.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.focus()}});
  document.addEventListener('click',e=>{if(links.classList.contains('open')&&!e.target.closest('.nav')){links.classList.remove('open');menu.setAttribute('aria-expanded','false')}});
}

// Active nav state
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
document.querySelectorAll('.links a').forEach(a=>{const href=(a.getAttribute('href')||'').toLowerCase();if(href===page)a.classList.add('active')});

// Demo forms
for(const f of document.querySelectorAll('.form'))f.addEventListener('submit',e=>{e.preventDefault();alert('Request saved in this demo. Connect this form to Towbook before launch.')});

// Full click-through towing assistant
const launcher=document.querySelector('.chat');
const box=document.querySelector('.chatbox');
const closeBtn=document.querySelector('.chat-close');
const messages=document.querySelector('.chat-messages');
const options=document.querySelector('.chat-options');
const inputRow=document.querySelector('.chat-input-row');
const chatInput=document.querySelector('.chat-input');
const sendBtn=document.querySelector('.chat-send');
const resetBtn=document.querySelector('.chat-reset');
let state={flow:null,step:null,data:{}};
const flows={
 tow:{label:'Request a Tow',steps:[{key:'urgency',q:'Is the vehicle in a dangerous location or blocking traffic?',opts:['Yes, urgent','No, safe location']},{key:'vehicle',q:'What type of vehicle needs towing?',opts:['Car / SUV','Pickup truck','Van / work vehicle','Medium duty vehicle']},{key:'issue',q:'What best describes the situation?',opts:['Breakdown','Accident','Won’t start','Scheduled transport','Other']},{key:'location',q:'What is the pickup location?',input:'Type the address or nearest cross street'}]},
 roadside:{label:'Roadside Assistance',steps:[{key:'issue',q:'What kind of roadside help do you need?',opts:['Dead battery','Flat tire','Locked out','Vehicle will not run','Need a tow']},{key:'location',q:'Where is the vehicle located?',input:'Address, freeway, or cross street'}]},
 ppi:{label:'Private Property',steps:[{key:'role',q:'Are you the property owner or an authorized representative?',opts:['Property owner','Property manager','Authorized representative','I am not sure']},{key:'request',q:'What do you need help with?',opts:['Unauthorized vehicle','Blocked access','Repeat parking issue','Set up towing service']},{key:'location',q:'What is the property address?',input:'Property address'}]},
 release:{label:'Vehicle / Impound Help',steps:[{key:'need',q:'What do you need help with?',opts:['Vehicle release information','Where is my vehicle?','Impound question','Speak with dispatch']}]},
 medium:{label:'Medium Duty',steps:[{key:'vehicle',q:'What type of vehicle is it?',opts:['Box truck','Work truck','Delivery vehicle','Large van','Other medium duty']},{key:'status',q:'What happened?',opts:['Breakdown','Accident','Transport only','Other']},{key:'location',q:'Where is the vehicle now?',input:'Address or nearest cross street'}]}
};
function addBubble(text,who='bot'){if(!messages)return;const b=document.createElement('div');b.className='bubble '+who;b.textContent=text;messages.appendChild(b);messages.scrollTop=messages.scrollHeight}
function setOptions(items,handler){if(!options)return;options.innerHTML='';items.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='chat-option';b.textContent=item;b.addEventListener('click',()=>handler(item));options.appendChild(b)})}

let historyStack=[];
function ensureFlowBar(){
  if(!box || box.querySelector('.chat-flowbar')) return;
  const bar=document.createElement('div');
  bar.className='chat-flowbar';
  bar.innerHTML='<div class="chat-flowbar-top"><button class="chat-back" type="button">← Back</button><span class="chat-step-label">Start</span></div><div class="chat-progress"><span></span></div>';
  const head=box.querySelector('.chathead'); head.insertAdjacentElement('afterend',bar);
  bar.querySelector('.chat-back').addEventListener('click',goChatBack);
}
function updateFlowBar(){
  ensureFlowBar();
  const bar=box&&box.querySelector('.chat-flowbar'); if(!bar)return;
  const label=bar.querySelector('.chat-step-label'), fill=bar.querySelector('.chat-progress span'), back=bar.querySelector('.chat-back');
  if(!state.flow || state.flow==='general'){label.textContent=state.flow==='general'?'General question':'Choose a service';fill.style.width=state.flow==='general'?'50%':'8%';back.style.visibility=historyStack.length?'visible':'hidden';return}
  const total=flows[state.flow].steps.length;
  const current=Math.min((state.step||0)+1,total);
  label.textContent=`Step ${current} of ${total}`;
  fill.style.width=`${Math.max(8,Math.round(((state.step||0)/total)*100))}%`;
  back.style.visibility=historyStack.length?'visible':'hidden';
}
function snapshotState(){historyStack.push(JSON.stringify(state)); if(historyStack.length>12)historyStack.shift()}
function goChatBack(){
  if(!historyStack.length)return;
  try{state=JSON.parse(historyStack.pop())}catch(e){return}
  messages.innerHTML=''; options.innerHTML=''; inputRow.hidden=true;
  addBubble("You're back one step. Choose or enter the updated answer.");
  if(!state.flow){homeChat(false);return}
  if(state.flow==='general'){addBubble('What would you like to ask?');inputRow.hidden=false;chatInput.placeholder='Type your question';updateFlowBar();return}
  runStep();
}
function homeChat(clearHistory=true){state={flow:null,step:null,data:{}};if(clearHistory)historyStack=[];messages.innerHTML='';inputRow.hidden=true;addBubble("Hi, I'm DJ's Towing assistant. I can help route your request before you call dispatch.");addBubble('What can I help you with today?');setOptions(['Request a Tow','Roadside Assistance','Medium Duty Towing','Private Property / PPI','Vehicle / Impound Help','General Question'],chooseFlow);updateFlowBar()}
function chooseFlow(label){snapshotState();addBubble(label,'user');const map={'Request a Tow':'tow','Roadside Assistance':'roadside','Medium Duty Towing':'medium','Private Property / PPI':'ppi','Vehicle / Impound Help':'release'};if(label==='General Question'){options.innerHTML='';inputRow.hidden=false;chatInput.placeholder='Type your question';state.flow='general';updateFlowBar();return}state.flow=map[label];state.step=0;state.data={service:label};runStep()}
function runStep(){const flow=flows[state.flow];if(!flow)return;updateFlowBar();const step=flow.steps[state.step];if(!step){finishFlow();return}addBubble(step.q);if(step.opts){inputRow.hidden=true;setOptions(step.opts,val=>{snapshotState();addBubble(val,'user');state.data[step.key]=val;state.step++;runStep()})}else if(step.input){options.innerHTML='';inputRow.hidden=false;chatInput.value='';chatInput.placeholder=step.input;chatInput.focus()}}
function submitInput(){const val=chatInput.value.trim();if(!val)return;snapshotState();addBubble(val,'user');if(state.flow==='general'){chatInput.value='';addBubble('Thanks. For a specific answer or urgent help, dispatch can assist at 323-530-0000. You can also choose a service flow below.');inputRow.hidden=true;setOptions(['Request a Tow','Roadside Assistance','Private Property / PPI','Call Dispatch'],v=>{if(v==='Call Dispatch')location.href='tel:+13235300000';else chooseFlow(v)});return}const flow=flows[state.flow],step=flow.steps[state.step];state.data[step.key]=val;chatInput.value='';state.step++;inputRow.hidden=true;runStep()}
function finishFlow(){options.innerHTML='';inputRow.hidden=true;const d=state.data;addBubble('Thanks. I have the basics. For live dispatch and availability, call DJ\'s Towing now.');const summary=document.createElement('div');summary.className='bubble bot';summary.innerHTML='<strong>Request summary</strong><div class="chat-summary">'+Object.entries(d).map(([k,v])=>'<div class="chat-summary-row"><span>'+String(k).replace(/[<>]/g,'')+'</span><span>'+String(v).replace(/[<>]/g,'')+'</span></div>').join('')+'</div><a class="chat-urgent" href="tel:+13235300000">Call Dispatch 323-530-0000</a>';messages.appendChild(summary);setOptions(['Start Over','Open Request Form'],v=>{if(v==='Start Over')homeChat();else location.href='contact.html'});messages.scrollTop=messages.scrollHeight}
if(sendBtn)sendBtn.addEventListener('click',submitInput);if(chatInput)chatInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitInput()}});if(resetBtn)resetBtn.addEventListener('click',homeChat);if(launcher)launcher.addEventListener('click',()=>{box.classList.toggle('open');if(box.classList.contains('open')&&!messages.children.length)homeChat()});if(closeBtn)closeBtn.addEventListener('click',()=>box.classList.remove('open'));

// Self-contained interactive Montebello map.
// No Leaflet, Google Maps JavaScript API, CARTO, or API key is required.
// The Montebello shade is drawn in geographic coordinates, so it moves with the map.
(function initMontebelloBoundaryMap(){
  const el=document.getElementById('serviceMap');
  if(!el) return;

  // Montebello municipal footprint, stored as longitude/latitude pairs.
  // This is intentionally a polygon layer, not a screen-positioned shape or radius.
  const montebello=[
    [-118.1410,34.0213],[-118.1392,34.0336],[-118.1322,34.0402],
    [-118.1200,34.0410],[-118.1100,34.0372],[-118.0997,34.0340],
    [-118.0923,34.0274],[-118.0915,34.0190],[-118.0940,34.0146],
    [-118.0970,34.0110],[-118.0992,34.0065],[-118.1016,34.0028],
    [-118.1041,33.9990],[-118.1079,33.9950],[-118.1128,33.9927],
    [-118.1180,33.9919],[-118.1230,33.9941],[-118.1257,33.9971],
    [-118.1294,34.0010],[-118.1320,34.0043],[-118.1344,34.0080],
    [-118.1370,34.0120],[-118.1390,34.0165],[-118.1410,34.0213]
  ];

  el.innerHTML='';
  el.classList.add('slippy-map');
  el.tabIndex=0;
  el.setAttribute('aria-label','Interactive grayscale map with Montebello shaded blue');

  const tiles=document.createElement('div');
  tiles.className='slippy-tiles';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','slippy-overlay');
  svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('class','montebello-geo-shade');
  svg.appendChild(path);

  const controls=document.createElement('div');
  controls.className='slippy-controls';
  const zin=document.createElement('button'); zin.type='button'; zin.textContent='+'; zin.setAttribute('aria-label','Zoom in');
  const zout=document.createElement('button'); zout.type='button'; zout.textContent='−'; zout.setAttribute('aria-label','Zoom out');
  controls.append(zin,zout);

  const attr=document.createElement('div');
  attr.className='slippy-attribution';
  attr.innerHTML='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

  el.append(tiles,svg,controls,attr);

  let center={lat:34.0159,lng:-118.1138};
  let zoom=12;
  let drag=null;
  const TILE=256;

  function worldSize(z){return TILE*Math.pow(2,z)}
  function lngToX(lng,z){return (lng+180)/360*worldSize(z)}
  function latToY(lat,z){
    const sin=Math.sin(lat*Math.PI/180);
    return (0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*worldSize(z);
  }
  function xToLng(x,z){return x/worldSize(z)*360-180}
  function yToLat(y,z){
    const n=Math.PI-2*Math.PI*y/worldSize(z);
    return 180/Math.PI*Math.atan(Math.sinh(n));
  }
  function clampLat(lat){return Math.max(-85.0511,Math.min(85.0511,lat))}
  function normalizeLng(lng){while(lng>180)lng-=360;while(lng<-180)lng+=360;return lng}

  function render(){
    const w=el.clientWidth||900;
    const h=el.clientHeight||442;
    if(!w||!h) return;
    const cx=lngToX(center.lng,zoom), cy=latToY(center.lat,zoom);
    const left=cx-w/2, top=cy-h/2;
    const x0=Math.floor(left/TILE)-1, x1=Math.floor((left+w)/TILE)+1;
    const y0=Math.floor(top/TILE)-1, y1=Math.floor((top+h)/TILE)+1;
    const max=Math.pow(2,zoom);

    tiles.innerHTML='';
    for(let ty=y0;ty<=y1;ty++){
      if(ty<0||ty>=max) continue;
      for(let tx=x0;tx<=x1;tx++){
        const wrap=((tx%max)+max)%max;
        const img=document.createElement('img');
        img.className='slippy-tile';
        img.alt='';
        img.draggable=false;
        img.style.left=(tx*TILE-left)+'px';
        img.style.top=(ty*TILE-top)+'px';
        img.src=`https://tile.openstreetmap.org/${zoom}/${wrap}/${ty}.png`;
        img.dataset.fallback='0';
        img.addEventListener('error',()=>{
          if(img.dataset.fallback==='0'){
            img.dataset.fallback='1';
            img.src=`https://a.tile.openstreetmap.fr/hot/${zoom}/${wrap}/${ty}.png`;
          }else{
            img.style.display='none';
          }
        });
        tiles.appendChild(img);
      }
    }

    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const d=montebello.map((p,i)=>{
      const x=lngToX(p[0],zoom)-left;
      const y=latToY(p[1],zoom)-top;
      return `${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ')+' Z';
    path.setAttribute('d',d);
  }

  function zoomAt(nextZoom,px,py){
    nextZoom=Math.max(9,Math.min(17,nextZoom));
    if(nextZoom===zoom) return;
    const w=el.clientWidth,h=el.clientHeight;
    const oldCx=lngToX(center.lng,zoom), oldCy=latToY(center.lat,zoom);
    const worldX=oldCx-w/2+px, worldY=oldCy-h/2+py;
    const lng=xToLng(worldX,zoom), lat=yToLat(worldY,zoom);
    zoom=nextZoom;
    const targetX=lngToX(lng,zoom), targetY=latToY(lat,zoom);
    const newCx=targetX-(px-w/2), newCy=targetY-(py-h/2);
    center.lng=normalizeLng(xToLng(newCx,zoom));
    center.lat=clampLat(yToLat(newCy,zoom));
    render();
  }

  zin.addEventListener('click',()=>zoomAt(zoom+1,el.clientWidth/2,el.clientHeight/2));
  zout.addEventListener('click',()=>zoomAt(zoom-1,el.clientWidth/2,el.clientHeight/2));
  el.addEventListener('wheel',e=>{
    e.preventDefault();
    const r=el.getBoundingClientRect();
    zoomAt(zoom+(e.deltaY<0?1:-1),e.clientX-r.left,e.clientY-r.top);
  },{passive:false});

  el.addEventListener('pointerdown',e=>{
    if(e.target.closest('.slippy-controls')||e.target.closest('.slippy-attribution')) return;
    el.setPointerCapture(e.pointerId);
    drag={x:e.clientX,y:e.clientY,cx:lngToX(center.lng,zoom),cy:latToY(center.lat,zoom)};
    el.classList.add('dragging');
  });
  el.addEventListener('pointermove',e=>{
    if(!drag) return;
    const nx=drag.cx-(e.clientX-drag.x), ny=drag.cy-(e.clientY-drag.y);
    center.lng=normalizeLng(xToLng(nx,zoom));
    center.lat=clampLat(yToLat(ny,zoom));
    render();
  });
  const stopDrag=()=>{drag=null;el.classList.remove('dragging')};
  el.addEventListener('pointerup',stopDrag);
  el.addEventListener('pointercancel',stopDrag);
  el.addEventListener('keydown',e=>{
    const step=80;
    let cx=lngToX(center.lng,zoom),cy=latToY(center.lat,zoom),handled=true;
    if(e.key==='ArrowLeft')cx-=step;
    else if(e.key==='ArrowRight')cx+=step;
    else if(e.key==='ArrowUp')cy-=step;
    else if(e.key==='ArrowDown')cy+=step;
    else if(e.key==='+'||e.key==='='){zoomAt(zoom+1,el.clientWidth/2,el.clientHeight/2);return}
    else if(e.key==='-'){zoomAt(zoom-1,el.clientWidth/2,el.clientHeight/2);return}
    else handled=false;
    if(handled){e.preventDefault();center.lng=normalizeLng(xToLng(cx,zoom));center.lat=clampLat(yToLat(cy,zoom));render()}
  });

  if('ResizeObserver' in window){new ResizeObserver(render).observe(el)}
  else window.addEventListener('resize',render);
  render();
})();

