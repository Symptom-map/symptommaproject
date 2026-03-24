import { useEffect, useRef, useCallback } from 'react';

export const DIAGNOSES = [
  { id: 'tda',   label: 'TDA\nTDAH',             color: '#3b82f6' },
  { id: 'tlp',   label: 'TLP\nBorderline',        color: '#a855f7' },
  { id: 'an',    label: 'Anorexia\nNerviosa',     color: '#fb7185' },
  { id: 'aut',   label: 'Rasgos\nAutistas',       color: '#10b981' },
  { id: 'cptsd', label: 'C-PTSD',                 color: '#f59e0b' },
  { id: 'bi',    label: 'Trastorno\nBipolar',     color: '#6366f1' },
  { id: 'anx',   label: 'Ansiedad\nGeneralizada', color: '#84cc16' },
];

export const DIAG_MAP = Object.fromEntries(DIAGNOSES.map(d => [d.id, d]));

const HUB_R    = 46;
const SYM_R    = 6;
const AI_COLOR = '#38b6ff';

export function makeDemoNodes() {
  const nodes = [];
  DIAGNOSES.forEach(d => {
    nodes.push({ id:'hub-'+d.id, name:d.label.replace('\n',' '), label:d.label, conds:[d.id], hub:true, x:0, y:0, _placed:false });
  });
  const symptoms = [
    { id:'s1',  name:'Dificultad de concentración', conds:['tda','anx'] },
    { id:'s2',  name:'Hiperfoco',                   conds:['tda','aut'] },
    { id:'s3',  name:'Impulsividad',                conds:['tda','tlp'] },
    { id:'s4',  name:'Insomnio',                    conds:['tda','cptsd','anx'] },
    { id:'s5',  name:'Miedo al abandono',            conds:['tlp'] },
    { id:'s6',  name:'Identidad inestable',          conds:['tlp','cptsd'] },
    { id:'s7',  name:'Disociación',                  conds:['tlp','cptsd'] },
    { id:'s8',  name:'Restricción alimentaria',      conds:['an'] },
    { id:'s9',  name:'Distorsión corporal',           conds:['an'] },
    { id:'s10', name:'Hipersensibilidad sensorial',  conds:['aut'] },
    { id:'s11', name:'Enmascaramiento social',       conds:['aut','cptsd'] },
    { id:'s12', name:'Hipervigilancia',              conds:['cptsd','anx'] },
    { id:'s13', name:'Flashbacks emocionales',       conds:['cptsd','tlp'] },
    { id:'s14', name:'Ciclos de humor',              conds:['bi'] },
    { id:'s15', name:'Grandiosidad',                 conds:['bi'] },
    { id:'s16', name:'Rumiación constante',          conds:['anx','tda'] },
    { id:'s17', name:'Evitación',                    conds:['anx','cptsd'] },
    { id:'s18', name:'Fatiga crónica',               conds:['aut','cptsd','bi'] },
    { id:'s19', name:'Irritabilidad',                conds:['tda','bi','anx'] },
    { id:'s20', name:'Desregulación emocional',      conds:['tlp','tda','cptsd'] },
  ];
  symptoms.forEach(s => nodes.push({ ...s, x:0, y:0, _placed:false }));
  return nodes;
}

export function initLayout(nodes, W, H) {
  const hubs    = nodes.filter(n => n.hub);
  const spacing = Math.max(130, Math.min(W * 0.18, 200));
  const totalW  = spacing * (hubs.length - 1);
  const startX  = -totalW / 2;
  const y       = -H * 0.08;
  hubs.forEach((h, i) => {
    if (!h._placed) { h.x = startX + i * spacing; h.y = y; h._placed = true; }
  });
  const syms = nodes.filter(n => !n.hub && !n._placed);
  syms.forEach((n, i) => {
    const hub = nodes.find(h => h.hub && h.conds[0] === n.conds[0]);
    const ang = (i / Math.max(syms.length, 1)) * Math.PI * 2;
    n.x = (hub ? hub.x : 0) + Math.cos(ang) * 110;
    n.y = (hub ? hub.y : 0) + 100 + Math.abs(Math.sin(ang)) * 80;
    n._placed = true;
  });
}

function w2s(wx, wy, offX, offY, scale, W, H) {
  return { x:(wx-offX)*scale+W/2, y:(wy-offY)*scale+H/2 };
}
function edgePt(cx, cy, r, tx, ty) {
  const dx=tx-cx, dy=ty-cy, d=Math.sqrt(dx*dx+dy*dy)||1;
  return { x:cx+dx/d*r, y:cy+dy/d*r };
}

function drawHub(ctx, n, p, sel, hov, scale) {
  const col = DIAG_MAP[n.conds[0]]?.color || '#888';
  const r   = HUB_R * scale;
  if (sel || hov) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r+8, 0, Math.PI*2);
    const g = ctx.createRadialGradient(p.x,p.y,r,p.x,p.y,r+12);
    g.addColorStop(0, col+'40'); g.addColorStop(1,'transparent');
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
  ctx.fillStyle = col+'1a'; ctx.fill();
  ctx.strokeStyle = sel ? col : col+(hov?'dd':'99');
  ctx.lineWidth = (sel?2.8:2)*scale; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(p.x,p.y,r-4*scale,0,Math.PI*2); ctx.clip();
  const lines    = (n.label||n.name).split('\n');
  const fontSize = Math.max(8, Math.min(12, r*0.26));
  const lineH    = fontSize*scale*1.3;
  const maxW     = (r-8*scale)*2;
  ctx.fillStyle = col; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font = `600 ${fontSize*scale}px 'Outfit', sans-serif`;
  lines.forEach((l,i) => ctx.fillText(l, p.x, p.y+(i-(lines.length-1)/2)*lineH, maxW));
  ctx.restore();
}

function drawSymptom(ctx, n, p, sel, hov, scale) {
  const r = SYM_R*scale;
  if (sel||hov) {
    ctx.beginPath(); ctx.arc(p.x,p.y,r+6,0,Math.PI*2);
    ctx.strokeStyle='#1c1a1622'; ctx.lineWidth=1; ctx.stroke();
  }
  if (n.fromAI) {
    ctx.beginPath(); ctx.arc(p.x,p.y,r+3,0,Math.PI*2);
    ctx.strokeStyle=AI_COLOR+'55'; ctx.lineWidth=1.5*scale; ctx.stroke();
  }
  if (n.conds.length > 1) {
    n.conds.forEach((c,i) => {
      const a0=(i/n.conds.length)*Math.PI*2-Math.PI/2;
      const a1=((i+1)/n.conds.length)*Math.PI*2-Math.PI/2;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,a0,a1);
      ctx.strokeStyle=DIAG_MAP[c]?.color||'#888'; ctx.lineWidth=2.5*scale; ctx.stroke();
    });
  } else {
    const col=DIAG_MAP[n.conds[0]]?.color||'#888';
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.fillStyle=sel||hov?col:col+'bb'; ctx.fill();
  }
  const words=n.name.split(' '); const lns=[]; let cur='';
  words.forEach(w => {
    if ((cur+' '+w).trim().length>16){lns.push(cur.trim());cur=w;}
    else cur=(cur+' '+w).trim();
  });
  if (cur) lns.push(cur.trim());
  ctx.fillStyle=sel?'#1c1a16':'#3a3530'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.font=`500 ${Math.max(7,9*scale)}px 'Outfit', sans-serif`;
  lns.forEach((l,i)=>ctx.fillText(l,p.x,p.y+r+5*scale+i*11*scale));
  if (n.notes) {
    ctx.fillStyle='#4a8060'; ctx.font=`${Math.max(7,8*scale)}px monospace`;
    ctx.fillText('●',p.x+r+4*scale,p.y-r-2*scale);
  }
}

function drawFloating(ctx, n, p, sel, hov, scale) {
  const r=SYM_R*scale;
  if (sel||hov){ctx.beginPath();ctx.arc(p.x,p.y,r+8,0,Math.PI*2);ctx.strokeStyle='#88776633';ctx.lineWidth=1;ctx.stroke();}
  ctx.save();
  ctx.setLineDash([3*scale,3*scale]);
  ctx.beginPath();ctx.arc(p.x,p.y,r+1,0,Math.PI*2);
  ctx.strokeStyle=sel?'#887766cc':'#88776688';ctx.lineWidth=1.8*scale;ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(p.x,p.y,r-1,0,Math.PI*2);
  ctx.fillStyle=sel?'#88776630':'#88776615';ctx.fill();
  ctx.restore();
  const words=n.name.split(' ');const lns=[];let cur='';
  words.forEach(w=>{if((cur+' '+w).trim().length>16){lns.push(cur.trim());cur=w;}else cur=(cur+' '+w).trim();});
  if(cur)lns.push(cur.trim());
  ctx.fillStyle=sel?'#5a5040':'#887766';ctx.textAlign='center';ctx.textBaseline='top';
  ctx.font=`500 ${Math.max(7,9*scale)}px 'Outfit', sans-serif`;
  lns.forEach((l,i)=>ctx.fillText(l,p.x,p.y+r+5*scale+i*11*scale));
}

function draw(ctx, W, H, nodes, offX, offY, scale, selectedId, hoveredId, highlightedDiags) {
  ctx.clearRect(0,0,W,H);
  ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.025)'; ctx.lineWidth=1;
  for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.restore();

  if(nodes.length===0){
    ctx.fillStyle='#aaa090';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='14px Outfit,sans-serif';
    ctx.fillText('Selecciona tus diagnósticos y genera síntomas →',W/2,H/2);
    return;
  }

  const hubs=nodes.filter(n=>n.hub);
  const syms=nodes.filter(n=>!n.hub);
  const wp=n=>w2s(n.x,n.y,offX,offY,scale,W,H);

  for(let i=0;i<hubs.length-1;i++){
    const pa=wp(hubs[i]),pb=wp(hubs[i+1]);
    const from=edgePt(pa.x,pa.y,HUB_R*scale,pb.x,pb.y);
    const to=edgePt(pb.x,pb.y,HUB_R*scale,pa.x,pa.y);
    ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);
    ctx.strokeStyle='#1c1a1633';ctx.lineWidth=1.5*scale;ctx.stroke();
  }

  [false,true].forEach(drawShared=>{
    syms.forEach(sym=>{
      const isShared=sym.conds.length>1;
      if(isShared!==drawShared)return;
      const active=sym.id===selectedId||sym.id===hoveredId;
      const inFilter=highlightedDiags.size===0||sym.conds.some(c=>highlightedDiags.has(c));
      const dimmed=!inFilter&&highlightedDiags.size>0;
      const opacity  =dimmed?0.04:active?0.9:isShared?0.55:0.18;
      const lineWidth=dimmed?0.5 :active?2.5:isShared?2.0 :1.0;
      sym.conds.forEach((c,ci)=>{
        const hub=nodes.find(h=>h.hub&&h.conds[0]===c); if(!hub)return;
        const hubActive=hub.id===selectedId||hub.id===hoveredId;
        const eOp=(active||hubActive)?0.9:opacity;
        const eW =(active||hubActive)?2.5:lineWidth;
        const ps=wp(sym),ph=wp(hub);
        const col=DIAG_MAP[c]?.color||'#888';
        const from=edgePt(ps.x,ps.y,SYM_R*scale+2,ph.x,ph.y);
        const to  =edgePt(ph.x,ph.y,HUB_R*scale,  ps.x,ps.y);
        const mx=(from.x+to.x)/2,my=(from.y+to.y)/2;
        const nx=-(to.y-from.y),ny=(to.x-from.x);
        const nl=Math.sqrt(nx*nx+ny*ny)||1;
        const curve=isShared?(ci%2===0?1:-1)*18*scale:0;
        const hexOp=Math.round(eOp*255).toString(16).padStart(2,'0');
        ctx.beginPath();ctx.moveTo(from.x,from.y);
        ctx.quadraticCurveTo(mx+(nx/nl)*curve,my+(ny/nl)*curve,to.x,to.y);
        ctx.strokeStyle=col+hexOp;ctx.lineWidth=eW*scale;ctx.lineCap='round';ctx.stroke();
      });
    });
  });

  nodes.forEach(n=>{
    const p=wp(n),sel=n.id===selectedId,hov=n.id===hoveredId;
    const inFilter=n.hub?(highlightedDiags.size===0||highlightedDiags.has(n.conds[0]))
                       :(highlightedDiags.size===0||n.conds.some(c=>highlightedDiags.has(c)));
    ctx.globalAlpha=(!inFilter&&highlightedDiags.size>0)?0.1:1;
    if(n.hub)drawHub(ctx,n,p,sel,hov,scale);
    else if(n.floating||n.conds.length===0)drawFloating(ctx,n,p,sel,hov,scale);
    else drawSymptom(ctx,n,p,sel,hov,scale);
    ctx.globalAlpha=1;
  });
}

function nodeAt(sx,sy,nodes,offX,offY,scale,W,H){
  for(const n of [...nodes].reverse()){
    const r=(n.hub?HUB_R+4:SYM_R+10)*scale;
    const p=w2s(n.x,n.y,offX,offY,scale,W,H);
    if((sx-p.x)**2+(sy-p.y)**2<r*r)return n;
  }
  return null;
}

export default function SymptomGraph({ nodes:externalNodes, onNodeSelect, onNodeMove, selectedId:extSelId, highlightedDiags:extHighlights }) {
  const canvasRef=useRef(null);
  const wrapRef  =useRef(null);
  const sr       =useRef({ nodes:null,offX:0,offY:0,scale:1,W:0,H:0,selectedId:null,hoveredId:null,dragging:false,dragMoved:false,dragNodeId:null,lastMx:0,lastMy:0,highlightedDiags:new Set() });

  const redraw=useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas||!sr.current.nodes)return;
    const ctx=canvas.getContext('2d');
    const {W,H,nodes,offX,offY,scale,selectedId,hoveredId,highlightedDiags}=sr.current;
    draw(ctx,W,H,nodes,offX,offY,scale,selectedId,hoveredId,highlightedDiags);
  },[]);

  useEffect(()=>{ if(externalNodes!==undefined){sr.current.nodes=externalNodes;redraw();} },[externalNodes,redraw]);
  useEffect(()=>{ if(extSelId!==undefined){sr.current.selectedId=extSelId;redraw();} },[extSelId,redraw]);
  useEffect(()=>{ if(extHighlights!==undefined){sr.current.highlightedDiags=extHighlights;redraw();} },[extHighlights,redraw]);

  useEffect(()=>{
    const canvas=canvasRef.current,wrap=wrapRef.current; if(!canvas||!wrap)return;
    const resize=()=>{
      sr.current.W=canvas.width =wrap.clientWidth;
      sr.current.H=canvas.height=wrap.clientHeight;
      if(!sr.current.nodes)sr.current.nodes=externalNodes??makeDemoNodes();
      if(sr.current.nodes.some(n=>!n._placed))initLayout(sr.current.nodes,sr.current.W,sr.current.H);
      redraw();
    };
    resize();
    const ro=new ResizeObserver(resize); ro.observe(wrap);
    return ()=>ro.disconnect();
  },[redraw]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas)return;
    const onDown=e=>{
      const st=sr.current;
      const n=nodeAt(e.offsetX,e.offsetY,st.nodes,st.offX,st.offY,st.scale,st.W,st.H);
      if(n){st.dragNodeId=n.id;st.selectedId=n.id;onNodeSelect?.(n);}
      else{st.dragNodeId=null;st.selectedId=null;onNodeSelect?.(null);}
      st.dragging=true;st.dragMoved=false;st.lastMx=e.offsetX;st.lastMy=e.offsetY;
      redraw();
    };
    const onMove=e=>{
      const st=sr.current,sx=e.offsetX,sy=e.offsetY;
      if(st.dragging){
        const dx=sx-st.lastMx,dy=sy-st.lastMy;
        if(Math.abs(dx)>2||Math.abs(dy)>2)st.dragMoved=true;
        if(st.dragNodeId){const n=st.nodes.find(nd=>nd.id===st.dragNodeId);if(n){n.x+=dx/st.scale;n.y+=dy/st.scale;onNodeMove?.(n);}}
        else{st.offX-=dx/st.scale;st.offY-=dy/st.scale;}
        st.lastMx=sx;st.lastMy=sy;redraw();
      } else {
        const n=nodeAt(sx,sy,st.nodes,st.offX,st.offY,st.scale,st.W,st.H);
        const prev=st.hoveredId;st.hoveredId=n?n.id:null;
        canvas.style.cursor=n?'pointer':'default';
        if(st.hoveredId!==prev)redraw();
      }
    };
    const onUp   =()=>{sr.current.dragging=false;sr.current.dragNodeId=null;};
    const onLeave=()=>{sr.current.dragging=false;sr.current.dragNodeId=null;sr.current.hoveredId=null;redraw();};
    const onWheel=e=>{
      e.preventDefault();
      sr.current.scale=Math.max(0.2,Math.min(3,sr.current.scale*(e.deltaY>0?0.9:1.1)));
      redraw();
    };
    const onTS=e=>{
      e.preventDefault();
      const st=sr.current,t=e.touches[0],r=canvas.getBoundingClientRect();
      const sx=t.clientX-r.left,sy=t.clientY-r.top;
      const n=nodeAt(sx,sy,st.nodes,st.offX,st.offY,st.scale,st.W,st.H);
      if(n){st.dragNodeId=n.id;st.selectedId=n.id;onNodeSelect?.(n);}else st.dragNodeId=null;
      st.dragging=true;st.lastMx=sx;st.lastMy=sy;
    };
    const onTM=e=>{
      e.preventDefault();
      const st=sr.current,t=e.touches[0],r=canvas.getBoundingClientRect();
      const sx=t.clientX-r.left,sy=t.clientY-r.top,dx=sx-st.lastMx,dy=sy-st.lastMy;
      if(st.dragNodeId){const n=st.nodes.find(nd=>nd.id===st.dragNodeId);if(n){n.x+=dx/st.scale;n.y+=dy/st.scale;}}
      else{st.offX-=dx/st.scale;st.offY-=dy/st.scale;}
      st.lastMx=sx;st.lastMy=sy;redraw();
    };
    const onTE=()=>{sr.current.dragging=false;sr.current.dragNodeId=null;};
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup',   onUp);
    canvas.addEventListener('mouseleave',onLeave);
    canvas.addEventListener('wheel',     onWheel,{passive:false});
    canvas.addEventListener('touchstart',onTS,{passive:false});
    canvas.addEventListener('touchmove', onTM,{passive:false});
    canvas.addEventListener('touchend',  onTE);
    return ()=>{
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup',   onUp);
      canvas.removeEventListener('mouseleave',onLeave);
      canvas.removeEventListener('wheel',     onWheel);
      canvas.removeEventListener('touchstart',onTS);
      canvas.removeEventListener('touchmove', onTM);
      canvas.removeEventListener('touchend',  onTE);
    };
  },[redraw,onNodeSelect,onNodeMove]);

  return (
    <div ref={wrapRef} style={{flex:1,position:'relative',overflow:'hidden',minWidth:0,minHeight:0}}>
      <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,display:'block'}} />
      <div style={{position:'absolute',bottom:20,left:20,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(148,163,184,0.25)',borderRadius:8,padding:'10px 20px 10px 12px',fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',color:'#64748b',zIndex:10,display:'flex',flexDirection:'column',gap:6,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',backdropFilter:'blur(8px)'}}>
        <div style={{fontSize:'0.55rem',textTransform:'uppercase',letterSpacing:'0.1em',color:'#94a3b8',marginBottom:2}}>Leyenda</div>
        {[
          {label:'Diagnóstico (hub)',  el:<div style={{width:14,height:14,borderRadius:'50%',border:'2px solid #64748b',flexShrink:0}}/>},
          {label:'Síntoma individual', el:<div style={{width:8,height:8,borderRadius:'50%',background:'#64748b',flexShrink:0}}/>},
          {label:'Síntoma compartido', el:<div style={{width:10,height:10,borderRadius:'50%',border:'2px solid #64748b',flexShrink:0}}/>},
          {label:'Conexión fuerte',    el:<div style={{width:22,height:3,background:'#64748b',borderRadius:1,flexShrink:0,opacity:0.9}}/>},
          {label:'Conexión tenue',     el:<div style={{width:22,height:1,background:'#64748b',borderRadius:1,flexShrink:0,opacity:0.4}}/>},
        ].map(({label,el})=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:9}}>{el}<span>{label}</span></div>
        ))}
      </div>
      <div style={{position:'absolute',bottom:20,right:20,fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:'#94a3b8',pointerEvents:'none',userSelect:'none'}}>
        scroll para zoom · arrastrar para mover
      </div>
    </div>
  );
}