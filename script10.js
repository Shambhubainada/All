
(function(){
  const CKEY='shambhuChemicalRegisterV1';
  const escC=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const chemRead=()=>{try{return JSON.parse(localStorage.getItem(CKEY)||'[]')}catch(e){return[]}};
  const chemWrite=a=>localStorage.setItem(CKEY,JSON.stringify(a));
  const chemNum=v=>Number(String(v??'').replace(/,/g,''))||0;
  const chemDate=d=>{if(!d)return'';const x=new Date(d);if(isNaN(x))return String(d);return x.toLocaleDateString('en-GB').replaceAll('/','.');};
  let activeChemicalFolder=localStorage.getItem('shambhuChemicalFolder')||''; if(!['','ALP','Delta','Malathion'].includes(activeChemicalFolder))activeChemicalFolder='';
  function chemicalFolderPage(){
    return `<div class="panel"><div class="panelhead">🧪 CHEMICAL</div>
      <div class="chem-folder-grid">
        <button class="chem-folder alp" onclick="openChemicalFolder('ALP')"><span class="chem-folder-icon">💊</span><b>ALP</b><small>ALP Register</small></button>
        <button class="chem-folder delta" onclick="openChemicalFolder('Delta')"><span class="chem-folder-icon">🧪</span><b>DELTA</b><small>Delta Register</small></button>
        <button class="chem-folder mal" onclick="openChemicalFolder('Malathion')"><span class="chem-folder-icon">🦟</span><b>MALATHION</b><small>Malathion Register</small></button>
      </div>
      <div class="chem-note">हर chemical का अलग folder है। Folder खोलने पर उसी chemical का अलग register, month-wise report, View, PDF और Excel option मिलेगा.</div>
    </div>`;
  }
  function alpAutoGroups(){
    const a=rows.filter(r=>qty(r)>0 && underFlag(r));
    const groups={};
    a.forEach(r=>{
      const d=val(r,'Fumigation Date','FumigationDate','Cover Date','Under Cover Date') || '';
      if(!d)return;
      const key=String(d);
      if(!groups[key])groups[key]={date:key,stacks:[],wheatStacks:[],riceStacks:[],mt:0,wheat:0,rice:0,wheatMt:0,riceMt:0};
      const g=groups[key], st=String(stack(r)||'').trim();
      const q=qty(r);
      if(st){g.stacks.push(st); const so={stack:st,mt:q}; if(isWheat(r))g.wheatStacks.push(so); else if(isRice(r))g.riceStacks.push(so);} g.mt+=q;
      if(isWheat(r)){g.wheat++;g.wheatMt+=q;} else if(isRice(r)){g.rice++;g.riceMt+=q;}
    });
    let overrides={}; try{overrides=JSON.parse(localStorage.getItem('shambhuALPOverridesV1')||'{}')}catch(e){overrides={}};
    // Include locked snapshots even when their Under Cover rows no longer exist.
    Object.keys(overrides).forEach(k=>{
      const ov=overrides[k]; if(!ov || !ov.locked || groups[k])return;
      groups[k]={date:k,stacks:[],wheatStacks:[],riceStacks:[],mt:0,wheat:0,rice:0,wheatMt:0,riceMt:0};
    });
    return Object.values(groups).map(g=>{
      const ov=overrides[g.date];
      const locked=!!ov?.locked;
      if(locked){
        return {...g,...ov,wheatStacks:Array.isArray(ov.wheatStacks)?ov.wheatStacks:g.wheatStacks,riceStacks:Array.isArray(ov.riceStacks)?ov.riceStacks:g.riceStacks,stackWeights:ov.stackWeights||{},mt:chemNum(ov.mt),consumption:chemNum(ov.consumption),stackText:String(ov.stackText??''),count:Number(ov.count??0),wheat:Number(ov.wheat??0),rice:Number(ov.rice??0),wheatMt:chemNum(ov.wheatMt),riceMt:chemNum(ov.riceMt),progressive:chemNum(ov.progressive)};
      }
      const mt=ov?.mt!=null?chemNum(ov.mt):g.mt;
      const cons=ov?.consumption!=null?chemNum(ov.consumption):mt*0.009;
      return {...g, ...(ov||{}), mt, consumption:cons, stackText:ov?.stackText!=null?ov.stackText:g.stacks.join(', '), count:g.stacks.length};
    }).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }
  function stackWeightKey(x,o){return 'shambhuChemicalStackWeight_'+String(x.date||'')+'_'+String(o.stack||'').trim();}
  function stackWeightValue(x,o){let v='FEW';try{const m=JSON.parse(localStorage.getItem(stackWeightKey(x,o))||'"FEW"');if(m==='HEAVY')v='HEAVY';}catch(e){}return v;}
  window.__lastFewHeavyTap={key:'',time:0};
  window.toggleStackWeight=function(date,stack,btn){
    const d=String(date||''), k=String(stack||'').trim();
    if(!d||!k)return false;
    const key='shambhuChemicalStackWeight_'+d+'_'+k;
    const now=Date.now();
    if(window.__lastFewHeavyTap.key===key && now-window.__lastFewHeavyTap.time<280)return false;
    window.__lastFewHeavyTap={key:key,time:now};
    let v='FEW'; try{v=JSON.parse(localStorage.getItem(key)||'"FEW"')}catch(e){}
    v=v==='HEAVY'?'FEW':'HEAVY';
    localStorage.setItem(key,JSON.stringify(v));
    // Explicit user tap is allowed even for a locked ALP row; update the locked snapshot too.
    try{
      const ovs=JSON.parse(localStorage.getItem('shambhuALPOverridesV1')||'{}');
      if(ovs[d] && ovs[d].locked){
        ovs[d].stackWeights=ovs[d].stackWeights||{};
        ovs[d].stackWeights[k]=v;
        localStorage.setItem('shambhuALPOverridesV1',JSON.stringify(ovs));
      }
    }catch(e){}
    if(btn){const em=btn.querySelector('em');if(em)em.textContent=v;btn.setAttribute('aria-label',v);btn.classList.toggle('weight-heavy',v==='HEAVY');btn.classList.add('weight-flash');setTimeout(()=>btn.classList.remove('weight-flash'),180);}
    return false;
  };
  function collectStackWeights(x){const out={};[...(x.wheatStacks||[]),...(x.riceStacks||[])].forEach(o=>{const k=String(o.stack||'').trim();if(k)out[k]=stackWeightValue(x,o);});return out;}
  function stackCommodityCell(x){
    let locked=false; try{const ovs=JSON.parse(localStorage.getItem('shambhuALPOverridesV1')||'{}'); locked=!!ovs[String(x.date||'')]?.locked;}catch(e){locked=false;}
    const fmt=(arr,cls)=>arr.length?`<div class="stack-commodity-block ${cls}"><div class="stack-items stack-compact-items">${arr.map(o=>{const k=String(o.stack||'').trim();const wt=(locked&&x.stackWeights&&x.stackWeights[k])||stackWeightValue(x,o);const dArg=JSON.stringify(String(x.date||'')),kArg=JSON.stringify(k);return `<button type="button" class="stack-item stack-weight-toggle ${wt==='HEAVY'?'weight-heavy':'weight-few'}" data-weight-date="${escC(String(x.date||''))}" data-weight-stack="${escC(k)}" onclick="event.preventDefault();event.stopPropagation();return toggleStackWeight(${dArg},${kArg},this)" title="Tap FEW / HEAVY to change"><span>${escC(k)}</span><small class="stack-detail">(${Math.round(chemNum(o.mt))} MT)</small><em class="stack-detail">${wt}</em></button>`;}).join('')}</div></div>`:'';
    const w=fmt(x.wheatStacks||[],'wheat-stack'),r=fmt(x.riceStacks||[],'rice-stack');
    if(w||r)return `<div class="stack-commodity-cell" onclick="toggleChemicalStackDetails(event)">${w}${r}</div>`;
    return `<div class="stack-fallback" onclick="toggleChemicalStackDetails(event)">${escC(x.stackText||'')}<span class="stack-detail"><small>(${x.count||0} stack)</small></span></div>`;
  }
  window.toggleChemicalStackDetails=function(ev){
    if(ev && ev.target && ev.target.closest && ev.target.closest('.stack-weight-toggle')) return;
    const table=ev&&ev.currentTarget?ev.currentTarget.closest('table'):document.querySelector('.chem-register-table');
    if(table)table.classList.toggle('stack-details-open');
  };
  function alpTableRows(){
    const a=alpAutoGroups(); let progressive=0;
    let overrides={}; try{overrides=JSON.parse(localStorage.getItem('shambhuALPOverridesV1')||'{}')}catch(e){}
    let editing={}; try{editing=JSON.parse(localStorage.getItem('shambhuALPEditingV1')||'{}')}catch(e){}
    return a.length?a.map((x,i)=>{
      const isLocked=!!overrides[x.date]?.locked && !editing[x.date];
      if(isLocked) progressive=chemNum(x.progressive);
      else progressive+=chemNum(x.consumption);
      const treatment=`<div class="treatment-qty"><span><b>Wheat</b><strong>${Math.round(x.wheatMt||0)}</strong></span><i></i><span><b>Rice</b><strong>${Math.round(x.riceMt||0)}</strong></span></div>`;
      let action='';
      if(isLocked){ action=`<div class="chem-action-group"><span class="alp-lock-badge">🔒 Locked</span><button class="pill chem-edit-btn" onclick="editALPAuto('${escC(x.date)}')">✏️ Edit</button><button class="pill chem-delete-btn" onclick="deleteALPAuto('${escC(x.date)}')">🗑 Delete</button></div>`; }
      else { action=`<div class="chem-action-group"><button class="pill chem-save-btn" onclick="saveALPAuto('${escC(x.date)}')">💾 Save</button></div>`; }
      return `<tr class="${isLocked?'alp-row-locked':''}"><td>${i+1}</td><td>${chemDate(x.date)}</td><td class="stack-number-cell">${stackCommodityCell(x)}</td><td>${Math.round(x.mt)}</td><td>${chemNum(x.consumption).toFixed(3)} kg</td><td><b>${progressive.toFixed(3)} kg</b></td><td>${treatment}</td><td>${action}</td></tr>`;
    }).join(''):'<tr><td colspan="8" class="empty">No Under Cover stacks found.</td></tr>';
  }
  function deltaDateText(x){const d=parseDate(x);if(!d)return '';d.setDate(d.getDate()+7);return String(d.getFullYear())+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function classifyDeltaStacks(stackText, prior){
    const ws=[],rs=[],wmt={},rmt={};
    const pw=Array.isArray(prior?.wheatStacks)?prior.wheatStacks:[], pr=Array.isArray(prior?.riceStacks)?prior.riceStacks:[];
    const pwt=prior?.stackMtWheat||{}, prt=prior?.stackMtRice||{};
    String(stackText||'').split(',').map(v=>v.trim()).filter(Boolean).forEach(st=>{
      const rr=rows.find(row=>String(stack(row)||'').trim()===st);
      if(rr){
        if(isWheat(rr)){if(!ws.includes(st))ws.push(st);wmt[st]=chemNum(qty(rr));}
        else if(isRice(rr)){if(!rs.includes(st))rs.push(st);rmt[st]=chemNum(qty(rr));}
      } else if(pw.includes(st)){if(!ws.includes(st))ws.push(st);wmt[st]=chemNum(pwt[st]);}
      else if(pr.includes(st)){if(!rs.includes(st))rs.push(st);rmt[st]=chemNum(prt[st]);}
      else {if(!ws.includes(st)&&!rs.includes(st))ws.push(st);wmt[st]=0;}
    });
    return {wheatStacks:ws,riceStacks:rs,wheatMt:ws.reduce((s,st)=>s+chemNum(wmt[st]),0),riceMt:rs.reduce((s,st)=>s+chemNum(rmt[st]),0),stackMtWheat:wmt,stackMtRice:rmt};
  }
  function deltaAutoGroups(){
    const groups={};
    rows.filter(r=>qty(r)>0 && val(r,'Fumigation Date')).forEach(r=>{
      const fum=String(val(r,'Fumigation Date')).trim(), entry=deltaDateText(fum); if(!entry)return;
      if(!groups[entry])groups[entry]={date:entry,fumDate:fum,plannedDate:entry,sourceKey:entry,stacks:[],wheat:0,rice:0,wheatMt:0,riceMt:0};
      const g=groups[entry], st=String(stack(r)||'').trim(), mt=qty(r);
      if(st&&!g.stacks.includes(st))g.stacks.push(st);
      if(isWheat(r)){g.wheat++;g.wheatMt+=mt}else if(isRice(r)){g.rice++;g.riceMt+=mt}
    });
    let overrides={};try{overrides=JSON.parse(localStorage.getItem('shambhuDeltaOverridesV1')||'{}')}catch(e){overrides={}}
    const lockedValues=Object.values(overrides).filter(v=>v&&v.locked);
    const out=[], matched=new Set();
    Object.values(groups).forEach(g=>{
      const ov=overrides[String(g.sourceKey)]?.locked?overrides[String(g.sourceKey)]:
        (overrides[String(g.date)]?.locked?overrides[String(g.date)]:
        lockedValues.find(v=>String(v.sourceKey||'')===String(g.sourceKey)));
      if(ov){
        matched.add(ov);
        /* A locked/manual row is a snapshot. Source values are used only to locate the row, never to overwrite it. */
        out.push({...ov,sourceKey:String(ov.sourceKey||g.sourceKey),date:String(ov.date||g.date),fumDate:String(ov.fumDate||g.fumDate||''),plannedDate:String(ov.plannedDate||g.plannedDate||g.date),
          stackText:String(ov.stackText??''),wheatStacks:Array.isArray(ov.wheatStacks)?[...ov.wheatStacks]:[],riceStacks:Array.isArray(ov.riceStacks)?[...ov.riceStacks]:[],
          wheatMt:chemNum(ov.wheatMt),riceMt:chemNum(ov.riceMt),stackMtWheat:ov.stackMtWheat||{},stackMtRice:ov.stackMtRice||{},
          wheat:Number(ov.wheat||0),rice:Number(ov.rice||0),count:Number(ov.count||0),consumption:chemNum(ov.consumption),locked:true,manual:true});
      }else{
        const stackText=g.stacks.join(', '), cls=classifyDeltaStacks(stackText);
        out.push({...g,stackText,count:g.stacks.length,wheat:Number(g.wheat||0),rice:Number(g.rice||0),wheatStacks:cls.wheatStacks,riceStacks:cls.riceStacks,wheatMt:cls.wheatMt,riceMt:cls.riceMt,stackMtWheat:cls.stackMtWheat,stackMtRice:cls.stackMtRice,consumption:g.stacks.length*0.650,locked:false,manual:false});
      }
    });
    /* Keep manually locked rows even when the source fumigation row/date disappears. */
    Object.keys(overrides).forEach(k=>{const ov=overrides[k];if(!ov||!ov.locked||matched.has(ov))return;const sk=String(ov.sourceKey||k);
      out.push({...ov,sourceKey:sk,date:String(ov.date||k),stackText:String(ov.stackText??''),wheatStacks:Array.isArray(ov.wheatStacks)?[...ov.wheatStacks]:[],riceStacks:Array.isArray(ov.riceStacks)?[...ov.riceStacks]:[],
        wheatMt:chemNum(ov.wheatMt),riceMt:chemNum(ov.riceMt),stackMtWheat:ov.stackMtWheat||{},stackMtRice:ov.stackMtRice||{},wheat:Number(ov.wheat||0),rice:Number(ov.rice||0),count:Number(ov.count||0),consumption:chemNum(ov.consumption),locked:true,manual:true});
    });
    return out.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }

  function deltaTableRows(){const a=deltaAutoGroups();let progressive=0;return a.length?a.map((x,i)=>{const isLocked=!!x.locked;progressive+=chemNum(x.consumption);const ws=x.wheatStacks||[],rs=x.riceStacks||[];const key=String(x.sourceKey||x.date);const action=isLocked?`<div class="chem-action-group"><span class="alp-lock-badge">🔒 Locked</span><button class="pill chem-edit-btn" onclick="editDeltaAuto('${escC(key)}')">✏️ Edit</button><button class="pill chem-delete-btn" onclick="deleteDeltaAuto('${escC(key)}')">🗑 Delete</button></div>`:`<div class="chem-action-group"><button class="pill chem-save-btn" onclick="saveDeltaAuto('${escC(key)}')">💾 Save</button></div>`;return `<tr class="${isLocked?'alp-row-locked':''}"><td>${i+1}</td><td>${chemDate(x.date)}</td><td><div class="delta-stack-split"><div class="delta-wheat-stacks">${ws.map(st=>`<span>${escC(st)}</span>`).join('')||'—'}</div><div class="delta-rice-stacks">${rs.map(st=>`<span>${escC(st)}</span>`).join('')||'—'}</div></div></td><td>${chemNum(x.consumption).toFixed(3)} kg</td><td><b>${progressive.toFixed(3)} kg</b></td><td>${ws.length} Wheat / ${rs.length} Rice</td><td>${action}</td></tr>`;}).join(''):'<tr><td colspan="7" class="empty">No fumigated stacks found.</td></tr>';}

  function chemDateRange(){
    const now=new Date(), ym=now.toISOString().slice(0,7);
    const fromEl=document.getElementById('chemFromDate'), toEl=document.getElementById('chemToDate');
    const from=fromEl?.value || (ym+'-01');
    const to=toEl?.value || new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);
    return {from,to,m:from.slice(0,7)};
  }
  function chemISODateValue(date){const d=parseDate(date);if(!d)return String(date||'').slice(0,10);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function inChemRange(date,from,to){const d=chemISODateValue(date);return d>=from&&d<=to;}
  function reportData(){
    const rg=chemDateRange(),from=rg.from,to=rg.to,m=rg.m;
    if(activeChemicalFolder==='ALP'){
      const all=alpAutoGroups(), mm=all.filter(x=>inChemRange(x.date,from,to));
      return {m,from,to,mm,total:all,wheatAlp:mm.reduce((s,x)=>s+Number(x.wheat||0),0),riceAlp:mm.reduce((s,x)=>s+Number(x.rice||0),0),wheatQty:mm.reduce((s,x)=>s+chemNum(x.wheatMt),0),riceQty:mm.reduce((s,x)=>s+chemNum(x.riceMt),0),allWheatAlp:all.reduce((s,x)=>s+Number(x.wheat||0),0),allRiceAlp:all.reduce((s,x)=>s+Number(x.rice||0),0),allWheatQty:all.reduce((s,x)=>s+chemNum(x.wheatMt),0),allRiceQty:all.reduce((s,x)=>s+chemNum(x.riceMt),0)};
    }
    if(activeChemicalFolder==='Delta'){
      const all0=deltaAutoGroups();
      const all=all0.map(g=>({...g,stacksWheat:g.wheatStacks||[],stacksRice:g.riceStacks||[],wheatMt:chemNum(g.wheatMt),riceMt:chemNum(g.riceMt)})),mm=all.filter(x=>inChemRange(x.date,from,to));
      return {m,from,to,mm,total:all,wheatDelta:mm.reduce((s,x)=>s+Number(x.wheat||0),0),riceDelta:mm.reduce((s,x)=>s+Number(x.rice||0),0),wheatQty:mm.reduce((s,x)=>s+chemNum(x.wheatMt),0),riceQty:mm.reduce((s,x)=>s+chemNum(x.riceMt),0),allWheatQty:all.reduce((s,x)=>s+chemNum(x.wheatMt),0),allRiceQty:all.reduce((s,x)=>s+chemNum(x.riceMt),0),allWheatDelta:all.reduce((s,x)=>s+Number(x.wheat||0),0),allRiceDelta:all.reduce((s,x)=>s+Number(x.rice||0),0),totalDelta:mm.reduce((s,x)=>s+chemNum(x.consumption),0),allTotalDelta:all.reduce((s,x)=>s+chemNum(x.consumption),0)};
    }
    const a=chemRead().filter(x=>!activeChemicalFolder||x.chemical===activeChemicalFolder),mm=a.filter(x=>inChemRange(x.date,from,to)),total=a;
    const sum=(arr,c,chem)=>arr.filter(x=>(!c||x.commodity===c)&&(!chem||x.chemical===chem)).reduce((s,x)=>s+chemNum(x.qty),0);
    if(activeChemicalFolder==='Malathion'){
      const alpAll=alpAutoGroups(), alpMonth=alpAll.filter(x=>inChemRange(x.date,from,to));
      const malAll=chemRead().filter(x=>x.chemical==='Malathion'), malMonth=malAll.filter(x=>inChemRange(x.date,from,to));
      const monthWheatQty=alpMonth.reduce((s,x)=>s+chemNum(x.wheatMt),0), monthRiceQty=alpMonth.reduce((s,x)=>s+chemNum(x.riceMt),0);
      const allWheatQty=alpAll.reduce((s,x)=>s+chemNum(x.wheatMt),0), allRiceQty=alpAll.reduce((s,x)=>s+chemNum(x.riceMt),0);
      return {m,from,to,mm:malMonth,total:malAll,monthWheatQty,monthRiceQty,allWheatQty,allRiceQty};
    }
    if(activeChemicalFolder==='ALP'){const wm=r.mm.reduce((s,x)=>s+Number(x.wheat||0),0),rm=r.mm.reduce((s,x)=>s+Number(x.rice||0),0),wq=r.mm.reduce((s,x)=>s+chemNum(x.wheatMt),0),rq=r.mm.reduce((s,x)=>s+chemNum(x.riceMt),0),tm=r.mm.reduce((s,x)=>s+chemNum(x.consumption),0),all=r.total.reduce((s,x)=>s+chemNum(x.consumption),0);const html=`<div class="chem-report-head"><h3 style="margin:0">ALP REPORT</h3><div class="smallmuted">${r.from} → ${r.to}</div></div><div class="chem-report-grid"><div class="chem-report-card"><h4>OPENING ALP</h4><strong>0.000 kg</strong></div><div class="chem-report-card"><h4>WHEAT FUMIGATION</h4><strong>${wm} stacks · ${Math.round(wq)} MT</strong></div><div class="chem-report-card"><h4>RICE FUMIGATION</h4><strong>${rm} stacks · ${Math.round(rq)} MT</strong></div><div class="chem-report-card"><h4>ALP USED</h4><strong>${tm.toFixed(3)} kg</strong></div></div><div class="chem-note"><b>ABHI TAK ALP:</b> Wheat ${r.allWheatAlp} stacks · ${Math.round(r.allWheatQty)} MT | Rice ${r.allRiceAlp} stacks · ${Math.round(r.allRiceQty)} MT | Total ALP Used ${all.toFixed(3)} kg.</div>`;box.innerHTML=html;return;}const wm=r.mm.filter(x=>x.commodity==='Wheat').reduce((s,x)=>s+chemNum(x.qty),0),rm=r.mm.filter(x=>x.commodity==='Rice').reduce((s,x)=>s+chemNum(x.qty),0),tm=wm+rm,wa=r.total.filter(x=>x.commodity==='Wheat').reduce((s,x)=>s+chemNum(x.qty),0),ra=r.total.filter(x=>x.commodity==='Rice').reduce((s,x)=>s+chemNum(x.qty),0);box.innerHTML=`<div class="chem-report-grid"><div class="chem-report-card"><h4>WHEAT ${label} — ${r.m}</h4><strong>${wm.toFixed(2)} Kg</strong></div><div class="chem-report-card"><h4>RICE ${label} — ${r.m}</h4><strong>${rm.toFixed(2)} Kg</strong></div><div class="chem-report-card"><h4>TOTAL ${label} — ${r.m}</h4><strong>${tm.toFixed(2)} Kg</strong></div></div>`;};

  window.refreshALPRegister=function(){
    const r=document.getElementById('chemRows'); if(r)r.innerHTML=activeChemicalFolder==='Delta'?deltaTableRows():alpTableRows();
    renderChemicalReport();
  };
  window.saveALPAuto=function(dateKey){
    const g=alpAutoGroups().find(x=>String(x.date)===String(dateKey)); if(!g)return;
    let o={};try{o=JSON.parse(localStorage.getItem('shambhuALPOverridesV1')||'{}')}catch(e){}
    let prior=0; alpAutoGroups().forEach(z=>{if(String(z.date)<String(g.date)) prior+=chemNum(z.consumption);});
    o[g.date]={...(o[g.date]||{}),mt:chemNum(g.mt),consumption:chemNum(g.mt)*0.009,stackText:g.stackText,wheatMt:chemNum(g.wheatMt),riceMt:chemNum(g.riceMt),wheat:Number(g.wheat||0),rice:Number(g.rice||0),count:Number(g.count||0),wheatStacks:g.wheatStacks||[],riceStacks:g.riceStacks||[],stackWeights:collectStackWeights(g),progressive:prior+chemNum(g.mt)*0.009,locked:true};
    localStorage.setItem('shambhuALPOverridesV1',JSON.stringify(o));
    let ed={};try{ed=JSON.parse(localStorage.getItem('shambhuALPEditingV1')||'{}')}catch(e){} delete ed[g.date]; localStorage.setItem('shambhuALPEditingV1',JSON.stringify(ed));
    refreshALPRegister();
  };
  window.editALPAuto=async function(dateKey){const pin=await qcPinPrompt('Edit ke liye PIN enter karein');if(pin===null||String(pin)!==String(getSitePin())){if(pin!==null)alert('Wrong PIN.');return;}
    const g=alpAutoGroups().find(x=>String(x.date)===String(dateKey)); if(!g)return;
    let ed={};try{ed=JSON.parse(localStorage.getItem('shambhuALPEditingV1')||'{}')}catch(e){} ed[g.date]=true;localStorage.setItem('shambhuALPEditingV1',JSON.stringify(ed));
    const mt=prompt('Total Qty (MT)',Math.round(g.mt)); if(mt===null){delete ed[g.date];localStorage.setItem('shambhuALPEditingV1',JSON.stringify(ed));return;}
    const cons=prompt('Consumption (kg) — default Total MT × 0.009',g.consumption.toFixed(3)); if(cons===null){delete ed[g.date];localStorage.setItem('shambhuALPEditingV1',JSON.stringify(ed));return;}
    const wm=prompt('Wheat Treatment Qty (MT)',Math.round(g.wheatMt||0)); if(wm===null){delete ed[g.date];localStorage.setItem('shambhuALPEditingV1',JSON.stringify(ed));return;}
    const rm=prompt('Rice Treatment Qty (MT)',Math.round(g.riceMt||0)); if(rm===null){delete ed[g.date];localStorage.setItem('shambhuALPEditingV1',JSON.stringify(ed));return;}
    const stacks=prompt('Stack Number(s)',g.stackText); if(stacks===null){delete ed[g.date];localStorage.setItem('shambhuALPEditingV1',JSON.stringify(ed));return;}
    let o={};try{o=JSON.parse(localStorage.getItem('shambhuALPOverridesV1')||'{}')}catch(e){}
    let prior=0; alpAutoGroups().forEach(z=>{if(String(z.date)<String(g.date)) prior+=chemNum(z.consumption);});
    o[g.date]={...(o[g.date]||{}),mt:Math.round(chemNum(mt)),consumption:chemNum(cons),stackText:stacks,wheatMt:Math.round(chemNum(wm)),riceMt:Math.round(chemNum(rm)),wheat:Number(g.wheat||0),rice:Number(g.rice||0),count:Number(g.count||0),wheatStacks:g.wheatStacks||[],riceStacks:g.riceStacks||[],stackWeights:g.stackWeights||collectStackWeights(g),progressive:prior+chemNum(cons),locked:true};localStorage.setItem('shambhuALPOverridesV1',JSON.stringify(o));
    refreshALPRegister();
  };
  window.deleteALPAuto=async function(dateKey){const pin=await qcPinPrompt('Delete ke liye PIN enter karein');if(pin===null||String(pin)!==String(getSitePin())){if(pin!==null)alert('Wrong PIN.');return;}
    if(!confirm('Delete saved ALP register entry? Automatic Under Cover data will remain available.'))return;
    let o={};try{o=JSON.parse(localStorage.getItem('shambhuALPOverridesV1')||'{}')}catch(e){} delete o[dateKey];localStorage.setItem('shambhuALPOverridesV1',JSON.stringify(o));
    let ed={};try{ed=JSON.parse(localStorage.getItem('shambhuALPEditingV1')||'{}')}catch(e){} delete ed[dateKey];localStorage.setItem('shambhuALPEditingV1',JSON.stringify(ed));
    refreshALPRegister();
  };
  window.saveDeltaAuto=function(dateKey){
    const g=deltaAutoGroups().find(x=>x.date===dateKey);if(!g)return;let o={};try{o=JSON.parse(localStorage.getItem('shambhuDeltaOverridesV1')||'{}')}catch(e){}
    const storageKey=String(g.sourceKey||dateKey),old=o[storageKey]&&o[storageKey].locked?o[storageKey]:{},stackText=String(g.stackText??old.stackText??g.stacks.join(', ')),cls=classifyDeltaStacks(stackText,old);
    o[storageKey]={...old,sourceKey:storageKey,date:g.date,fumDate:g.fumDate||old.fumDate||'',plannedDate:g.plannedDate||g.date,stackText,count:cls.wheatStacks.length+cls.riceStacks.length,wheat:cls.wheatStacks.length,rice:cls.riceStacks.length,wheatStacks:cls.wheatStacks,riceStacks:cls.riceStacks,wheatMt:cls.wheatMt,riceMt:cls.riceMt,stackMtWheat:cls.stackMtWheat,stackMtRice:cls.stackMtRice,consumption:old.consumption!=null?chemNum(old.consumption):chemNum(g.stacks.length)*0.650,locked:true,manual:true,sourceDetached:true,sourceLockedAt:old.sourceLockedAt||new Date().toISOString()};
    localStorage.setItem('shambhuDeltaOverridesV1',JSON.stringify(o));const r=document.getElementById('chemRows');if(r)r.innerHTML=deltaTableRows();renderChemicalReport();
  };
  window.editDeltaAuto=async function(sourceKey){
    const pin=await qcPinPrompt('Edit ke liye PIN enter karein');
    if(pin===null||String(pin)!==String(getSitePin())){if(pin!==null)alert('Wrong PIN.');return;}
    let o={};try{o=JSON.parse(localStorage.getItem('shambhuDeltaOverridesV1')||'{}')}catch(e){o={};}
    const key=String(sourceKey||'');
    /* Edit is always an in-place edit of the locked snapshot. Never rebuild from source. */
    const stored=o[key]&&o[key].locked?o[key]:null;
    const g=stored||deltaAutoGroups().find(x=>String(x.sourceKey||'')===key);
    if(!g)return;
    const prior=stored||g;
    const currentStacks=String(prior.stackText??[...(prior.wheatStacks||[]),...(prior.riceStacks||[])].join(', '));
    const newDate=await qcDatePrompt('Delta Spray Date',chemISODateValue(prior.date||g.date));if(newDate===null||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(newDate))return;
    const stacks=await qcInputPrompt('Stack Number(s) — comma separated',currentStacks,'text');if(stacks===null)return;
    const cons=await qcInputPrompt('Consumption (kg)',chemNum(prior.consumption).toFixed(3),'number');if(cons===null)return;
    const cls=classifyDeltaStacks(stacks,prior);
    /* Once edited, this row is permanently manual/locked. Source can never overwrite it. */
    o[key]={...prior,sourceKey:key,originalSourceKey:String(prior.originalSourceKey||key),manual:true,sourceDetached:true,
      date:newDate,stackText:String(stacks),count:cls.wheatStacks.length+cls.riceStacks.length,wheat:cls.wheatStacks.length,rice:cls.riceStacks.length,
      wheatStacks:[...cls.wheatStacks],riceStacks:[...cls.riceStacks],wheatMt:cls.wheatMt,riceMt:cls.riceMt,stackMtWheat:cls.stackMtWheat,stackMtRice:cls.stackMtRice,
      consumption:chemNum(cons),locked:true,sourceLockedAt:prior.sourceLockedAt||new Date().toISOString()};
    localStorage.setItem('shambhuDeltaOverridesV1',JSON.stringify(o));
    const r=document.getElementById('chemRows');if(r)r.innerHTML=deltaTableRows();renderChemicalReport();
  };
  window.deleteDeltaAuto=async function(dateKey){const pin=await qcPinPrompt('Delete ke liye PIN enter karein');if(pin===null||String(pin)!==String(getSitePin())){if(pin!==null)alert('Wrong PIN.');return;}if(!confirm('Delete saved Delta register entry? Automatic fumigation data will remain available.'))return;let o={};try{o=JSON.parse(localStorage.getItem('shambhuDeltaOverridesV1')||'{}')}catch(e){}const g=deltaAutoGroups().find(x=>x.date===dateKey);delete o[String(g?.sourceKey||dateKey)];localStorage.setItem('shambhuDeltaOverridesV1',JSON.stringify(o));const r=document.getElementById('chemRows');if(r)r.innerHTML=deltaTableRows();renderChemicalReport();};
  window.saveChemicalEntry=function(){
    const d=document.getElementById('chemDate')?.value, qty=chemNum(document.getElementById('chemQty')?.value), stack=document.getElementById('chemStack')?.value.trim();
    if(!d||qty<=0||!stack){alert('Date, Stack Number aur Quantity भरें.');return}
    const a=chemRead(), editId=document.getElementById('chemEditId')?.value;
    const item={date:d,stack,commodity:document.getElementById('chemCommodity').value,chemical:activeChemicalFolder,qty,unit:'MT',remarks:document.getElementById('chemRemarks')?.value.trim()||''};
    if(editId){const ix=a.findIndex(x=>String(x.id)===String(editId));if(ix>=0){a[ix]={...a[ix],...item};}else{return}}
    else {a.push({id:Date.now(),...item});}
    chemWrite(a);
    document.getElementById('chemRows').innerHTML=chemTableRows();renderChemicalReport();clearChemicalForm();
    alert(editId?'Chemical entry updated.':'Chemical entry saved.');
  };
  window.editChemicalEntry=function(id){const pin=prompt('Edit ke liye PIN enter karein:');if(pin===null||String(pin)!==String(getSitePin())){if(pin!==null)alert('Wrong PIN.');return;}
    const x=chemRead().find(v=>String(v.id)===String(id)); if(!x)return;
    document.getElementById('chemEditId').value=x.id; document.getElementById('chemDate').value=String(x.date||'').slice(0,10); document.getElementById('chemStack').value=x.stack||''; document.getElementById('chemCommodity').value=x.commodity||'Wheat';
    const q=chemNum(x.qty)*(String(x.unit||'MT').toLowerCase()==='kg'?0.001:1); document.getElementById('chemQty').value=q.toFixed(3); document.getElementById('chemRemarks').value=x.remarks||'';
    const t=document.getElementById('chemFormTitle'); if(t)t.textContent='Edit '+activeChemicalFolder+' Entry';
    const b=document.querySelector('.chem-save'); if(b)b.innerHTML='💾 UPDATE ENTRY';
    document.getElementById('chemDate').scrollIntoView({behavior:'smooth',block:'center'});
  };
  window.clearChemicalForm=function(){['chemStack','chemQty','chemRemarks'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});const id=document.getElementById('chemEditId');if(id)id.value='';const t=document.getElementById('chemFormTitle');if(t)t.textContent='New '+activeChemicalFolder+' Entry';const b=document.querySelector('.chem-save');if(b)b.innerHTML='💾 SAVE ENTRY';};
  window.deleteChemicalEntry=function(id){const pin=prompt('Delete ke liye PIN enter karein:');if(pin===null||String(pin)!==String(getSitePin())){if(pin!==null)alert('Wrong PIN.');return;}if(!confirm('Delete this chemical entry?'))return;chemWrite(chemRead().filter(x=>String(x.id)!==String(id)));let ml={};try{ml=JSON.parse(localStorage.getItem('shambhuMalathionLocksV1')||'{}')}catch(e){ml={}};delete ml[String(id)];localStorage.setItem('shambhuMalathionLocksV1',JSON.stringify(ml));const r=document.getElementById('chemRows');if(r)r.innerHTML=chemTableRows();renderChemicalReport();};
  function alpReportHtml(){const r=reportData(),month=new Date(r.m+'-01T00:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'});let progW=0,progR=0,progCons=0;const split=(w,r)=>`<div class="prog-split"><span>Wheat: <b>${Math.round(w)} MT</b></span><span>Rice: <b>${Math.round(r)} MT</b></span></div>`;const rows=r.mm.map((x,i)=>{const w=chemNum(x.wheatMt||0),ri=chemNum(x.riceMt||0),c=chemNum(x.consumption);progW+=w;progR+=ri;progCons+=c;return `<tr><td>${i+1}</td><td>${chemDate(x.date)}</td><td>${escC(x.stackText)}</td><td>${Math.round(x.mt)}</td><td>${Math.round(w)}</td><td>${Math.round(ri)}</td><td>${split(progW,progR)}</td><td>${c.toFixed(3)}</td><td><b>${progCons.toFixed(3)}</b></td></tr>`}).join('');return `<!doctype html><html><head><meta charset="utf-8"><title>ALP Report</title><style>body{font-family:Arial;margin:28px;color:#172d25}h1{text-align:center;margin:0;font-size:24px}h2{text-align:center;margin:5px 0 18px;font-size:18px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #999;padding:7px;text-align:center;vertical-align:middle}th{background:#073d2c;color:white}.prog-split{display:grid;grid-template-columns:1fr 1fr;min-width:150px}.prog-split span:first-child{border-right:3px solid #555;padding-right:8px}.prog-split span:last-child{padding-left:8px}.prog-split.no-divider span:first-child{border-right:0;padding-right:8px}@media(max-width:700px){body{margin:12px}table{font-size:10px}th,td{padding:5px}.prog-split{min-width:125px}}</style></head><body><h1>SHED NO. 9 / 14 / 18 / 20</h1><h2>ALP CONSUMPTION REPORT — ${month}</h2><table><thead><tr><th>Sr No</th><th>Fumigation Date</th><th>Stack Number</th><th>Total MT</th><th>Wheat Fumigation MT</th><th>Rice Fumigation MT</th><th>Progressive (MT)<br>Wheat | Rice</th><th>Consumption (kg)</th><th>Consumption Progressive (kg)</th></tr></thead><tbody>${rows||'<tr><td colspan="9">No saved ALP entries for this month.</td></tr>'}</tbody></table></body><style id="moisture-update-rmc-hide-only">
/* Only requested Moisture Update change: keep Add New Stack, hide Manual/Current RMC cards. */
.moisture-focused-page .mo-stack-details{display:none!important}
</style>
</html>`;}
  function deltaReportHtml(){const r=reportData(),month=new Date(r.m+'-01T00:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'});let prog=0;const lines=a=>Array.isArray(a)?a.map(st=>`<div>${escC(st)}</div>`).join(''):'',rows=r.mm.map((x,i)=>{const w=chemNum(x.wheatMt||0),ri=chemNum(x.riceMt||0),cons=chemNum(x.consumption||0);prog+=cons;return `<tr><td>${i+1}</td><td>${chemDate(x.date)}</td><td>${lines(x.stacksWheat)}</td><td>${lines(x.stacksRice)}</td><td>${w.toFixed(0)} MT</td><td>${ri.toFixed(0)} MT</td><td>${(w+ri).toFixed(0)} MT</td><td>${cons.toFixed(3)} kg</td><td><b>${prog.toFixed(3)} kg</b></td></tr>`}).join('');const totalRow=`<tr class="delta-total-row"><td colspan="4"><b>TOTAL</b></td><td><b>${chemNum(r.wheatQty||0).toFixed(0)} MT</b></td><td><b>${chemNum(r.riceQty||0).toFixed(0)} MT</b></td><td><b>${(chemNum(r.wheatQty||0)+chemNum(r.riceQty||0)).toFixed(0)} MT</b></td><td><b>${chemNum(r.totalDelta||0).toFixed(3)} kg</b></td><td><b>${chemNum(r.totalDelta||0).toFixed(3)} kg</b></td></tr>`;return `<!doctype html><html><head><meta charset="utf-8"><title>Delta Report</title><style>body{font-family:Arial;margin:28px;color:#172d25}h1{text-align:center;margin:0;font-size:24px}h2{text-align:center;margin:5px 0 18px;font-size:18px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #999;padding:7px;text-align:center;vertical-align:top}th{background:#073d2c;color:white}td div{line-height:1.35;font-weight:600}.delta-total-row td{font-weight:700;background:#fff7d6;border-top:2px solid #555}@media(max-width:700px){body{margin:12px}table{font-size:10px}th,td{padding:5px}}</style></head><body><h1>SHED NO. 9 / 14 / 18 / 20</h1><h2>DELTA SPRAY REPORT — ${month}</h2><table><thead><tr><th>Sr Number</th><th>Date of Delta Spray</th><th>Stacks Numbers – Wheat</th><th>Stacks Numbers – Rice</th><th>Wheat Spray (MT)</th><th>Rice Spray (MT)</th><th>Total Spray (MT)</th><th>Consumption (kg)</th><th>Progressive Consumption (kg)</th></tr></thead><tbody>${rows||'<tr><td colspan="9">No Delta entries for this month.</td></tr>'}</tbody><tfoot>${totalRow}</tfoot></table></body></html>`;}
  function reportHtml(){const r=reportData(),month=new Date(r.m+'-01T00:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'}), rows=r.mm.map((x,i)=>`<tr><td>${i+1}</td><td>${chemDate(x.date)}</td><td>${escC(x.shed)}</td><td>${escC(x.stack)}</td><td>${escC(x.commodity)}</td><td>${escC(x.chemical)}</td><td>${chemNum(x.qty).toFixed(2)}</td><td>${escC(x.unit)}</td><td>${escC(x.purpose)}</td><td>${escC(x.remarks)}</td></tr>`).join('');return `<!doctype html><html><head><meta charset="utf-8"><title>Chemical Report</title><style>body{font-family:Arial;margin:28px;color:#172d25}h1{text-align:center;margin:0;font-size:24px}h2{text-align:center;margin:5px 0 18px;font-size:18px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #999;padding:7px}th{background:#073d2c;color:white}.sum{margin:14px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.card{border:1px solid #aaa;padding:10px}.card b{display:block;font-size:16px;margin-top:4px}</style><style id="compact-colour-summary-row">.report-summary-row td{font-weight:600;padding:4px 3px;line-height:1.15;background:#fff7d6;border:1px solid #d6b656;color:#243126}.report-summary-row td:nth-child(1),.report-summary-row td:nth-child(2){background:#e8eefc;color:#244a8f}.report-summary-row td:nth-child(3){background:#e8f7ec;color:#168a45}.report-summary-row td:nth-child(4){background:#fff0e1;color:#b45b16}.report-summary-row td:nth-child(5){background:#eee8ff;color:#6542a5}.report-summary-row td:nth-child(6){background:#e7f7f7;color:#16757a}.report-summary-row b{font-size:12px}</style></head><body><h1>SHED NO. 9 / 14 / 18 / 20</h1><h2>CHEMICAL CONSUMPTION REPORT — ${month}</h2><div class="sum"><div class="card">Wheat ${activeChemicalFolder||"Chemical"}<b>${r.mm.filter(x=>x.commodity==="Wheat").reduce((s,x)=>s+chemNum(x.qty),0).toFixed(2)} Kg</b></div><div class="card">Rice ${activeChemicalFolder||"Chemical"}<b>${r.mm.filter(x=>x.commodity==="Rice").reduce((s,x)=>s+chemNum(x.qty),0).toFixed(2)} Kg</b></div><div class="card">Total ${activeChemicalFolder||"Chemical"}<b>${r.mm.reduce((s,x)=>s+chemNum(x.qty),0).toFixed(2)} Kg</b></div></div><table><thead><tr><th>Sr</th><th>Date</th><th>Shed</th><th>Stack</th><th>Commodity</th><th>Chemical</th><th>Qty</th><th>Unit</th><th>Purpose</th><th>Remarks</th></tr></thead><tbody>${rows||'<tr><td colspan="10">No entries for this month.</td></tr>'}</tbody></table><p><b>Abhi tak:</b> Wheat ${activeChemicalFolder||"Chemical"} ${r.total.filter(x=>x.commodity==="Wheat").reduce((s,x)=>s+chemNum(x.qty),0).toFixed(2)} Kg | Rice ${activeChemicalFolder||"Chemical"} ${r.total.filter(x=>x.commodity==="Rice").reduce((s,x)=>s+chemNum(x.qty),0).toFixed(2)} Kg | Total ${(r.total.reduce((s,x)=>s+chemNum(x.qty),0)).toFixed(2)} Kg</p></body>
<style id="alp-few-heavy-final-fix">
.stack-item.stack-weight-toggle.weight-few em{background:#e7f7ec!important;color:#168a45!important;border:1px solid #9bd3ad!important}
.stack-item.stack-weight-toggle.weight-heavy em{background:#ffe8e8!important;color:#c62828!important;border:1px solid #e2a0a0!important}
.stack-item.stack-weight-toggle{touch-action:manipulation;cursor:pointer!important;-webkit-tap-highlight-color:transparent}
</style>
<style id="moisture-update-rmc-hide-only">
/* Only requested Moisture Update change: keep Add New Stack, hide Manual/Current RMC cards. */
.moisture-focused-page .mo-stack-details{display:none!important}
</style>
</html>`;}
  function malathionReportHtml(){const r=reportData(),month=new Date(r.m+'-01T00:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'}),w=chemNum(r.monthWheatQty),ri=chemNum(r.monthRiceQty),t=w+ri,aw=chemNum(r.allWheatQty),ar=chemNum(r.allRiceQty),at=aw+ar,done=(r.mm||[]).reduce((s,x)=>s+Math.round(chemNum(x.qty)),0),allDone=(r.total||[]).reduce((s,x)=>s+Math.round(chemNum(x.qty)),0),target=t*0.20,allTarget=at*0.20,remain=Math.max(0,target-done),allRemain=Math.max(0,allTarget-allDone);return `<!doctype html><html><head><meta charset="utf-8"><title>Malathion Report</title><style>body{font-family:Arial;margin:28px;color:#172d25}h1{text-align:center;margin:0;font-size:24px}h2{text-align:center;margin:5px 0 18px;font-size:18px}.sum{margin:14px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.card{border:1px solid #aaa;padding:10px;text-align:center}.card b{display:block;font-size:16px;margin-top:4px}.indicator{border:2px solid #b8860b;padding:12px;margin:16px 0;text-align:center;background:#fffaf0}.indicator strong{font-size:18px}</style><style id="compact-colour-summary-row">.report-summary-row td{font-weight:600;padding:4px 3px;line-height:1.15;background:#fff7d6;border:1px solid #d6b656;color:#243126}.report-summary-row td:nth-child(1),.report-summary-row td:nth-child(2){background:#e8eefc;color:#244a8f}.report-summary-row td:nth-child(3){background:#e8f7ec;color:#168a45}.report-summary-row td:nth-child(4){background:#fff0e1;color:#b45b16}.report-summary-row td:nth-child(5){background:#eee8ff;color:#6542a5}.report-summary-row td:nth-child(6){background:#e7f7f7;color:#16757a}.report-summary-row b{font-size:12px}</style></head><body><h1>SHED NO. 9 / 14 / 18 / 20</h1><h2>MALATHION REQUIREMENT REPORT — ${month}</h2><div class="sum"><div class="card">ALP Wheat Qty<b>${Math.round(w)} MT</b></div><div class="card">ALP Rice Qty<b>${Math.round(ri)} MT</b></div><div class="card">Total ALP Qty<b>${Math.round(t)} MT</b></div><div class="card">Malathion 20% Target<b>${target.toFixed(2)} MT</b></div><div class="card">Malathion Done<b>${done.toFixed(2)} MT</b></div><div class="card">Malathion Baki<b>${remain.toFixed(2)} MT</b></div></div><div class="indicator"><b>20% MALATHION REQUIREMENT</b><br>Target ${target.toFixed(2)} MT · Done ${done.toFixed(2)} MT · <strong>Baki ${remain.toFixed(2)} MT</strong></div><p><b>Abhi tak:</b> Wheat ALP ${Math.round(aw)} MT | Rice ALP ${Math.round(ar)} MT | Total ALP ${Math.round(at)} MT | 20% Target ${allTarget.toFixed(2)} MT | Done ${allDone.toFixed(2)} MT | <b>Baki ${allRemain.toFixed(2)} MT</b></p></body>
<style id="alp-few-heavy-final-fix">
.stack-item.stack-weight-toggle.weight-few em{background:#e7f7ec!important;color:#168a45!important;border:1px solid #9bd3ad!important}
.stack-item.stack-weight-toggle.weight-heavy em{background:#ffe8e8!important;color:#c62828!important;border:1px solid #e2a0a0!important}
.stack-item.stack-weight-toggle{touch-action:manipulation;cursor:pointer!important;-webkit-tap-highlight-color:transparent}
</style>
<style id="moisture-update-rmc-hide-only">
/* Only requested Moisture Update change: keep Add New Stack, hide Manual/Current RMC cards. */
.moisture-focused-page .mo-stack-details{display:none!important}
</style>
<style id="chemical-current-month-indicators-final">.alp-indicator-outside,.delta-indicator-outside{margin-top:10px}.report-summary-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.report-summary-row>div{font-weight:700;padding:7px 5px;line-height:1.15;text-align:center;border:1px solid #d6b656;border-radius:7px;background:#fff7d6;font-size:11px}.report-summary-row>div:nth-child(2){background:#e8f7ec;color:#168a45}.report-summary-row>div:nth-child(3){background:#e8eefc;color:#244a8f}.report-summary-row>div:nth-child(4){background:#fff0e1;color:#b45b16}.report-summary-row b{font-size:10px;display:block;margin-bottom:2px}.mal-20-indicator .report-summary-row>div:nth-child(3){background:#fff0f0;color:#a12626}.mal-20-indicator .report-summary-row>div:nth-child(4){background:#e7f7f7;color:#16757a}@media(max-width:600px){.report-summary-row{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>
</html>`;}
  window.renderChemicalReport=function(){
  try{
    const id=activeChemicalFolder==='Malathion'?'chemSummary':activeChemicalFolder==='Delta'?'deltaReportSummary':'alpReportSummary';
    const box=document.getElementById(id); if(!box)return;
    const r=reportData();
    const now=new Date(), y=now.getFullYear(), mo=String(now.getMonth()+1).padStart(2,'0');
    const monthFrom=y+'-'+mo+'-01', today=y+'-'+mo+'-'+String(now.getDate()).padStart(2,'0');
    const tillDate=a=>Array.isArray(a)?a.filter(x=>{const d=chemISODateValue(x.date);return d>=monthFrom&&d<=today;}):[];
    if(activeChemicalFolder==='ALP'){
      const till=tillDate(r.total);
      const wheatMt=till.reduce((s,x)=>s+chemNum(x.wheatMt||0),0), riceMt=till.reduce((s,x)=>s+chemNum(x.riceMt||0),0);
      const totalMt=wheatMt+riceMt, usedTill=till.reduce((s,x)=>s+chemNum(x.consumption),0);
      box.innerHTML=`<div class="report-summary-row"><div><b>TOTAL ALP FUMIGATION</b><br>${Math.round(totalMt)} MT</div><div><b>WHEAT FUMIGATION</b><br>${Math.round(wheatMt)} MT</div><div><b>RICE FUMIGATION</b><br>${Math.round(riceMt)} MT</div><div><b>TOTAL ALP USED</b><br>${usedTill.toFixed(3)} kg</div></div>`;
    }else if(activeChemicalFolder==='Delta'){
      const till=tillDate(r.total), wheatMt=till.reduce((s,x)=>s+chemNum(x.wheatMt||0),0), riceMt=till.reduce((s,x)=>s+chemNum(x.riceMt||0),0);
      const wheatStacks=till.reduce((s,x)=>s+Number(x.wheat||0),0), riceStacks=till.reduce((s,x)=>s+Number(x.rice||0),0), totalStacks=wheatStacks+riceStacks, totalMt=wheatMt+riceMt;
      const currentKg=till.reduce((s,x)=>s+chemNum(x.consumption),0);
      box.innerHTML=`<div class="report-summary-row"><div><b>TOTAL DELTA SPRAY</b><br>${Math.round(totalMt)} MT · ${totalStacks} stacks</div><div><b>WHEAT DELTA</b><br>${Math.round(wheatMt)} MT · ${wheatStacks} stacks</div><div><b>RICE DELTA</b><br>${Math.round(riceMt)} MT · ${riceStacks} stacks</div><div><b>DELTA USED</b><br>${currentKg.toFixed(3)} kg</div></div>`;
    }else if(activeChemicalFolder==='Malathion'){
      const malAll=Array.isArray(r.total)?r.total:[], malTill=tillDate(malAll);
      const alpTill=tillDate(alpAutoGroups());
      const alpMt=alpTill.reduce((s,x)=>s+chemNum(x.wheatMt||0)+chemNum(x.riceMt||0),0);
      const required=alpMt*0.20;
      const actual=malTill.reduce((s,x)=>s+chemNum(x.qty),0);
      const due=Math.max(0,required-actual);
      const usedL=malTill.reduce((s,x)=>s+chemNum(x.consumption),0);
      box.innerHTML=`<div class="report-summary-row"><div><b>REQUIRED MALATHION</b><br>${required.toFixed(2)} MT</div><div><b>ACTUAL MALATHION SPRAY</b><br>${actual.toFixed(2)} MT</div><div><b>DUE MALATHION</b><br>${due.toFixed(2)} MT</div><div><b>MALATHION USED</b><br>${usedL.toFixed(3)} Ltr</div></div>`;
    }
  }catch(e){console.error('Chemical report render error',e);}
};
  window.viewChemicalReport=function(){const w=window.open('','_blank');if(!w){alert('Popup blocked. Allow popups for View Report.');return}w.document.write(activeChemicalFolder==='ALP'?alpReportHtml():activeChemicalFolder==='Delta'?deltaReportHtml():activeChemicalFolder==='Malathion'?malathionReportHtml():reportHtml());w.document.close();};
  window.downloadChemicalPDF=function(){const w=window.open('','_blank');if(!w){alert('Popup blocked.');return}w.document.write((activeChemicalFolder==='ALP'?alpReportHtml():activeChemicalFolder==='Delta'?deltaReportHtml():activeChemicalFolder==='Malathion'?malathionReportHtml():reportHtml()).replace('</body>','<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\\/script></body>'));w.document.close();};
  window.downloadChemicalExcel=function(){const r=reportData(),html=activeChemicalFolder==='ALP'?alpReportHtml():activeChemicalFolder==='Delta'?deltaReportHtml():activeChemicalFolder==='Malathion'?malathionReportHtml():reportHtml();const blob=new Blob([html],{type:'application/vnd.ms-excel'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SHAMBHU_SHED_Chemical_Report_'+r.m+'.xls';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
function malathionEntries(){
    return chemRead().filter(x=>x.chemical==='Malathion').sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.id)-Number(b.id));
  }
  function malEntryStacks(x){
    if(Array.isArray(x.stacks) && x.stacks.length) return x.stacks.map(v=>({stack:String(v.stack||v.s||''),commodity:v.commodity||x.commodity||'Rice',qty:Math.round(chemNum(v.qty||0))})).filter(v=>v.stack);
    return x.stack?[{stack:String(x.stack),commodity:x.commodity||'Rice',qty:Math.round(chemNum(x.qty||0))}]:[];
  }
  function malathionTableRows(){
    const a=malathionEntries(); let progressive=0; let locks={};
    try{locks=JSON.parse(localStorage.getItem('shambhuMalathionLocksV1')||'{}')}catch(e){locks={}}
    return a.length?a.map((x,i)=>{
      const ss=malEntryStacks(x), q=ss.reduce((n,v)=>n+Math.round(chemNum(v.qty)),0);
      const cons=chemNum(x.consumption)!=null&&x.consumption!==''?chemNum(x.consumption):ss.length*0.061; progressive+=cons;
      const groups={Wheat:[],Rice:[]};ss.forEach(v=>(groups[v.commodity==='Wheat'?'Wheat':'Rice']).push(v));
      const stackHtml=['Wheat','Rice'].map(c=>groups[c].length?`<div class="mal-stack-group ${c==='Wheat'?'mal-wheat':'mal-rice'}"><b>${c}</b><span>${groups[c].map(v=>escC(v.stack)).join(', ')}</span></div>`:'').join('');
      const commodity=groups.Wheat.length&&groups.Rice.length?'Wheat + Rice':(groups.Wheat.length?'Wheat':'Rice');
      const locked=locks[String(x.id)]?.locked!==false;
      const action=locked?`<div class="chem-action-group"><span class="alp-lock-badge">🔒 Locked</span><button class="pill chem-edit-btn" onclick="editMalathionEntry('${String(x.id)}')">✏️ Edit</button><button class="pill chem-delete-btn" onclick="deleteMalathionEntry('${String(x.id)}')">🗑 Delete</button></div>`:`<div class="chem-action-group"><button class="pill chem-save-btn" onclick="lockMalathionRow('${String(x.id)}')">💾 Save</button></div>`;
      return `<tr class="${locked?'alp-row-locked':''}"><td>${i+1}</td><td>${chemDate(x.date)}</td><td class="mal-stack-cell">${stackHtml||escC(x.stack||'—')}</td><td>${q}</td><td>${cons.toFixed(3)} Ltr</td><td><b>${progressive.toFixed(3)} Ltr</b></td><td><span class="commodity-badge ${commodity==='Wheat'?'wheat':commodity==='Rice'?'rice':'mix'}">${commodity}</span></td><td>${action}</td></tr>`;
    }).join(''):'<tr><td colspan="8" class="empty">No Malathion entries saved yet.</td></tr>';
  }
  window.lockMalathionRow=function(id){let ml={};try{ml=JSON.parse(localStorage.getItem('shambhuMalathionLocksV1')||'{}')}catch(e){ml={}};ml[String(id)]={locked:true};localStorage.setItem('shambhuMalathionLocksV1',JSON.stringify(ml));const r=document.getElementById('chemRows');if(r)r.innerHTML=malathionTableRows();renderChemicalReport();};
  function malathionStackOptions(){
    const seen=new Map();
    activeRows().forEach(r=>{
      const st=String(stack(r)||'').trim(); if(!st||seen.has(st))return;
      seen.set(st,{stack:st,qty:Math.round(qty(r)),commodity:isWheat(r)?'Wheat':'Rice'});
    });
    return Array.from(seen.values()).sort((a,b)=>a.stack.localeCompare(b.stack,undefined,{numeric:true}));
  }
  function malathionSelectedValues(){
    return [...document.querySelectorAll('#malStackList input[data-stack]:checked')].map(el=>({stack:el.dataset.stack,commodity:el.dataset.commodity,qty:Math.round(Number(el.dataset.qty||0))}));
  }
  function renderMalathionSelection(selected){
    const opts=malathionStackOptions(), chosen=new Map((selected||[]).map(v=>[String(v.stack),v]));
    const box=document.getElementById('malStackList'); if(!box)return;
    const wheat=opts.filter(o=>o.commodity==='Wheat'), rice=opts.filter(o=>o.commodity!=='Wheat');
    const group=(title,arr,cls)=>arr.length?`<div class="mal-stack-select-group ${cls}"><div class="mal-group-title">${title}</div>${arr.map(o=>{const v=chosen.get(o.stack);return `<label class="mal-stack-option"><input type="checkbox" data-stack="${escC(o.stack)}" data-commodity="${o.commodity}" data-qty="${o.qty}" ${v?'checked':''}><span>${escC(o.stack)}</span><b>${o.qty} MT</b></label>`}).join('')}</div>`:'';
    box.innerHTML=group('WHEAT',wheat,'wheat')+group('RICE',rice,'rice')+(opts.length?'':'<div class="empty">No active stacks found.</div>');
    box.querySelectorAll('input[data-stack]').forEach(el=>el.addEventListener('change',updateMalathionEntryPreview));
    updateMalathionEntryPreview();
  }
  function updateMalathionEntryPreview(){
    const a=malathionSelectedValues(), total=a.reduce((s,x)=>s+Math.round(Number(x.qty||0)),0), cons=a.length*0.061;
    const q=document.getElementById('malEntryQtyTotal'), c=document.getElementById('malEntryConsumption'); if(q)q.textContent=`${total} MT`;
    if(c)c.textContent=`${cons.toFixed(3)} Ltr (${a.length} stack${a.length===1?'':'s'} × 0.061)`;
  }
  window.openMalathionEntry=function(editId){
    const old=document.getElementById('malathionEntryModal'); if(old)old.remove();
    let existing=null;if(editId) existing=chemRead().find(v=>String(v.id)===String(editId))||null;
    const selected=existing?malEntryStacks(existing):[];
    const today=new Date(); const ds=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    const modal=document.createElement('div'); modal.id='malathionEntryModal'; modal.className='modal show';
    modal.innerHTML=`<div class="modalbox malathion-entry-box"><div class="modalhead"><h3 style="margin:0">${existing?'✏️ EDIT MALATHION ENTRY':'➕ ADD NEW MALATHION ENTRY'}</h3><button class="close" onclick="closeMalathionEntry()">✕</button></div><div class="malathion-entry-form"><label>Date<input id="malEntryDate" type="date" value="${String(existing?.date||ds).slice(0,10)}" onclick="try{if(this.showPicker)this.showPicker()}catch(e){}"></label><div class="mal-stack-label">Stack Number <span class="smallmuted">Select one or more — Wheat/Rice both allowed</span></div><div id="malStackList" class="mal-stack-list"></div><div class="mal-entry-summary"><div>Total Qty: <b id="malEntryQtyTotal">0 MT</b></div><div>Consumption: <b id="malEntryConsumption">0.000 Ltr</b></div></div></div><div class="chemical-actions malathion-entry-actions"><button class="chem-save" onclick="saveMalathionEntry('${editId||''}')">💾 ${existing?'UPDATE ENTRY':'SAVE ENTRY'}</button></div></div>`;
    document.body.appendChild(modal); renderMalathionSelection(selected);
  };
  window.closeMalathionEntry=function(){const m=document.getElementById('malathionEntryModal');if(m)m.remove();};
  window.toggleMalathionCommodity=function(){};
  window.saveMalathionEntry=function(editId){try{const d=document.getElementById('malEntryDate')?.value||'',stacks=malathionSelectedValues();if(!d){alert('Date select karein.');return}if(!stacks.length){alert('Kam se kam 1 stack select karein.');return}let a=chemRead();if(!Array.isArray(a))a=[];const id=editId?String(editId):('MAL-'+Date.now()+'-'+Math.random().toString(36).slice(2,8));const clean=stacks.map(x=>({stack:String(x.stack||''),commodity:String(x.commodity||'Rice'),qty:Math.round(chemNum(x.qty))})).filter(x=>x.stack);if(!clean.length){alert('Stack select karein.');return}const totalQty=clean.reduce((n,x)=>n+x.qty,0),cons=clean.length*0.061;const record={id,chemical:'Malathion',date:String(d).slice(0,10),stacks:clean,stack:clean.map(x=>x.stack).join(', '),commodity:clean.every(x=>x.commodity==='Wheat')?'Wheat':clean.every(x=>x.commodity==='Rice')?'Rice':'Wheat + Rice',qty:totalQty,unit:'MT',consumption:cons,remarks:''};const ix=a.findIndex(v=>String(v.id)===id);if(ix>=0)a[ix]={...a[ix],...record,id:a[ix].id};else a.push(record);chemWrite(a);let ml={};try{ml=JSON.parse(localStorage.getItem('shambhuMalathionLocksV1')||'{}')}catch(e){ml={}};ml[String(record.id)]={locked:true};localStorage.setItem('shambhuMalathionLocksV1',JSON.stringify(ml));if(!chemRead().some(v=>String(v.id)===String(record.id))){alert('Entry save nahi hui.');return}closeMalathionEntry();const dp=document.getElementById('dynamicPage');if(dp){dp.innerHTML=chemicalPage();if(typeof restoreChemicalReportState==='function')restoreChemicalReportState();renderChemicalReport();setTimeout(renderChemicalReport,50)} }catch(e){console.error(e);alert('Malathion entry save nahi hui. Dobara try karein.')}};
  window.editMalathionEntry=async function(id){
    const pin=await qcPinPrompt('Edit ke liye PIN enter karein');if(pin===null||String(pin)!==String(getSitePin())){if(pin!==null)alert('Wrong PIN.');return;}
    openMalathionEntry(id);
  };
  window.deleteMalathionEntry=function(id){const pin=prompt('Delete ke liye PIN enter karein:');if(pin===null||String(pin)!==String(getSitePin())){if(pin!==null)alert('Wrong PIN.');return;}if(!confirm('Delete this Malathion entry?'))return;chemWrite(chemRead().filter(x=>String(x.id)!==String(id)));const r=document.getElementById('chemRows');if(r)r.innerHTML=malathionTableRows();renderChemicalReport();};
  
  function chemicalPage(){
    const now=new Date(), folder=activeChemicalFolder;
    if(!folder) return chemicalFolderPage();
    const reportFolder=(id,title,body)=>`<details id="${id}" data-chem-report="${id}" class="chem-report-folder"><summary>📁 ${title}</summary><div class="chem-report-folder-body">${body}</div></details>`;
    const reportControls=`<div class="chem-report-filter"><label>From Date<input id="chemFromDate" type="date" onchange="renderChemicalReport()"></label><label>To Date<input id="chemToDate" type="date" onchange="renderChemicalReport()"></label><button class="pill" onclick="setCurrentChemicalMonth()">Current Month</button><details class="chem-history"><summary>📅 History — Month Wise</summary><label>Month<input id="chemHistoryMonth" type="month" onchange="setHistoryChemicalMonth(this.value)"></label></details></div>`;
    const reportActions=`<div class="chemical-actions chem-register-downloads"><button class="chem-blue" onclick="viewChemicalReport()">👁 VIEW REPORT</button><button class="chem-orange" onclick="downloadChemicalExcel()">📊 EXCEL</button><button class="chem-red" onclick="downloadChemicalPDF()">📄 PDF</button></div>`;
    if(folder==='ALP'){
      return `<div class="panel"><div class="panelhead"><button class="pill" onclick="openChemicalFolders()">← CHEMICAL FOLDERS</button> &nbsp; 💊 ALP REGISTER</div></div>
      <div class="panel"><div class="panelhead">📒 ALP CONSUMPTION REGISTER</div>
        <div class="chem-register-wrap"><table class="chem-table chem-register-table"><thead><tr><th>Sr No.</th><th>Date</th><th class="stack-number-head" onclick="toggleChemicalStackDetails(event)" title="Tap to show/hide MT and FEW/HEAVY for all stacks">Stack Number</th><th>Total Qty (MT)</th><th>Consumption (kg)</th><th>Progressive Consumption (kg)</th><th><div class="treatment-head"><span>Wheat</span><i></i><span>Rice</span></div><small>Treatment Qty (MT)</small></th><th>Action</th></tr></thead><tbody id="chemRows">${alpTableRows()}</tbody></table></div><div class="chemical-actions chem-register-downloads"><button class="chem-orange" onclick="downloadChemicalRegisterExcel('ALP')">📊 REGISTER EXCEL</button><button class="chem-red" onclick="downloadChemicalRegisterPDF('ALP')">📄 REGISTER PDF</button></div>
        <div id="alpReportSummary" class="alp-report-box alp-indicator-outside"></div>${reportFolder('alpReportFolder','ALP REPORT',`${reportControls}${reportActions}`)}
      </div>`;
    }
    if(folder==='Delta'){
      return `<div class="panel"><div class="panelhead"><button class="pill" onclick="openChemicalFolders()">← CHEMICAL FOLDERS</button> &nbsp; 🧪 DELTA REGISTER</div></div>
      <div class="panel"><div class="panelhead">📒 DELTA CONSUMPTION REGISTER</div>
        <div class="chem-register-wrap"><table class="chem-table chem-register-table"><thead><tr><th>Sr No.</th><th>Entry Date</th><th>Stack Number</th><th>Consumption (kg)</th><th>Progressive Consumption (kg)</th><th>Fumigated Stacks</th><th>Action</th></tr></thead><tbody id="chemRows">${deltaTableRows()}</tbody></table></div><div class="chemical-actions chem-register-downloads"><button class="chem-orange" onclick="downloadChemicalRegisterExcel('Delta')">📊 REGISTER EXCEL</button><button class="chem-red" onclick="downloadChemicalRegisterPDF('Delta')">📄 REGISTER PDF</button></div>
        <div id="deltaReportSummary" class="alp-report-box delta-indicator-outside"></div>${reportFolder('deltaReportFolder','DELTA REPORT',`${reportControls}${reportActions}`)}
      </div>`;
    }
    if(folder==='Malathion'){
      return `<div class="panel"><div class="panelhead"><button class="pill" onclick="openChemicalFolders()">← CHEMICAL FOLDERS</button> &nbsp; 🧴 MALATHION REGISTER</div>
        <div class="malathion-add-row"><button class="chem-save malathion-add-btn" onclick="openMalathionEntry()">➕ ADD NEW ENTRY</button><span class="smallmuted">0.061 Ltr per stack</span></div>
      </div>
      <div class="panel"><div class="panelhead">📒 MALATHION CONSUMPTION REGISTER</div>
        <div class="chem-register-wrap"><table class="chem-table chem-register-table"><thead><tr><th>Sr No.</th><th>Date</th><th>Stack Number</th><th>Qty (MT)</th><th>Consumption</th><th>Progressive Consumption</th><th>Commodity</th><th>Action</th></tr></thead><tbody id="chemRows">${malathionTableRows()}</tbody></table></div><div class="chemical-actions chem-register-downloads"><button class="chem-orange" onclick="downloadChemicalRegisterExcel('Malathion')">📊 REGISTER EXCEL</button><button class="chem-red" onclick="downloadChemicalRegisterPDF('Malathion')">📄 REGISTER PDF</button></div>
        ${typeof window.malathionProgressHtml==='function'?window.malathionProgressHtml():''}
        <div id="chemSummary" class="alp-report-box mal-20-indicator alp-indicator-outside"></div>${reportFolder('malathionReportFolder','MALATHION REPORT',`${reportControls}${reportActions}`)}
      </div>`;
    }
    return `<div class="panel"><div class="panelhead"><button class="pill" onclick="openChemicalFolders()">← CHEMICAL FOLDERS</button> &nbsp; 🧪 ${folder.toUpperCase()} REGISTER</div></div>`;
  }

  // Chemical folder navigation: keep ALP, Delta and Malathion independently accessible.
  window.openChemicalFolder=function(name){
    name=String(name||'');
    if(!['ALP','Delta','Malathion'].includes(name)) return;
    activeChemicalFolder=name;
    localStorage.setItem('shambhuChemicalFolder',name);
    const dp=document.getElementById('dynamicPage');
    if(dp){
      dp.innerHTML=chemicalPage();
      const r=document.getElementById('chemRows');
      if(r && (name==='ALP'||name==='Delta')) r.innerHTML=chemTableRows();
      if(typeof restoreChemicalReportState==='function') restoreChemicalReportState();
      renderChemicalReport();
    }
  };
  window.openChemicalFolders=function(){
    activeChemicalFolder='';
    localStorage.removeItem('shambhuChemicalFolder');
    const dp=document.getElementById('dynamicPage');
    if(dp) dp.innerHTML=chemicalFolderPage();
  };

  const oldRender=window.renderPage;
  window.renderPage=function(page){if(page==='chemical'){document.body.classList.remove('moisture-active');document.getElementById('dynamicPage').innerHTML=chemicalPage();const r=document.getElementById('chemRows');if(r && (activeChemicalFolder==='ALP'||activeChemicalFolder==='Delta'))r.innerHTML=chemTableRows();if(typeof restoreChemicalReportState==='function')restoreChemicalReportState();renderChemicalReport();setTimeout(renderChemicalReport,50);return;}return oldRender(page);};
})();
