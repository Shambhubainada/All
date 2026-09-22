
(function(){
  /* Malathion progress block was referenced by chemicalPage() but was missing in some builds. */
  window.malathionProgressHtml=function(){
    try{
      // Read the same all-time ALP totals used by the ALP report.
      let total=0;
      try{
        const ar=typeof reportData==='function'?reportData():null;
        if(ar && ar.allWheatQty!=null && ar.allRiceQty!=null){
          total=Number(ar.allWheatQty||0)+Number(ar.allRiceQty||0);
        }
      }catch(e){}
      if(!total){
        const alp=typeof alpAutoGroups==='function'?alpAutoGroups():[];
        total=alp.reduce((sum,x)=>sum+Number(x.wheatMt||0)+Number(x.riceMt||0),0);
      }

      // Build Master Stock stack -> actual MT map for Delta report stacks.
      const sourceRows=(typeof rows!=='undefined'&&Array.isArray(rows))?rows:[];
      const qtyByStack=new Map();
      sourceRows.forEach(r=>{
        const st=String(typeof stack==='function'?stack(r):'').trim();
        if(!st)return;
        const q=Number(typeof qty==='function'?qty(r):0)||0;
        if(!qtyByStack.has(st))qtyByStack.set(st,q);
      });

      // Delta done = actual MT of unique stacks appearing in the Delta report.
      const del=typeof deltaAutoGroups==='function'?deltaAutoGroups():[];
      const deltaSeen=new Set(); let deltaDone=0;
      del.forEach(g=>{
        String(g.stackText||'').split(',').map(v=>v.trim()).filter(Boolean).forEach(st=>{
          if(deltaSeen.has(st))return;
          deltaSeen.add(st);
          deltaDone+=Number(qtyByStack.get(st)||0);
        });
      });

      // Malathion done = actual treatment MT shown by the Malathion register/report.
      const mal=typeof malathionEntries==='function'?malathionEntries():[];
      const malSeen=new Set(); let malDone=0;
      mal.forEach(x=>{
        const ss=typeof malEntryStacks==='function'?malEntryStacks(x):[];
        if(ss.length){
          ss.forEach(v=>{
            const st=String(v.stack||'').trim();
            if(!st||malSeen.has(st))return;
            malSeen.add(st);
            const q=Number(v.qty||0);
            malDone+=q || Number(qtyByStack.get(st)||0);
          });
        }else{
          String(x.stack||'').split(',').map(v=>v.trim()).filter(Boolean).forEach(st=>{
            if(malSeen.has(st))return;
            malSeen.add(st);
            malDone+=Number(qtyByStack.get(st)||0);
          });
        }
      });

      const deltaPct=total>0?Math.min(100,deltaDone/total*100):0;
      const malPct=total>0?Math.min(100,malDone/total*100):0;
      const deltaTarget=total*0.80, malTarget=total*0.20;
      const deltaDue=Math.max(0,deltaTarget-deltaDone), malDue=Math.max(0,malTarget-malDone);
      const consumption=mal.reduce((sum,x)=>sum+(Number(x.consumption)||0),0);
      return '<div class="mal-20-indicator '+((deltaDue>0||malDue>0)?'mal-20-blink':'')+'"><div class="mal-20-title">ALP / DELTA / MALATHION STOCK STATUS</div><div class="mal-20-grid"><div><small>TOTAL ALP STOCK (ALP REPORT)</small><b>'+Math.round(total)+' MT</b></div><div><small>DELTA DONE (DELTA REPORT)</small><b>'+deltaPct.toFixed(1)+'% · '+Math.round(deltaDone)+' MT</b></div><div><small>DELTA 80% REQUIRED</small><b>'+deltaTarget.toFixed(2)+' MT</b></div><div class="mal-20-baki"><small>DELTA REMAINING</small><b>'+deltaDue.toFixed(2)+' MT</b></div><div><small>MALATHION DONE (MALATHION REPORT)</small><b>'+malPct.toFixed(1)+'% · '+Math.round(malDone)+' MT</b></div><div><small>MALATHION 20% REQUIRED</small><b>'+malTarget.toFixed(2)+' MT</b></div><div class="mal-20-baki"><small>MALATHION REMAINING</small><b>'+malDue.toFixed(2)+' MT</b></div></div><div class="mal-20-all"><b>ACTUAL MALATHION CONSUMPTION:</b> '+consumption.toFixed(3)+' Ltr</div></div>';
    }catch(e){
      console.error('Malathion indicator error',e);
      return '<div class="mal-20-indicator"><div class="mal-20-title">ALP / DELTA / MALATHION STOCK STATUS</div><div class="note">Indicator data could not be calculated.</div></div>';
    }
  };
  // Reliable tap handler for ALP FEW/HEAVY stack buttons.
  if(!window.__alpFewHeavyTapBound){
    document.addEventListener('click',function(e){
      const b=e.target && e.target.closest ? e.target.closest('.stack-weight-toggle') : null;
      if(!b)return;
      e.preventDefault();
      e.stopPropagation();
      if(typeof window.toggleStackWeight==='function'){
        window.toggleStackWeight(b.getAttribute('data-weight-date')||'',b.getAttribute('data-weight-stack')||'',b);
      }
    },true);
    window.__alpFewHeavyTapBound=true;
  }
  const oldClose=window.closeModal;
  if(typeof oldClose==='function'){
    window.closeModal=function(){
      const m=document.getElementById('modal');
      if(m) m.classList.remove('mo-add-stack-modal-fix','mo-moisture-modal');
      return oldClose.apply(this,arguments);
    };
  }
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',function(){
      const m=document.getElementById('modal');
      if(!m || !m.classList.contains('mo-add-stack-modal-fix') || !m.classList.contains('show')) return;
      const box=m.querySelector('.modalbox');
      if(box) box.scrollTop=Math.max(0,box.scrollTop);
    });
  }
})();
