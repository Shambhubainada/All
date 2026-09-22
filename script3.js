
const CONFIG={SHEET_ID:"1igJ0rzEp3txMDdhjwjrMB5V9BkJcyjt74g1xWh3YSHo",SHEET_NAME:"Master Stock",GOOGLE_SHEET_URL:"https://docs.google.com/spreadsheets/d/1igJ0rzEp3txMDdhjwjrMB5V9BkJcyjt74g1xWh3YSHo/edit?usp=sharing",SHEDS:["9","14","18","20"],FUM_DAYS:30,MAL_DAYS:15};
let rows=[],shedFilter="all",commodityFilter="all",currentPage=localStorage.getItem("shambhuCurrentPage")||"dashboard",loadedAt=null;
const $=id=>document.getElementById(id);
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function val(r,...names){for(const n of names){if(Object.prototype.hasOwnProperty.call(r,n)&&String(r[n]??"").trim()!=="")return String(r[n]).trim()}return ""}
function num(x){const n=parseFloat(String(x??"").replace(/,/g,""));return Number.isFinite(n)?n:0}
function parseDate(x){if(x instanceof Date)return x;let s=String(x??"").trim();if(!s)return null;let m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1])}let d=new Date(s);return isNaN(d)?null:d}
function dateText(x){const d=parseDate(x);if(!d)return String(x??"").trim();return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."+String(d.getFullYear()).slice(-2)}
function dayDiff(x,base=new Date()){const d=parseDate(x);if(!d)return null;const a=new Date(base.getFullYear(),base.getMonth(),base.getDate()),b=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor((a-b)/86400000)}
function addDays(x,n){const d=parseDate(x);if(!d)return null;d.setDate(d.getDate()+n);return d}
function dateDiffFromToday(x){return dayDiff(x)}
function commodity(r){return val(r,"Commodity / Crop Year","Commodity/Crop Year","Commodity","Crop Year")}
function isRice(r){return /rice|frk|rra/i.test(commodity(r))}
function isWheat(r){return !isRice(r)&&/wheat/i.test(commodity(r))}
function shed(r){return val(r,"Shed No.","Shed No","Shed","Godown No.")}
function stack(r){return val(r,"Stack No.","Stack No")}
function qty(r){return num(val(r,"Qty (MT)","Qty","Quantity (MT)","Quantity"))}
function receipt(r){return val(r,"Receipt Date","RDate of Receipt","RDate")}
function lastFum(r){return val(r,"LAST FUMIGATION","Last Fumigation","Last Fumigation Date")||val(r,"Fumigation Date")}
function fumFlag(r){return /^(true|yes|y|1|due|required)$/i.test(val(r,"FumigationDue_>30D_Flag","Fumigation Due","FumigationDue")) || (lastFum(r)&&dateDiffFromToday(lastFum(r))>CONFIG.FUM_DAYS)}
function underFlag(r){return /^(true|yes|y|1|under\s*cover)$/i.test(val(r,"UnderCover_Flag","Under Cover","UnderCover"))}
function degFlag(r){return /^(true|yes|y|1|due|required)$/i.test(val(r,"DegassingDue_Flag","Degassing Due","DegassingDue")) || (!!val(r,"Fumigation Date")&&!!val(r,"Degassing Date")&&false) || (!!val(r,"Fumigation Date")&&dateDiffFromToday(val(r,"Fumigation Date"))>5&&!val(r,"Degassing Date"))}
function infestedFlag(r){const s=val(r,"Status","Infestation Status","Infestation");return /infest/i.test(s)||underFlag(r)}
function malDate(r){return val(r,"Last Malathion Spray","Last Malathion Spray Date","Malathion Spray Date","Malathion Date","Last Spray","Spray Date")}
function malDue(r){const d=malDate(r);return d?dateDiffFromToday(d)>=CONFIG.MAL_DAYS:true}
function filterRows(source=rows){return source.filter(r=>{const s=shed(r),c=isRice(r)?"rice":"wheat";return (shedFilter==="all"||s===shedFilter)&& (commodityFilter==="all"||c===commodityFilter)})}
async function load(){
  const keepMoistureStack=(currentPage==='moisture')?(localStorage.getItem('shambhuSelectedMoistureStack')||$('mStack')?.value||''):'';
  setStatus("Connecting to Google Sheet…");
  try{const u=`https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;const t=await fetch(u,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.text()});const m=t.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/s);if(!m)throw Error("Unreadable Google Sheet response");const j=JSON.parse(m[1]);const cols=j.table.cols.map(c=>(c.label||"").trim());rows=j.table.rows.map(rr=>{const o={};cols.forEach((c,i)=>o[c]=rr.c[i]?(rr.c[i].f??rr.c[i].v??""):"");return o}).filter(r=>stack(r));loadedAt=new Date();setStatus(`✓ Live data connected · ${rows.length} rows · Last refresh ${loadedAt.toLocaleTimeString("en-IN")}`);renderAll();if(currentPage==='moisture'&&keepMoistureStack){const sel=$('mStack');if(sel&&[...sel.options].some(o=>o.value===keepMoistureStack)){sel.value=keepMoistureStack;localStorage.setItem('shambhuSelectedMoistureStack',keepMoistureStack);loadMoistureStack()}}}catch(e){console.error(e);setStatus("⚠ Google Sheet could not be read. Set the Master Stock tab to Anyone with the link → Viewer, then refresh.",true);renderAll();if(currentPage==='moisture'&&keepMoistureStack){const sel=$('mStack');if(sel&&[...sel.options].some(o=>o.value===keepMoistureStack)){sel.value=keepMoistureStack;loadMoistureStack()}}}}
function setStatus(t,bad=false){$("status").textContent=t;$("status").style.borderLeftColor=bad?"#d92d3b":"#0a7a4b"}
function activeRows(){return filterRows(rows).filter(r=>qty(r)>0)}
function renderAll(){if(currentPage==="dashboard")renderDashboard();else renderPage(currentPage);updateWorkAlert();$("today").textContent="Today: "+dateText(new Date());$("updated").textContent="Last Update: "+(loadedAt?loadedAt.toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"}):"--")}
function renderDashboard(){const a=activeRows(), all=rows.filter(r=>qty(r)>0);$("kTotal").textContent=a.length;$("kWheat").textContent=a.filter(isWheat).length;$("kRice").textContent=a.filter(isRice).length;if($("ovTotal")){$("ovTotal").textContent=a.length;$("ovWheat").textContent=a.filter(isWheat).length;$("ovRice").textContent=a.filter(isRice).length;$("ovUnder").textContent=a.filter(underFlag).length;$("ovFum").textContent=a.filter(fumFlag).length;}$("kEmpty").textContent=filterRows(rows).filter(r=>qty(r)<=0).length;$("kUnder").textContent=a.filter(underFlag).length;$("kFum").textContent=a.filter(fumFlag).length;$("kDeg").textContent=a.filter(degFlag).length;$("kInf").textContent=a.filter(infestedFlag).length;$("kMal").textContent=a.filter(malDue).length;$("donutTotal").textContent=a.length;$("commodityCenter").textContent=a.length;$("sumActive").textContent=a.length;$("sumQty").textContent=a.reduce((s,r)=>s+qty(r),0).toFixed(2);const ds=a.map(r=>parseDate(receipt(r))).filter(Boolean).sort((x,y)=>x-y);$("sumOldest").textContent=ds.length?dateText(ds[0]):"—";const statusData=[['Normal',a.filter(r=>!infestedFlag(r)&&!underFlag(r)&&!fumFlag(r)&&!degFlag(r)).length,'#0a7a4b'],['Infested',a.filter(infestedFlag).length,'#d92d3b'],['Under Cover',a.filter(underFlag).length,'#e39a18'],['Fumigation Due',a.filter(fumFlag).length,'#c92f78'],['Degassing Due',a.filter(degFlag).length,'#7040c8']];$("statusLegend").innerHTML=statusData.map(x=>`<div><span class="dot" style="background:${x[2]}"></span>${x[0]} <b>${x[1]}</b></div>`).join("");const w=a.filter(isWheat).length,ri=a.filter(isRice).length;$("commodityLegend").innerHTML=`<div><span class="dot" style="background:#0a7a4b"></span>Wheat <b>${w}</b></div><div><span class="dot" style="background:#e39a18"></span>Rice / FRK RRA <b>${ri}</b></div>`;const max=Math.max(1,...CONFIG.SHEDS.map(s=>a.filter(r=>shed(r)===s).length));$("shedBars").innerHTML=CONFIG.SHEDS.map(s=>{const n=a.filter(r=>shed(r)===s).length,h=Math.max(6,120*n/max);return `<div class="bar" style="height:${h}px"><b>${n}</b><small>${s}</small></div>`}).join("");const today=filterRows(rows).filter(r=>qty(r)>0);$("todayFum").textContent=today.filter(r=>fumFlag(r)&&dayDiff(lastFum(r))===CONFIG.FUM_DAYS).length;$("todayDeg").textContent=today.filter(r=>degFlag(r)&&dayDiff(val(r,"Fumigation Date"))===5).length;$("todayMal").textContent=today.filter(r=>malDue(r)&&dayDiff(malDate(r))===CONFIG.MAL_DAYS).length;$("todayIns").textContent="—";$("upFum").textContent=today.filter(r=>{const d=dayDiff(lastFum(r));return d!==null&&d>CONFIG.FUM_DAYS&&d<=CONFIG.FUM_DAYS+7}).length;$("upDeg").textContent=today.filter(r=>{const d=dayDiff(val(r,"Fumigation Date"));return d!==null&&d>=0&&d<5}).length;$("upMal").textContent=today.filter(r=>{const d=dayDiff(malDate(r));return d!==null&&d>=8&&d<CONFIG.MAL_DAYS}).length;$("upIns").textContent="—"}
function table(title,head,body){return `<div class="panel"><div class="panelhead">${title}</div><div class="tablewrap"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${body||`<tr><td colspan="${head.length}" class="empty">No matching stack found.</td></tr>`}</tbody></table></div></div>`}
function rowsHtml(a,kind){return a.map((r,i)=>{if(kind==='priority')return `<tr><td><b>${i+1}</b></td><td>${i+1}</td><td>${esc(shed(r))}</td><td><b>${esc(stack(r))}</b></td><td>${dateText(receipt(r))}</td><td>${esc(commodity(r))}</td><td>${qty(r).toFixed(3)}</td><td>A</td><td>${esc(val(r,'Remarks','Remarks.1'))}</td><td><button class="pill" onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`;if(kind==='under')return `<tr><td>${i+1}</td><td>${esc(shed(r))}</td><td><b>${esc(stack(r))}</b></td><td>${dateText(receipt(r))}</td><td>${esc(commodity(r))}</td><td>${qty(r).toFixed(3)}</td><td><span class="badge soon">UNDER COVER</span></td><td>${esc(val(r,'Fumigation Date'))}</td><td><button class="pill" onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`;if(kind==='fum')return `<tr><td>${i+1}</td><td>${esc(shed(r))}</td><td><b>${esc(stack(r))}</b></td><td>${dateText(receipt(r))}</td><td>${esc(commodity(r))}</td><td>${qty(r).toFixed(3)}</td><td>${dateText(lastFum(r))}</td><td>${dayDiff(lastFum(r))??'—'}</td><td><span class="badge due">DUE &gt;30 DAYS</span></td><td><button class="pill" onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td><td><button class="pill" onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`;if(kind==='deg')return `<tr><td>${i+1}</td><td>${esc(shed(r))}</td><td><b>${esc(stack(r))}</b></td><td>${esc(commodity(r))}</td><td>${dateText(val(r,'Fumigation Date'))}</td><td>${dateText(val(r,'Degassing Date'))}</td><td>${dayDiff(val(r,'Fumigation Date'))??'—'}</td><td><span class="badge due">DEGASSING DUE</span></td><td><button class="pill" onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`;if(kind==='infested')return `<tr><td>${i+1}</td><td>${esc(shed(r))}</td><td><b>${esc(stack(r))}</b></td><td>${dateText(receipt(r))}</td><td>${esc(commodity(r))}</td><td>${qty(r).toFixed(3)}</td><td>${esc(val(r,'Status'))}</td><td><span class="badge due">ATTENTION</span></td><td><button class="pill" onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`;if(kind==='mal')return `<tr><td>${i+1}</td><td><b>${esc(stack(r))}</b></td><td>${esc(shed(r))}</td><td>${esc(commodity(r))}</td><td>${dateText(malDate(r))||'—'}</td><td>${dateText(addDays(malDate(r),15))||'—'}</td><td>${malDate(r)?dayDiff(malDate(r)):'—'}</td><td><span class="badge ${malDue(r)?'due':'ok'}">${malDue(r)?'DUE':'OK'}</span></td><td><button class="pill" onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`;return ''}).join('')}
function renderPage(page){const a=activeRows();let html='';if(page==='under')html=table('CURRENTLY UNDER COVER',['Sr No.','Shed','Stack','Receipt Date','Commodity','Qty (MT)','Status','Fumigation Date','Action'],rowsHtml(a.filter(underFlag),'under'));if(page==='fum')html=table('FUMIGATION DUE — MORE THAN 30 DAYS',['Sr No.','Shed','Stack','Receipt Date','Commodity','Qty (MT)','Last Fumigation','Days','Status','Action'],rowsHtml(a.filter(fumFlag),'fum'));if(page==='deg')html=table('DEGASSING DUE',['Sr No.','Shed','Stack','Commodity','Fumigation Date','Degassing Date','Days','Status','Action'],rowsHtml(a.filter(degFlag),'deg'));if(page==='infested')html=table('INFESTED / ATTENTION STACKS',['Sr No.','Shed','Stack','Receipt Date','Commodity','Qty (MT)','Status','Action'],rowsHtml(a.filter(infestedFlag),'infested'));if(page==='priority')html=priorityPage(a);if(page==='malathion')html=malPage(a);if(page==='search')html=searchPage();if(page==='reports')html=reportsPage();if(page==='moistureHistory')html=moistureHistoryPage();if(page==='moistureReports')html=moistureReportsPage();if(page==='calendar')html=calendarPage(a);if(page==='notepad')html=notepadPage(a);$("dynamicPage").innerHTML=html}
function priorityCropKey(r){const c=String(cropYearFromRow(r)||'').trim();const m=c.match(/(20\d{2})/);return m?Number(m[1]):9999;}
function priorityCompare(x,y){const cy=priorityCropKey(x)-priorityCropKey(y);if(cy)return cy;return (parseDate(receipt(x))||new Date(8640000000000000))-(parseDate(receipt(y))||new Date(8640000000000000));}
function priorityPage(a){const w=a.filter(isWheat).sort(priorityCompare);const r=a.filter(isRice).sort(priorityCompare);const selected=localStorage.getItem("shambhuPrioritySelection")||"wheat";return `<div class="panel"><div class="panelhead">PRIORITY VIEW (FIFO)</div><div class="group priority-tabs" style="margin-bottom:10px"><button class="pill ${selected==='wheat'?'active':''}" data-priority="wheat" onclick="priorityTab('wheat')">🌾 Wheat Priority</button><button class="pill ${selected==='rice'?'active':''}" data-priority="rice" onclick="priorityTab('rice')">🍚 Rice Priority</button><button class="pill ${selected==='all'?'active':''}" data-priority="all" onclick="priorityTab('all')">All Priority</button><button class="refresh" style="margin-left:auto" onclick="downloadPriority('all')">📥 Download All Priority – Excel</button></div><div id="priorityContent">${selected==='rice'?priorityTable(r,'Rice'):selected==='all'?(priorityTable(w,'Wheat')+priorityTable(r,'Rice')):priorityTable(w,'Wheat')}</div></div>`}
function priorityCropClass(r){const y=priorityCropKey(r);if(y===9999)return 'crop-yx';return 'crop-y'+(((y%6)+6)%6+1)}
function priorityTable(a,label){return `<div class="smallmuted priority-note" style="margin-bottom:7px">${label.toUpperCase()} PRIORITY – SHED NO. 9, 14, 18 & 20 FOR THE MONTH OF ${new Date().toLocaleString('en-IN',{month:'long',year:'numeric'}).toUpperCase()}</div><div class="priority-table-wrap"><table class="priority-table"><thead><tr><th>Sr No.</th><th>Shed</th><th>Stack</th><th>Receipt Date</th><th>Commodity</th><th>Crop Year</th><th>Qty (MT)</th><th>Cat</th><th>Remarks</th><th>Action</th></tr></thead><tbody>${a.map((r,i)=>{const cy=cropYearFromRow(r)||'—';return `<tr><td class="sr-cell"><b>${i+1}</b></td><td class="shed-cell"><b>${esc(shed(r))}</b></td><td class="stack-cell"><b>${esc(stack(r))}</b></td><td>${dateText(receipt(r))}</td><td>${esc(commodity(r))}</td><td><span class="crop-year ${priorityCropClass(r)}">${esc(cy)}</span></td><td>${qty(r).toFixed(3)}</td><td>A</td><td>${esc(val(r,'Remarks','Remarks.1'))}</td><td><button class="pill priority-action" onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`}).join('')}</tbody></table></div>`}
function priorityTab(which){localStorage.setItem("shambhuPrioritySelection",which);const a=activeRows();const w=a.filter(isWheat).sort(priorityCompare);const r=a.filter(isRice).sort(priorityCompare);let d=which==='wheat'?priorityTable(w,'Wheat'):which==='rice'?priorityTable(r,'Rice'):(priorityTable(w,'Wheat')+priorityTable(r,'Rice'));$("priorityContent").innerHTML=d;document.querySelectorAll("[data-priority]").forEach(b=>b.classList.toggle("active",b.dataset.priority===which));}
function malPage(a){const shedRows=CONFIG.SHEDS.map(s=>{const x=a.filter(r=>shed(r)===s),due=x.filter(malDue).length;return `<tr><td>${s}</td><td>${x.length}</td><td>${x.filter(r=>!malDue(r)).length}</td><td>${due}</td><td><button class="pill" onclick="malShed('${s}')">View</button></td></tr>`}).join('');return `<div class="panel"><div class="panelhead">MALATHION SPRAY — EVERY 15 DAYS</div><div class="malgrid"><div>${table('SHED WISE',['Shed No.','Total Stacks','Within 15 Days','Spray Due','Action'],shedRows)}</div><div><div class="mini-title">STACK WISE</div><div class="tablewrap"><table><thead><tr><th>Sr</th><th>Stack No.</th><th>Shed</th><th>Commodity</th><th>Last Spray</th><th>Next Spray Due</th><th>Days</th><th>Status</th><th>Action</th></tr></thead><tbody>${rowsHtml(a,'mal')}</tbody></table></div></div></div></div>`}
function malShed(s){const a=activeRows().filter(r=>shed(r)===s);$("modalTitle").textContent=`Malathion Spray — Shed ${s}`;$("modalBody").innerHTML=`<div class="smallmuted">Every 15 days · ${a.length} active stacks</div>${table('STACK WISE',['Sr','Stack','Commodity','Last Spray','Next Spray Due','Days','Status'],a.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(stack(r))}</td><td>${esc(commodity(r))}</td><td>${dateText(malDate(r))||'—'}</td><td>${dateText(addDays(malDate(r),15))||'—'}</td><td>${malDate(r)?dayDiff(malDate(r)):'—'}</td><td><span class="badge ${malDue(r)?'due':'ok'}">${malDue(r)?'DUE':'OK'}</span></td>`).join(''))}`;$('modal').classList.add('show')}
function searchPage(){return `<div class="panel"><div class="panelhead">STACK SEARCH</div><div class="searchrow"><input id="searchInput" placeholder="Enter Stack No. e.g. 20/15, shed, commodity…"><button class="refresh" onclick="runSearch()">Search</button></div><div id="searchResult" class="smallmuted">Type a stack number or keyword.</div></div>`}
function runSearch(){const q=($("searchInput").value||'').toLowerCase().trim();const a=activeRows().filter(r=>!q||[stack(r),shed(r),commodity(r),receipt(r),val(r,'Status')].join(' ').toLowerCase().includes(q));$("searchResult").innerHTML=table('SEARCH RESULTS',['Sr','Shed','Stack','Receipt Date','Commodity','Qty (MT)','Status','Last Fumigation'],a.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(shed(r))}</td><td><b>${esc(stack(r))}</b></td><td>${dateText(receipt(r))}</td><td>${esc(commodity(r))}</td><td>${qty(r).toFixed(3)}</td><td>${esc(val(r,'Status'))}</td><td>${dateText(lastFum(r))}</td></tr>`).join(''))}
function reportsPage(){return `<div class="panel"><div class="panelhead">REPORTS & DOWNLOAD</div><div class="report-list"><div class="reportbtn"><span>🌾 Wheat Priority</span><span><button class="pill" onclick="openPage('priority')">👁 View</button> <button class="pill" onclick="downloadPriority('wheat')">📥 Download</button></span></div><div class="reportbtn"><span>🍚 Rice Priority</span><span><button class="pill" onclick="openPage('priority')">👁 View</button> <button class="pill" onclick="downloadPriority('rice')">📥 Download</button></span></div><div class="reportbtn"><span>📋 All Priority</span><span><button class="pill" onclick="openPage('priority')">👁 View</button> <button class="pill" onclick="downloadPriority('all')">📥 Download</button></span></div><div class="reportbtn"><span>🧪 Treatment Report</span><span><button class="pill" onclick="viewReport('treatment')">👁 View</button> <button class="pill" onclick="downloadReport('treatment')">📥 Download</button></span></div><div class="reportbtn"><span>📦 Stock Report</span><span><button class="pill" onclick="viewReport('stock')">👁 View</button> <button class="pill" onclick="downloadReport('stock')">📥 Download</button></span></div><div class="reportbtn"><span>📑 Complete Report</span><span><button class="pill" onclick="viewReport('complete')">👁 View</button> <button class="pill" onclick="downloadReport('complete')">📥 Download</button></span></div></div><div class="note">Priority Excel includes the specified official header, Cat = A, FIFO order, instructions and Shambhu Dayal Meena / Technical Assistant -II / FCI FSD Sabarmati.</div></div>`+moistureReportsBlock();}
function treatmentItems(a){const items=[];a.forEach(r=>{if(fumFlag(r))items.push(['Fumigation Due',stack(r),lastFum(r)]);if(degFlag(r))items.push(['Degassing Due',stack(r),val(r,'Fumigation Date')]);if(malDue(r))items.push(['Malathion Spray Due',stack(r),malDate(r)]);});return items}
function calendarPage(a){const items=treatmentItems(a);return `<div class="panel"><div class="panelhead">TREATMENT CALENDAR</div><div class="smallmuted">Current due items based on the live Master Stock data.</div>${table('DUE / UPCOMING',['Type','Stack','Reference Date','Days'],items.map(x=>`<tr><td>${x[0]}</td><td><b>${esc(x[1])}</b></td><td>${dateText(x[2])}</td><td>${dayDiff(x[2])??'—'}</td></tr>`).join(''))}</div>`}
function notepadPage(a){const notes=JSON.parse(localStorage.getItem('shambhuWorkNotes')||'[]');const items=treatmentItems(a);return `<div class="panel notepad-shell"><div class="panelhead">📝 NOTE PAD</div><div class="smallmuted notepad-help">Date select karke poora kaam / remarks likhein. Saved work bade section me clearly dikhega; entry side me rahegi.</div></div><div class="notes-grid"><div class="panel pending-work-panel"><div class="panelhead">🔔 PENDING WORK — DEGASSING + NOTES</div><div id="noteList">${renderNoteListHtml(notes,items)}</div></div><div class="panel note-entry-panel"><div class="panelhead">➕ ADD WORK / NOTE</div><div class="notification-permission"><button class="pill" onclick="enableWorkNotifications()">🔔 Enable Notification + Sound</button><span id="notificationState" class="smallmuted"></span></div><div class="note-form"><label>DATE</label><input id="noteDate" type="date" value="${new Date().toISOString().slice(0,10)}"><label class="remarks-label">REMARKS — POORA KAAM LIKHE</label><textarea id="noteText" placeholder="Yahan poora kaam, stack number, treatment, inspection ya remarks detail me likhein..."></textarea><button class="refresh" style="margin:0" onclick="saveWorkNote()">💾 SAVE NOTE</button></div></div></div>`}
function renderNoteListHtml(notes,items){
  const out=[];
  items.filter(x=>x[0]==='Degassing Due').forEach(x=>out.push({date:x[2],title:'Degassing Due — Stack '+x[1],text:'Degassing due',auto:true}));
  notes.forEach(n=>out.push({...n,auto:false}));
  out.sort((a,b)=>(parseDate(a.date)||new Date(9999,0,1))-(parseDate(b.date)||new Date(9999,0,1)));
  if(!out.length)return '<div class="empty">No pending work.</div>';
  return out.map(n=>{
    const d=parseDate(n.date),today=new Date();today.setHours(0,0,0,0);
    const cls=d&&d<today?'overdue':d&&d.getTime()===today.getTime()?'today':'';
    const nid=String(n.id||'').replace(/'/g,"\\'"); const actions=n.auto?'':`<div style="display:flex;gap:6px"><button class="pill" onclick="editWorkNote('${nid}')">✏️ Edit</button><button class="pill" onclick="deleteWorkNote('${nid}')">🗑 Delete</button></div>`;
    return `<div class="note-item ${cls}"><div><b>${esc(n.title||'Work')}</b><div class="smallmuted">${dateText(n.date)} · ${esc(n.text||'')}</div></div>${actions}</div>`;
  }).join('')
}
function saveWorkNote(){const text=$('noteText')?.value.trim();if(!text){alert('Remarks me poora kaam likhein.');return}const notes=JSON.parse(localStorage.getItem('shambhuWorkNotes')||'[]');notes.push({id:String(Date.now()),date:$('noteDate').value,text});localStorage.setItem('shambhuWorkNotes',JSON.stringify(notes));const list=$('noteList');if(list)list.innerHTML=renderNoteListHtml(notes,treatmentItems(activeRows()));updateWorkAlert();const ta=$('noteText');if(ta)ta.focus();}
function editWorkNote(id){
  const notes=JSON.parse(localStorage.getItem('shambhuWorkNotes')||'[]');
  const n=notes.find(x=>String(x.id)===String(id)); if(!n)return;
  $('noteDate').value=n.date||new Date().toISOString().slice(0,10);
  $('noteText').value=n.text||'';
  window.scrollTo({top:0,behavior:'smooth'});
  const btn=document.querySelector('.note-form button[onclick="saveWorkNote()"]');
  if(btn){btn.textContent='💾 UPDATE NOTE';btn.onclick=()=>updateWorkNote(id)}
}
function updateWorkNote(id){
  const text=$('noteText')?.value.trim();if(!text){alert('Remarks me poora kaam likhein.');return}
  const notes=JSON.parse(localStorage.getItem('shambhuWorkNotes')||'[]');
  const n=notes.find(x=>String(x.id)===String(id));if(!n)return;
  n.date=$('noteDate').value;n.text=text;
  localStorage.setItem('shambhuWorkNotes',JSON.stringify(notes));const list=$('noteList');if(list)list.innerHTML=renderNoteListHtml(notes,treatmentItems(activeRows()));updateWorkAlert();const ta=$('noteText');if(ta)ta.focus();
}
function deleteWorkNote(id){
  const notes=JSON.parse(localStorage.getItem('shambhuWorkNotes')||'[]');
  const n=notes.find(x=>String(x.id)===String(id));if(!n)return;
  if(!confirm('Ye note delete karein?'))return;
  localStorage.setItem('shambhuWorkNotes',JSON.stringify(notes.filter(x=>String(x.id)!==String(id))));renderPage('notepad');
}
function completeWorkNote(id){deleteWorkNote(id)}
let shambhuAlertSignature="";function updateAlertBadge(count){const n=$('alertCount'),b=$('alertBell');if(n)n.textContent=String(count||0);if(b)b.classList.toggle('has-alert',(count||0)>0)}function unlockAlertAudio(){try{const C=window.AudioContext||window.webkitAudioContext;if(C){const c=new C();if(c.state==='suspended')c.resume();const o=c.createOscillator(),g=c.createGain();g.gain.value=0.0001;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.02);}}catch(e){}}function playWorkAlertSound(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();if(c.state==='suspended')c.resume();[0,0.22,0.44].forEach((t,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=[740,980,740][i];g.gain.setValueAtTime(0.0001,c.currentTime+t);g.gain.exponentialRampToValueAtTime(0.38,c.currentTime+t+0.025);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+t+0.18);o.connect(g);g.connect(c.destination);o.start(c.currentTime+t);o.stop(c.currentTime+t+0.2);});}catch(e){}}async function enableWorkNotifications(){unlockAlertAudio();if('Notification' in window){try{const p=await Notification.requestPermission();$('notificationState').textContent=p==='granted'?'Enabled':'Permission: '+p;}catch(e){}}else $('notificationState').textContent='Browser notifications not supported';}function sendWorkNotification(msg){if('Notification' in window&&Notification.permission==='granted'){try{new Notification('Shambhu Shed — Pending Work',{body:msg,icon:'./shambhu-shed-192.png'});}catch(e){}}playWorkAlertSound()}function updateWorkAlert(){const box=$('workAlert');if(!box)return;const a=activeRows(),notes=JSON.parse(localStorage.getItem('shambhuWorkNotes')||'[]'),today=new Date();today.setHours(0,0,0,0);const due=a.filter(degFlag),pendingNotes=notes.filter(n=>{const d=parseDate(n.date);return d&&d<=today});const total=pendingNotes.length+due.length;updateAlertBadge(total);const sig='D'+due.map(r=>stack(r)).join(',')+'N'+pendingNotes.map(n=>n.id).join(',');if(!due.length&&!pendingNotes.length){box.classList.remove('show');box.innerHTML='';shambhuAlertSignature='';return}box.innerHTML=`<div class="pending-card pending-work-unified"><h2>🔔 PENDING WORK <span class="count">${total}</span></h2><div class="pending-work-columns"><div><div><b>🧪 DEGASSING DUE</b></div><ul>${due.length?due.slice(0,8).map(r=>`<li>Stack ${esc(stack(r))} — ${dayDiff(val(r,'Fumigation Date'))||0} days</li>`).join(''):'<li>No Degassing Due</li>'}</ul><button class="openbtn" onclick="openPage('deg')">OPEN PENDING WORK</button></div><div><div><b>📝 PENDING NOTES</b></div><ul>${pendingNotes.length?pendingNotes.slice(0,6).map(n=>`<li>${esc(n.text||'Note')} <span class="smallmuted">(${dateText(n.date)})</span></li>`).join(''):'<li>No pending notes</li>'}</ul><button class="openbtn" onclick="openPage('notepad')">OPEN NOTES</button></div></div></div>`;box.classList.add('show');if(sig!==shambhuAlertSignature){shambhuAlertSignature=sig;sendWorkNotification((due.length?'Degassing Due: '+due.length+' · ':'')+(pendingNotes.length?'Notes: '+pendingNotes.length:''));}}
function openGoogleSheet(){const b=$('sheetBtn');if(b)b.click();else if(CONFIG&&CONFIG.GOOGLE_SHEET_URL)window.open(CONFIG.GOOGLE_SHEET_URL,'_blank');}
function openPage(page){
  document.body.classList.toggle("moisture-active",page==="moisture");
  document.body.classList.add("page-open");
  document.body.classList.toggle("dashboard-open",page==="dashboard");
  currentPage=page; localStorage.setItem("shambhuCurrentPage",page);
  document.querySelectorAll('.nav button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const globalFilters=document.querySelector('.filters'); if(globalFilters)globalFilters.style.display=/^moisture/.test(page)?'none':'';
  const back=$('backBtn'),home=$('homeBtn');
  if(back)back.style.display=page==='dashboard'?'none':'inline-block';
  if(home)home.style.display=page==='dashboard'?'none':'inline-block';
  if(/^moisture/.test(page)){const box=$('moistureSubnav'),arrow=$('moistureFolderArrow');if(box&&!box.classList.contains('open'))box.classList.add('open');if(arrow)arrow.textContent='▾'}
  $('dashboardPage').classList.toggle('hidden-section',page!=='dashboard');
  $('dynamicPage').classList.toggle('hidden-section',page==='dashboard');
  if(page!=='dashboard')renderPage(page);
  window.scrollTo({top:0,behavior:'smooth'});
}
function goBackPage(){openPage('dashboard')}

function showStack(st){const r=rows.find(x=>stack(x)===st);if(!r)return;$("modalTitle").textContent=`Stack ${st}`;$("modalBody").innerHTML=`<div class="panel" style="box-shadow:none;border:0;padding:0"><div class="legend"><div>Shed: <b>${esc(shed(r))}</b></div><div>Commodity: <b>${esc(commodity(r))}</b></div><div>Receipt Date: <b>${dateText(receipt(r))}</b></div><div>Qty: <b>${qty(r).toFixed(3)} MT</b></div><div>Fumigation Date: <b>${dateText(val(r,'Fumigation Date'))}</b></div><div>Last Fumigation: <b>${dateText(lastFum(r))}</b></div><div>Degassing Date: <b>${dateText(val(r,'Degassing Date'))}</b></div><div>Malathion Last Spray: <b>${dateText(malDate(r))||'—'}</b></div><div>Status: <b>${esc(val(r,'Status'))}</b></div><div>Remarks: <b>${esc(val(r,'Remarks','Remarks.1'))}</b></div></div></div>`;$('modal').classList.add('show')}
function closeModal(){
  const modal=$('modal');
  if(modal?.classList.contains('mo-moisture-modal') && window.history.state?.shambhuMoistureModal){
    window.history.back();
    return;
  }
  modal?.classList.remove('show','mo-moisture-modal');
}
window.addEventListener('popstate',function(){
  const modal=$('modal');
  if(modal?.classList.contains('mo-moisture-modal')) modal.classList.remove('show','mo-moisture-modal');
});
async function loadXLSX(){if(window.XLSX)return window.XLSX;return await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';s.onload=()=>resolve(window.XLSX);s.onerror=()=>reject(Error('Excel library could not load'));document.head.appendChild(s)})}
function priorityData(a){return a.slice().sort(priorityCompare).map((r,i)=>[i+1,i+1,shed(r),stack(r),dateText(receipt(r)),commodity(r),qty(r),"A",val(r,'Remarks','Remarks.1')])}
async function makeWorkbook(sheets,filename){try{const XLSX=await loadXLSX();const wb=XLSX.utils.book_new();sheets.forEach(s=>{const ws=XLSX.utils.aoa_to_sheet(s.data);ws['!cols']=(s.widths||[]).map(w=>({wch:w}));if(s.merges)ws['!merges']=s.merges;XLSX.utils.book_append_sheet(wb,ws,s.name.slice(0,31))});XLSX.writeFile(wb,filename)}catch(e){alert('Excel library load failed. Please check internet connection and try again.');console.error(e)}}
function prioritySheetData(a,label){const month=new Date().toLocaleString('en-IN',{month:'long',year:'numeric'});const data=[['SHAMBHU SHED – FSD SABARMATI'],[`${label.toUpperCase()} PRIORITY – SHED NO. 9, 14, 18 & 20 FOR THE MONTH OF ${month.toUpperCase()}`],[],['Report Date',dateText(new Date()),'Selected Shed','9, 14, 18, 20 (All)'],[],['Priority','Sr No.','Shed No.','Stack No.','Receipt Date','Commodity / Crop Year','Qty (MT)','Cat','Remarks'],...priorityData(a),[],['1. Stock balance of previous old crop year URS , URS Part stacks / Baby stacks must be issued first.'],['2. Stocks may be issued on FIFO basis as per standing instructions provided by Higher Offices.'],['3. This priority may be followed strictly .'],['4. The stacks may be issued strictly as per sequence provided to you in the priority list.'],[],['Shambhu Dayal Meena'],['Technical Assistant -II'],['FCI FSD Sabarmati']];return {name:label+' Priority',data,merges:[{s:{r:0,c:0},e:{r:0,c:8}},{s:{r:1,c:0},e:{r:1,c:8}}],widths:[10,10,10,14,15,26,12,8,30]}}
async function downloadPriority(which){const a=activeRows();const w=a.filter(isWheat).sort(priorityCompare);const r=a.filter(isRice).sort(priorityCompare);let sheets=[];if(which==='wheat')sheets=[prioritySheetData(w,'Wheat')];else if(which==='rice')sheets=[prioritySheetData(r,'Rice')];else sheets=[prioritySheetData(w,'Wheat'),prioritySheetData(r,'Rice')];sheets.push({name:'Summary',data:[['SHAMBHU SHED – FSD SABARMATI QC TREATMENT CONTROL'],['PRIORITY DOWNLOAD SUMMARY'],[],['Wheat Priority Stacks',w.length],['Rice Priority Stacks',r.length],['Total Priority Stacks',w.length+r.length],['Generated',new Date().toLocaleString('en-IN')]],widths:[30,18]});await makeWorkbook(sheets,`SHAMBHU_SHED_Priority_${which}_${new Date().toISOString().slice(0,10)}.xlsx`)}

function viewReport(type){const a=activeRows();let title='',html='';if(type==='treatment'){title='Treatment Report';html=table('FUMIGATION DUE',['Sr','Shed','Stack','Receipt','Commodity','Qty','Last Fumigation','Status','Action'],rowsHtml(a.filter(fumFlag),'fum'))+table('UNDER COVER',['Sr','Shed','Stack','Receipt','Commodity','Qty','Status','Fumigation Date','Action'],rowsHtml(a.filter(underFlag),'under'))+table('DEGASSING DUE',['Sr','Shed','Stack','Commodity','Fumigation Date','Degassing Date','Days','Status','Action'],rowsHtml(a.filter(degFlag),'deg'))+table('INFESTED / ATTENTION',['Sr','Shed','Stack','Receipt','Commodity','Qty','Status','Action'],rowsHtml(a.filter(infestedFlag),'infested'));}else if(type==='stock'){title='Stock Report';html=table('ALL ACTIVE STOCK',['Sr','Shed','Stack','Receipt','Commodity','Qty','Status','Action'],a.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(shed(r))}</td><td><b>${esc(stack(r))}</b></td><td>${dateText(receipt(r))}</td><td>${esc(commodity(r))}</td><td>${qty(r).toFixed(3)}</td><td>${esc(val(r,'Status'))}</td><td><button class='pill' onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`).join(''));}else{title='Complete Report';html=table('COMPLETE REPORT',['Sr','Shed','Stack','Receipt','Commodity','Bags','Qty','Status','Fumigation','Degassing','Under Cover','Fum Due','Deg Due','Action'],a.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(shed(r))}</td><td><b>${esc(stack(r))}</b></td><td>${dateText(receipt(r))}</td><td>${esc(commodity(r))}</td><td>${esc(val(r,'Bags'))}</td><td>${qty(r).toFixed(3)}</td><td>${esc(val(r,'Status'))}</td><td>${dateText(val(r,'Fumigation Date'))}</td><td>${dateText(val(r,'Degassing Date'))}</td><td>${underFlag(r)?'YES':''}</td><td>${fumFlag(r)?'DUE':''}</td><td>${degFlag(r)?'DUE':''}</td><td><button class='pill' onclick='showStack(${JSON.stringify(stack(r))})'>View</button></td></tr>`).join(''));}$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modal').classList.add('show');}
async function downloadReport(type){
  const a=activeRows();
  if(type==='treatment'){
    const sections=[
      ['Fumigation Due',a.filter(fumFlag)],
      ['Under Cover',a.filter(underFlag)],
      ['Degassing Due',a.filter(degFlag)],
      ['Infested',a.filter(infestedFlag)]
    ];
    const sheets=sections.map(([n,x])=>({
      name:n,
      data:[
        ['SHAMBHU SHED – FSD SABARMATI QC TREATMENT CONTROL'],[n],[],
        ['Sr No.','Shed','Stack','Receipt Date','Commodity','Qty (MT)','Last Fumigation','Fumigation Date','Degassing Date','Status'],
        ...x.map((r,i)=>[i+1,shed(r),stack(r),dateText(receipt(r)),commodity(r),qty(r),dateText(lastFum(r)),dateText(val(r,'Fumigation Date')),dateText(val(r,'Degassing Date')),val(r,'Status')])
      ],
      widths:[9,10,15,15,28,12,15,15,15,20]
    }));
    await makeWorkbook(sheets,`SHAMBHU_SHED_Treatment_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  }else if(type==='stock'){
    const groups=[['All Stacks',a],['Wheat',a.filter(isWheat)],['Rice',a.filter(isRice)],['Empty',filterRows(rows).filter(r=>qty(r)<=0)]];
    const sheets=groups.map(([n,x])=>({
      name:n,
      data:[
        ['SHAMBHU SHED – FSD SABARMATI QC TREATMENT CONTROL'],[n],[],
        ['Sr No.','Shed','Stack','Receipt Date','Commodity / Crop Year','Bags','Qty (MT)','Status','Last Fumigation'],
        ...x.map((r,i)=>[i+1,shed(r),stack(r),dateText(receipt(r)),commodity(r),val(r,'Bags'),qty(r),val(r,'Status'),dateText(lastFum(r))])
      ],
      widths:[9,10,15,15,28,12,12,20,15]
    }));
    await makeWorkbook(sheets,`SHAMBHU_SHED_Stock_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  }else{
    const data=[
      ['SHAMBHU SHED – FSD SABARMATI QC TREATMENT CONTROL'],['COMPLETE REPORT'],[],
      ['Sr No.','Shed','Stack','Receipt Date','Commodity / Crop Year','Bags','Qty (MT)','Status','Fumigation Date','Last Fumigation','Degassing Date','Under Cover','Fumigation Due','Degassing Due','Last Malathion Spray','Next Spray Due','Malathion Status'],
      ...a.map((r,i)=>[i+1,shed(r),stack(r),dateText(receipt(r)),commodity(r),val(r,'Bags'),qty(r),val(r,'Status'),dateText(val(r,'Fumigation Date')),dateText(lastFum(r)),dateText(val(r,'Degassing Date')),underFlag(r)?'YES':'',fumFlag(r)?'DUE':'',degFlag(r)?'DUE':'',dateText(malDate(r)),dateText(addDays(malDate(r),15)),malDue(r)?'DUE':'OK'])
    ];
    await makeWorkbook([{name:'Complete Report',data,widths:[8,8,14,14,28,10,12,18,14,14,14,12,14,14,16,16,14]}],`SHAMBHU_SHED_Complete_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
}
$('nav').addEventListener('click',e=>{const b=e.target.closest('button[data-page]');if(b)openPage(b.dataset.page)});
function toggleMoistureFolder(){const box=$('moistureSubnav'),arrow=$('moistureFolderArrow');if(!box)return;const open=box.classList.toggle('open');if(arrow)arrow.textContent=open?'▾':'▸';}
document.querySelectorAll('[data-shed]').forEach(b=>b.onclick=()=>{shedFilter=b.dataset.shed;document.querySelectorAll('[data-shed]').forEach(x=>x.classList.toggle('active',x===b));renderAll()});document.querySelectorAll('[data-commodity]').forEach(b=>b.onclick=()=>{commodityFilter=b.dataset.commodity;document.querySelectorAll('[data-commodity]').forEach(x=>x.classList.toggle('active',x===b));renderAll()});$('refresh').onclick=load;$('sheetBtn').onclick=()=>window.open(CONFIG.GOOGLE_SHEET_URL,'_blank','noopener');if(document.querySelector('.filters'))document.querySelector('.filters').style.display=/^moisture/.test(currentPage)?'none':'';openPage(currentPage);$('sheetQuick').onclick=()=>window.open(CONFIG.GOOGLE_SHEET_URL,'_blank','noopener');$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});setInterval(()=>{const d=new Date();$('today').textContent='Today: '+dateText(d);},1000);load();

// ===== MOISTURE UPDATE: truck-wise, master-linked =====
function cropYearFromRow(r){
  const direct=val(r,'Crop Year','CropYear'); if(direct)return direct;
  const c=commodity(r); const m=c.match(/\b20\d{2}(?:[-\/]20\d{2})?\b/); return m?m[0]:'';
}
function moistureHistoryPage(){
  return `<div class="panel"><div class="panelhead">📋 COMPLETED MOISTURE HISTORY</div><div class="mh-filter"><select id="mhCommodity" onchange="renderMoistureHistory()"><option value="all">All Commodity</option><option value="Wheat">Wheat</option><option value="Rice">Rice / FRK RRA RRC</option></select></div><div class="history-downloads"><button class="w" onclick="downloadMoistureHistoryExcel('wheat')">📥 Open / Download Wheat Excel</button><button class="r" onclick="downloadMoistureHistoryExcel('rice')">📥 Open / Download FRK RRA / RRC Excel</button></div><div id="moistureHistory" class="mo-history-list">No completed stacks yet.</div></div>`;
}
function moistureReportsBlock(){
  return `<div class="panel" style="margin-top:12px"><div class="panelhead">💧 MOISTURE REPORTS — WHEAT & RICE</div>${moistureReportsBlockInner()}</div>`;
}
function moistureReportsBlockInner(){
  const h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]');
  const w=h.filter(x=>/wheat/i.test(x.commodity||''));
  const r=h.filter(x=>/rice|frk|rra|rrc/i.test(x.commodity||''));
  return `<div class="mo-report-grid"><div class="mo-report-card"><h3>🌾 Wheat Moisture Report</h3><div class="count">Completed Stacks: <b>${w.length}</b></div><div class="mo-report-actions"><button class="view" onclick="viewMoistureReport('wheat')">👁 View Wheat Report</button><button class="download" onclick="downloadMoistureReport('wheat')">📥 Download Wheat Excel</button></div></div><div class="mo-report-card"><h3>🍚 Rice / FRK / RRA / RRC Moisture Report</h3><div class="count">Completed Stacks: <b>${r.length}</b></div><div class="mo-report-actions"><button class="view" onclick="viewMoistureReport('rice')">👁 View Rice Report</button><button class="download" onclick="downloadMoistureReport('rice')">📥 Download Rice Excel</button></div></div></div><div class="mo-report-clear"><button onclick="clearMoistureReportWithPin()">🔐 Clear Moisture Report (PIN)</button></div>`;
}
function moistureReportsPage(){return `<div class="panel"><div class="panelhead">📊 MOISTURE REPORTS</div>${moistureReportsBlockInner()}<div class="note">Wheat aur Rice/FRK/RRA/RRC reports alag-alag View aur Excel Download ke liye hain. Report completed moisture history se banegi.</div></div>`;}
function moistureReportRows(which){
  const h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]');
  return (which==='wheat'?h.filter(x=>/wheat/i.test(x.commodity||'')):h.filter(x=>/rice|frk|rra|rrc/i.test(x.commodity||''))).map((x,i)=>{const es=x.activities||x.truckEntries||x.entries||[];const rmc=num(x.rmc),imc=num(x.imc!=null?x.imc:x.dmc),diff=imc-rmc;return `<tr><td>${i+1}</td><td><b>${esc(x.stack)}</b></td><td>${esc(x.receipt||'—')}</td><td>${esc(x.commodity||'—')}</td><td>${esc(x.cropYear||'—')}</td><td>${num(x.storageDays||0)}</td><td>${rmc.toFixed(2)}</td><td>${imc.toFixed(2)}</td><td class="${diff>=0?'diff-green':'diff-red'}">${diff>=0?'+':''}${diff.toFixed(2)}</td><td>${esc(x.completedAt||'—')}</td><td>${es.reduce((s,e)=>s+num(e.bags),0).toLocaleString()}</td><td><button class="view-btn" onclick="viewMoistureHistory(${x.id||0})">Details</button></td></tr>`}).join('');
}
function viewMoistureReport(which){
  const title=which==='wheat'?'Wheat Moisture Report':'Rice / FRK / RRA / RRC Moisture Report';
  const body=moistureReportRows(which);
  $('modalTitle').textContent='📊 '+title;
  $('modalBody').innerHTML=`<div class="tablewrap"><table><thead><tr><th>Sr.</th><th>Stack</th><th>Receipt Date</th><th>Commodity</th><th>Crop Year</th><th>Storage Days</th><th>RMC</th><th>IMC</th><th>Diff (RMC-IMC)</th><th>Completed</th><th>Bags</th><th>Details</th></tr></thead><tbody>${body||`<tr><td colspan="12" class="empty">No completed ${which==='wheat'?'Wheat':'Rice / FRK / RRA / RRC'} moisture report available.</td></tr>`}</tbody></table></div>`;
  $('modal').classList.add('show');
}
async function downloadMoistureReport(which){
  const h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]');
  const match=which==='wheat'?h.filter(x=>/wheat/i.test(x.commodity||'')):h.filter(x=>/rice|frk|rra|rrc/i.test(x.commodity||''));
  if(!match.length){alert('Is category ki completed moisture report available nahi hai.');return;}
  const data=[['SHAMBHU SHED — MOISTURE REPORT'],[which==='wheat'?'WHEAT MOISTURE REPORT':'RICE / FRK / RRA / RRC MOISTURE REPORT'],[],['Sr No.','Stack Number','Receipt Date','Commodity','Crop Year','Storage Period (Days)','RMC','IMC / DMC','Difference (IMC-RMC)','Completed On','Bags','Moisture %','Updated On']];
  let sr=1;match.forEach(x=>{const es=x.activities||x.truckEntries||x.entries||[];es.forEach(e=>data.push([sr++,x.stack,x.receipt,x.commodity,x.cropYear||'',x.storageDays||0,num(x.rmc).toFixed(2),num(x.imc!=null?x.imc:x.dmc).toFixed(2),(num(x.imc!=null?x.imc:x.dmc)-num(x.rmc)).toFixed(2),x.completedAt,num(e.bags),e.moisture,e.date||e.updatedAt||'']));});
  await makeWorkbook([{name:which==='wheat'?'Wheat Moisture':'Rice Moisture',data,widths:[8,16,15,24,14,20,10,12,18,22,10,12,22]}],`SHAMBHU_SHED_${which==='wheat'?'Wheat':'Rice'}_Moisture_Report.xlsx`);
}

function moisturePage(){
  const opts=rows.filter(r=>stack(r)&&qty(r)>0).sort((a,b)=>String(stack(a)).localeCompare(String(stack(b)),undefined,{numeric:true})).map(r=>`<option value="${esc(stack(r))}">${esc(stack(r))}</option>`).join('');
  return `<div class="panel moisture-focused-page">
    <div class="panelhead">💧 MOISTURE UPDATE</div>

    <div class="mo-focus-section">
      <div class="mo-select-row"><button class="mo-add-stack-btn" onclick="openAddMoistureStackModal()">➕ ADD NEW STACK</button></div>
      <div class="mo-stack-meta" id="moStackMeta">Open an Under Issue Stack to view Receipt Date, Crop Year, Commodity & RMC</div>
      <select id="mStack" class="mo-hidden-stack-select" aria-label="Selected moisture stack">
        <option value="">Select Stack</option>
        ${opts}
      </select>
    </div>

    <div class="mo-focus-section mo-stack-details">
      <div class="mo-detail-card"><span>RECEIPT DATE</span><b id="mReceiptView">—</b></div>
      <div class="mo-detail-card"><span>CROP YEAR</span><b id="mCropView">—</b></div>
      <div class="mo-detail-card"><span>RMC — AUTO</span><b id="mRmcAutoView">—</b></div>
      <div class="mo-detail-card manual-rmc-card"><span>MANUAL RMC</span><div class="manual-rmc-row"><input id="mRmcManual" type="number" min="0" step="0.01" placeholder="Enter RMC"><button onclick="saveManualRmc()">SAVE</button></div></div>
      <div class="mo-detail-card current-rmc-card"><span>CURRENT RMC</span><b id="mRmc">0.00 %</b><small id="mRmcMode">Auto from Master Sheet</small></div>
    </div>

    <div class="mo-focus-section moisture-update-focus">
      <div class="mo-focus-title">MOISTURE UPDATE</div>
      <div class="mo-entry-grid">
        <div style="grid-column:1/-1"><label>Bags + Moisture Entry</label><input id="mUpdateBags" type="text" readonly inputmode="none" placeholder="Tap here → Bags + Moisture %" onclick="openMoistureSaveModal()" style="cursor:pointer;background:#fffdf0;font-weight:800"></div>
      </div>
      <div class="mo-entry-note">Remaining bags auto show honge. Moisture update ke liye quantity par tap karein, Bags + Moisture % enter karke SAVE karein.</div>
      <div id="mActivity" class="mo-pending-note" style="display:none"></div>
    </div>

    <div class="mo-focus-section under-issue-focus">
      <div class="mo-focus-title">UNDER ISSUE STACK</div>
      <div id="moStatusGrid" class="mo-status-grid"></div>
    </div>

    <div class="mo-completebar" id="moCompleteBar" style="display:none">
      <div><b id="mCompleteStatusVisible">Select a stack</b><div class="smallmuted">Complete option: Remaining ≤ 100 bags + moisture entries complete</div></div>
      <button id="mCompleteBtnVisible" onclick="completeMoistureStack()" disabled>✅ COMPLETE & MOVE TO HISTORY</button>
    </div>

    <div class="mo-focus-section saved-moisture-focus">
      <div class="mo-focus-title">SAVED MOISTURE ENTRY</div>
      <div class="mo-table-wrap"><table class="mo-final-table"><thead><tr><th>Sr. No.</th><th>Bags</th><th>Moisture (%)</th><th>Slip</th><th>Action</th></tr></thead><tbody id="moTruckRows"></tbody></table></div>
      <div class="mo-saved-rmc-strip"><div><span>RMC</span><b id="moSavedRmc">0.00 %</b></div><div><span>IMC</span><b id="moSavedImc">0.00 %</b></div><div><span>DIFFERENCE</span><b id="moSavedDiff">0.00 %</b></div></div>
    </div>

    <div class="mo-focus-hidden" aria-hidden="true">
      <input id="mReceipt"><input id="mCrop"><input id="mStackBags"><div id="mStackBar"></div>
      <div id="mRmcLegacy"></div><div id="mRmcModeLegacy"></div><div id="mImc">0.00</div><div id="mDiff">0.00</div><div id="mDiffCard"></div><div id="mDiffText"></div>
      <input id="mRmcAuto"><div id="mCompleteStatus"></div><button id="mCompleteBtn" disabled></button>
    </div>
  </div>`;
}

function openAddMoistureStackModal(){
  const opts=rows.filter(r=>stack(r)&&qty(r)>0).sort((a,b)=>String(stack(a)).localeCompare(String(stack(b)),undefined,{numeric:true})).map(r=>`<option value="${esc(stack(r))}">${esc(stack(r))} · ${esc(commodity(r)||'')}</option>`).join('');
  $('modalTitle').textContent='➕ ADD NEW MOISTURE STACK';
  $('modalBody').innerHTML=`<div class="mo-add-stack-box">
    <label>Select Stack</label>
    <select id="newMoStack" onchange="previewNewMoistureStack()"><option value="">Select Stack No.</option>${opts}</select>
    <div id="newMoStackPreview" class="mo-new-preview">Select a stack. Receipt Date, Crop Year, Commodity and Auto RMC will appear here.</div>
    <div class="mo-add-rmc-row"><div><label>RMC — AUTO</label><b id="newMoRmcAuto">—</b></div><div><label>RMC — MANUAL (optional)</label><input id="newMoRmcManual" type="number" min="0" step="0.01" placeholder="Manual RMC"></div></div>
    <div class="mo-add-actions"><button class="pill" onclick="closeModal()">CANCEL</button><button class="mo-save" onclick="addSelectedMoistureStack()">➕ ADD STACK</button></div>
  </div>`;
  $('modal').classList.add('show');
}
function previewNewMoistureStack(){
  const st=$('newMoStack')?.value,r=rows.find(x=>stack(x)===st);
  const box=$('newMoStackPreview'),auto=$('newMoRmcAuto');
  if(!r){if(box)box.textContent='Select a stack. Receipt Date, Crop Year, Commodity and Auto RMC will appear here.';if(auto)auto.textContent='—';return}
  if(box)box.innerHTML=`<b>Stack:</b> ${esc(st)} &nbsp; <b>Receipt Date:</b> ${esc(dateText(receipt(r))||'—')} &nbsp; <b>Crop Year:</b> ${esc(cropYearFromRow(r)||'—')} &nbsp; <b>Commodity:</b> ${esc(commodity(r)||'—')}`;
  if(auto)auto.textContent=stackMasterRmc(r)?stackMasterRmc(r).toFixed(2)+' %':'—';
}
function addSelectedMoistureStack(){
  const st=$('newMoStack')?.value;if(!st){alert('Pehle Stack select karein.');return}
  const r=rows.find(x=>String(stack(x))===String(st));if(!r){alert('Selected stack Master Sheet me nahi mila.');return}
  const all=moistureStore(),rec=stackRecord(st);
  rec.addedToMoisture=true;
  const manual=String($('newMoRmcManual')?.value??'').trim();if(manual!=='')rec.manualRmc=num(manual);
  all[st]=rec;saveMoistureStore(all);
  localStorage.setItem('shambhuSelectedMoistureStack',st);
  closeModal();renderMoistureStackStatus();const sel=$('mStack');if(sel)sel.value=st;loadMoistureStack();
}
function deleteMoistureStackWithPin(st){
  const rec=moistureStore()[st];if(!rec)return;
  const pin=prompt('Stack delete karne ke liye current PIN enter karein:');if(pin===null)return;
  if(pin!==getSitePin()){alert('Wrong PIN. Stack delete nahi hua.');return}
  if(!confirm('Stack '+st+' ko Moisture Under Issue se delete karein? Is stack ki saved moisture entries bhi delete ho jayengi.'))return;
  const all=moistureStore();delete all[st];saveMoistureStore(all);
  if(currentMoistureStack()===st){localStorage.removeItem('shambhuSelectedMoistureStack');clearMoisture(false)}
  renderMoistureStackStatus();
}
function renderMoistureStackStatus(){
  const box=$('moStatusGrid'); if(!box)return;
  const active=rows.filter(r=>stack(r)&&qty(r)>0);
  const store=moistureStore();
  const pending=[];
  active.forEach(r=>{const st=stack(r),rec=store[st];const entries=rec?.activities||rec?.truckEntries||rec?.entries||[];const hasEntry=entries.length>=1 && entries.some(e=>num(e.bags)>0);if(rec?.addedToMoisture||hasEntry)pending.push(r);});
  const item=(r,cls,label)=>{const rice=isRice(r);const st=stack(r);const safe=String(st).replaceAll("\\","\\\\").replaceAll("'","\\'");return `<div class="mo-stack-item ${cls} ${rice?'rice-stack':'wheat-stack'}" role="button" tabindex="0" onclick="selectMoistureStack('${safe}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectMoistureStack('${safe}')}\"><span><b>${esc(st)}</b> · Shed ${esc(shed(r))} · <strong>${esc(commodity(r))}</strong></span><span class="mo-stack-actions"><button type="button" class="mo-delete-btn" onclick="event.stopPropagation();deleteMoistureStackWithPin('${safe}')">🗑 DELETE</button></span></div>`};
  box.innerHTML=`<div class="mo-status-card mo-pending"><div class="mo-status-head"><span>🟠 UNDER ISSUE STACK</span><span class="mo-status-count">${pending.length}</span></div><div class="smallmuted">Moisture issue wale stacks — Wheat aur Rice alag colour me</div><div class="mo-stack-list">${pending.length?pending.map(r=>item(r,'mo-pending','Pending')).join(''):'<div class="empty">No pending stack.</div>'}</div></div>`;
}
function selectMoistureStack(st){const key=String(st||'').trim();if(!key)return;const r=rows.find(x=>String(stack(x))===key);if(!r){alert('Selected stack Master Sheet me nahi mila.');return}localStorage.setItem('shambhuSelectedMoistureStack',key);const sel=$('mStack');if(sel)sel.value=key;loadMoistureStack();renderMoistureStackStatus();requestAnimationFrame(()=>{const target=document.querySelector('.saved-moisture-focus');if(target)target.scrollIntoView({behavior:'smooth',block:'start'});});}
function openUnderIssueStack(st){
  const r=rows.find(x=>stack(x)===st);
  if(!r){alert('Selected stack Master Sheet me nahi mila.');return}

  // FINAL: OPEN is a normal-page action — no popup.
  // Select this stack, keep its saved entries visible in the page table,
  // and move the user directly to the saved-entry/update area.
  localStorage.setItem('shambhuSelectedMoistureStack',st);
  const sel=$('mStack');
  if(sel) sel.value=st;
  loadMoistureStack();
  renderMoistureStackStatus();
  closeModal();
  requestAnimationFrame(()=>{
    const target=document.querySelector('.saved-moisture-focus');
    if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
  });
}
function moistureStore(){return JSON.parse(localStorage.getItem('shambhuMoistureActive')||'{}')}
function saveMoistureStore(o){localStorage.setItem('shambhuMoistureActive',JSON.stringify(o))}
function stackMasterRmc(r){return num(val(r,'RMC %','RMC%','RMC','Rmc'))}
function currentMoistureStack(){return $('mStack')?.value||''}
function stackRecord(st){const all=moistureStore();let rec=all[st];if(!rec)rec={stack:st,truckEntries:[],activities:[],manualRmc:null,addedToMoisture:false};if(!Array.isArray(rec.activities))rec.activities=[];if(!rec.activities.length && Array.isArray(rec.truckEntries) && rec.truckEntries.length){rec.activities=rec.truckEntries.map(e=>({bags:num(e.bags),moisture:e.moisture??'',date:e.updatedAt||e.entryAt||dateTimeNow(),printSlip:e.printSlip??true}));rec.truckEntries=[];all[st]=rec;saveMoistureStore(all);}return rec}
function stackIssuedTotal(rec){return (rec.activities||[]).reduce((s,e)=>s+num(e.bags),0)}
function stackUpdatedTotal(rec){return (rec.activities||[]).reduce((s,e)=>s+(e.moisture!==''&&num(e.bags)>0?num(e.bags):0),0)}
function stackWtTotal(rec){return (rec.activities||[]).reduce((s,e)=>s+(e.moisture!==''&&num(e.bags)>0?num(e.bags)*num(e.moisture):0),0)}
function loadMoistureStack(){
  const st=currentMoistureStack(); if(!st){clearMoisture(false);return}
  const r=rows.find(x=>String(stack(x))===String(st)); if(!r)return;
  $('mReceipt').value=dateText(receipt(r));$('mCrop').value=cropYearFromRow(r);$('mStackBags').value=num(val(r,'Bags','Bags (Nos.)','No. of Bags')).toLocaleString();
  const all=moistureStore(),old=all[st]||{},rec={stack:st,truckEntries:old.truckEntries||old.entries||[],activities:old.activities||[],manualRmc:old.manualRmc??null,addedToMoisture:old.addedToMoisture??false}; all[st]=rec;saveMoistureStore(all);
  const autoRmc=stackMasterRmc(r); $('mRmcAuto').value=autoRmc?autoRmc.toFixed(2):''; $('mRmcManual').value=rec.manualRmc!=null?rec.manualRmc:'';
  if($('mReceiptView'))$('mReceiptView').textContent=dateText(receipt(r))||'—';
  if($('mCropView'))$('mCropView').textContent=cropYearFromRow(r)||'—';
  if($('mRmcAutoView'))$('mRmcAutoView').textContent=autoRmc?autoRmc.toFixed(2)+' %':'—';
  if($('moStackMeta'))$('moStackMeta').textContent='Stack '+st+' · '+(commodity(r)||'—')+' · '+num(qty(r)).toFixed(3)+' MT';
  renderMoistureTruckRows(); renderMoistureActivity(); calcMoisture(); updateMoistureHeader(); renderMoistureStackStatus();
}
function renderMoistureTruckRows(){const st=currentMoistureStack(),box=$('moTruckRows');if(!box)return;const rec=stackRecord(st),entries=rec.activities||[];const rowsHtml=entries.map((e,i)=>`<tr><td>${i+1}</td><td>${num(e.bags).toLocaleString()}</td><td>${num(e.moisture).toFixed(2)} %</td><td><button class="print-toggle ${e.printSlip!==false?'yes':'no'}" onclick="editMoistureEntry(${i},'printSlip',${e.printSlip===false?'true':'false'})">${e.printSlip!==false?'✓ YES':'NO'}</button></td><td><button class="pill" onclick="editMoistureActivity(${i})">✏️ Edit</button> <button class="pill" onclick="deleteMoistureTruck(${i})">🗑 Delete</button></td></tr>`).join('');box.innerHTML=rowsHtml||`<tr><td colspan="5" class="empty">No moisture entry yet. Enter bags and moisture below.</td></tr>`}
function autoSaveMoisture(){const st=currentMoistureStack();if(!st)return;const all=moistureStore();all[st]=stackRecord(st);saveMoistureStore(all)}
function editMoistureEntry(i,key,v){const st=currentMoistureStack(),rec=stackRecord(st);if(!rec.activities[i])return; if(key==='bags'){const total=num($('mStackBags').value);const others=rec.activities.reduce((sum,e,j)=>sum+(j===i?0:num(e.bags)),0);const n=num(v);if(n<0||n+others>total){alert('Total stack bags se zyada issue nahi kar sakte.');renderMoistureTruckRows();return}rec.activities[i].bags=n}else if(key==='moisture'){rec.activities[i].moisture=v;rec.activities[i].date=dateTimeNow()}else if(key==='printSlip'){rec.activities[i].printSlip=!!v}const all=moistureStore();all[st]=rec;saveMoistureStore(all);calcMoisture();updateMoistureHeader();renderMoistureTruckRows()}
function deleteMoistureTruck(i){if(!confirm('Moisture entry delete karein?'))return;const st=currentMoistureStack(),rec=stackRecord(st);rec.activities.splice(i,1);const all=moistureStore();all[st]=rec;saveMoistureStore(all);renderMoistureTruckRows();calcMoisture();updateMoistureHeader()}
function dateTimeNow(){const d=new Date();return dateText(d)+' '+d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
function calcMoisture(){
  const st=currentMoistureStack();if(!st)return;const rec=stackRecord(st),total=num($('mStackBags')?.value);const issued=stackIssuedTotal(rec);const updated=stackUpdatedTotal(rec);const wt=stackWtTotal(rec);const imc=updated?wt/updated:0;const r=rows.find(x=>stack(x)===st);const auto=stackMasterRmc(r||{});const rmc=rec.manualRmc!=null&&rec.manualRmc!==''?num(rec.manualRmc):auto;const diff=imc-rmc;
  if($('mUpdatedBags'))$('mUpdatedBags').textContent=updated.toLocaleString();if($('mRemainBags'))$('mRemainBags').value=(total-updated).toLocaleString();if($('mRemainBagsDisplay'))$('mRemainBagsDisplay').textContent=(total-updated).toLocaleString()+' BAGS';if($('mRemainBagsMirror'))$('mRemainBagsMirror').value=(total-updated).toLocaleString()+' BAGS';if($('mImc'))$('mImc').textContent=updated?imc.toFixed(2):'0.00';if($('mRmc'))$('mRmc').textContent=rmc.toFixed(2);if($('mRmcMode'))$('mRmcMode').textContent=rec.manualRmc!=null&&rec.manualRmc!==''?'Manual (saved)':'Auto from Master Sheet';if($('mDiff'))$('mDiff').textContent=(diff>=0?'+':'')+diff.toFixed(2);if($('moSavedRmc'))$('moSavedRmc').textContent=rmc.toFixed(2)+' %';if($('moSavedImc'))$('moSavedImc').textContent=(updated?imc:0).toFixed(2)+' %';if($('moSavedDiff')){const sd=(updated?imc:0)-rmc;$('moSavedDiff').textContent=(sd>=0?'+':'')+sd.toFixed(2)+' %';$('moSavedDiff').style.color=sd>0?'#08733f':sd<0?'#c52635':'#073d2c';}
  const card=$('mDiffCard'),txt=$('mDiffText');if(card){card.classList.remove('diff-pos','diff-neg','diff-zero');card.classList.add(diff>0?'diff-pos':diff<0?'diff-neg':'diff-zero')}if(txt)txt.textContent=diff>0?'Positive — Green (IMC higher)':diff<0?'Negative — Red (IMC lower)':'Neutral';
  const updateInput=$('mUpdateBags');if(updateInput){const pendingBags=Math.max(0,total-updated);updateInput.max=pendingBags||0;updateInput.placeholder=pendingBags?('Max '+pendingBags.toLocaleString()+' pending bags'):'No pending bags';}
  if($('mCompleteStatus')){const rem=total-issued;$('mCompleteStatus').textContent=total>0&&rem<=100&&rem>=-100&&issued>0&&updated>=issued?'READY — REMAINING 100 TO -100 + MOISTURE COMPLETE':'ACTIVE — '+rem.toLocaleString()+' bags remaining';}
  const remaining=total-issued;const canComplete=total>0&&remaining<=100&&remaining>=-100&&issued>0&&updated>=issued;
  const btn=$('mCompleteBtn');if(btn)btn.disabled=!canComplete;
  const btnV=$('mCompleteBtnVisible');if(btnV)btnV.disabled=!canComplete;
  const bar=$('moCompleteBar');if(bar)bar.style.display=canComplete?'flex':'none';
  const statusV=$('mCompleteStatusVisible');if(statusV)statusV.textContent=canComplete?'READY — COMPLETE karke History me bhejein':'';

}
function updateMoistureHeader(){const st=currentMoistureStack(),bar=$('mStackBar');if(!bar||!st)return;const rec=stackRecord(st),total=num($('mStackBags').value),issued=stackIssuedTotal(rec),updated=stackUpdatedTotal(rec);bar.style.display='flex';bar.innerHTML=`Stack: <b>${esc(st)}</b> | ${esc(commodity(rows.find(r=>stack(r)===st)||{}))} | Crop: <b>${esc(cropYearFromRow(rows.find(r=>stack(r)===st)||{}))}</b> | Total Bags: <b>${total.toLocaleString()}</b> | Issued: <b>${issued.toLocaleString()}</b> | Remaining: <b>${(total-issued).toLocaleString()}</b> | Moisture Updated: <b>${updated.toLocaleString()}</b>`;}
function openMoistureSaveModal(){
  const st=currentMoistureStack();
  if(!st){alert('Pehle Stack select karein.');return}
  const rec=stackRecord(st),total=num($('mStackBags').value),updated=stackUpdatedTotal(rec),pending=Math.max(0,total-updated),maxAllowed=pending+100;
  const r=rows.find(x=>String(stack(x))===String(st))||{}, autoRmc=stackMasterRmc(r), currentRmc=(rec.manualRmc!=null&&rec.manualRmc!=='')?num(rec.manualRmc):autoRmc;
  $('modalTitle').textContent='💧 MOISTURE UPDATE';
  const remaining=Math.max(0,total-updated);
  $('modalBody').innerHTML=`<div class="mo-popup-stack-grid">
      <div><span>Stack No.</span><b>${esc(st)}</b></div>
      <div class="remain"><span>Remaining Bags</span><b id="popRemaining">${remaining.toLocaleString()}</b></div>
      <div><span>RMC</span><b>${currentRmc.toFixed(2)} %</b></div>
      <div class="pop-proj"><span>Projection Difference</span><strong id="popProjection">0.00 %</strong><small>LIVE · IMC − RMC</small></div>
    </div>
    <div class="mo-popup-input-head"><span>Bag No.</span><span>Moisture %</span></div>
    <div class="mo-popup-fields">
      <div><label>👜 BAGS TO UPDATE</label><input id="popMoBags" type="number" min="1" max="${maxAllowed}" inputmode="numeric" placeholder="Enter bags" oninput="updateMoistureProjection()"></div>
      <div><label>💧 MOISTURE (%)</label><input id="popMoisture" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Enter moisture" oninput="updateMoistureProjection()"></div>
    </div>
    <div class="mo-popup-entry"><span>✓ Entry</span><b id="popEntryCount">${updated} / ${total}</b></div>
    <div class="mo-popup-bottom">
      <button class="mo-save mo-popup-save" onclick="saveMoistureFromModal()">💾 SAVE</button>
    </div>`;
  if(!window.history.state?.shambhuMoistureModal){
    window.history.pushState({shambhuMoistureModal:true},'',window.location.href);
  }
  $('modal').classList.add('show','mo-moisture-modal');
  updateMoistureProjection();
  setTimeout(()=>{$('popMoBags')?.focus({preventScroll:true});},80);
}
function updateMoistureProjection(){
  const st=currentMoistureStack();if(!st)return;
  const rec=stackRecord(st),total=num($('mStackBags').value),updated=stackUpdatedTotal(rec),wt=stackWtTotal(rec);
  const r=rows.find(x=>stack(x)===st)||{},rmc=(rec.manualRmc!=null&&rec.manualRmc!=='')?num(rec.manualRmc):stackMasterRmc(r);
  const bags=num($('popMoBags')?.value),m=num($('popMoisture')?.value);
  const previewBags=Number.isFinite(bags)&&bags>0?bags:0;
  const previewM=Number.isFinite(m)&&m>=0?m:0;
  const previewUpdated=updated+previewBags, previewWt=wt+(previewBags*previewM), imc=previewUpdated?previewWt/previewUpdated:0, diff=imc-rmc;
  const d=$('popProjection');if(d){d.textContent=`${diff>=0?'+':''}${diff.toFixed(2)} %`;d.style.color=diff>=0?'#08733f':'#c52635';}
  const cnt=$('popEntryCount');if(cnt)cnt.textContent=`${Math.min(previewUpdated,total)} / ${total}`;const rem=$('popRemaining');if(rem)rem.textContent=Math.max(0,total-previewUpdated).toLocaleString();
}

function moistureLimitForStack(st){const r=rows.find(x=>stack(x)===st)||{};return isRice(r)?15:14}
function saveMoistureFromModal(){
  const st=currentMoistureStack();if(!st)return;
  const rec=stackRecord(st),total=num($('mStackBags').value),updated=stackUpdatedTotal(rec),pending=Math.max(0,total-updated),maxAllowed=pending+100;
  const bags=num($('popMoBags')?.value);
  const m=String($('popMoisture')?.value??'').trim();
  if(!Number.isFinite(bags)||bags<=0){alert('Bags quantity enter karein.');return}
  if(bags>maxAllowed){alert('Pending bags se maximum 100 bags extra tak hi entry kar sakte hain. Allowed: '+maxAllowed+' bags.');return}
  if(m===''||!Number.isFinite(num(m))){alert('Moisture % enter karein.');return}
  const limit=moistureLimitForStack(st);if(num(m)>limit){alert((isRice(rows.find(x=>stack(x)===st)||{})?'Rice':'Wheat')+' moisture maximum '+limit+'% hai.');return}
  rec.activities.push({bags,moisture:m,date:dateTimeNow(),printSlip:true});
  const all=moistureStore();all[st]=rec;saveMoistureStore(all);localStorage.setItem('shambhuSelectedMoistureStack',st);const sel=$('mStack');if(sel)sel.value=st;
  renderMoistureActivity();renderMoistureTruckRows();calcMoisture();updateMoistureHeader();renderMoistureStackStatus();
  closeModal();
}
function saveRemainingMoisture(){openMoistureSaveModal();}
function editMoistureActivity(i){
  const st=currentMoistureStack(),rec=stackRecord(st),e=rec.activities[i];if(!e)return;
  $('modalTitle').textContent='✏️ Edit Moisture Entry';
  $('modalBody').innerHTML=`<div class="mo-entry-grid" style="grid-template-columns:1fr 1fr;gap:10px">
  <div><label>Bags</label><input id="editMoBags" type="number" min="1" value="${num(e.bags)}"></div>
  <div><label>Moisture (%)</label><input id="editMoMoisture" type="number" min="0" step="0.01" value="${esc(e.moisture??'')}"></div></div>
  <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="pill" onclick="closeModal()">Cancel</button><button class="mo-save" style="border:0;border-radius:8px;padding:10px 14px;font-weight:900;color:#fff" onclick="saveEditedMoisture(${i})">SAVE</button></div>`;
  $('modal').classList.add('show');
}
function saveEditedMoisture(i){
 const st=currentMoistureStack(),rec=stackRecord(st),e=rec.activities[i];if(!e)return;
 const total=num($('mStackBags').value),others=rec.activities.reduce((sum,x,j)=>sum+(j===i?0:num(x.bags)),0),b=num($('editMoBags').value),m=String($('editMoMoisture').value??'').trim();
 if(!b||b<1||b+others>total){alert('Total stack bags se zyada quantity nahi ho sakti.');return}if(m===''||!Number.isFinite(num(m))){alert('Moisture % enter karein.');return}
 const limit=moistureLimitForStack(st);if(num(m)>limit){alert((isRice(rows.find(x=>stack(x)===st)||{})?'Rice':'Wheat')+' moisture maximum '+limit+'% hai.');return}
 e.bags=b;e.moisture=m;e.date=dateTimeNow();const all=moistureStore();all[st]=rec;saveMoistureStore(all);renderMoistureTruckRows();calcMoisture();updateMoistureHeader();renderMoistureStackStatus();closeModal();
}

function renderMoistureActivity(){const box=$('mActivity');if(box)box.style.display='none'}
function saveManualRmc(){const st=currentMoistureStack();if(!st){alert('Pehle Stack select karein.');return}const v=$('mRmcManual').value;if(v===''){alert('Manual RMC enter karein.');return}const all=moistureStore(),rec=stackRecord(st);rec.manualRmc=num(v);all[st]=rec;saveMoistureStore(all);calcMoisture();alert('Manual RMC saved for this stack.');}
function completeMoistureStack(){const st=currentMoistureStack();if(!st)return;const rec=stackRecord(st),total=num($('mStackBags').value),issued=stackIssuedTotal(rec),updated=stackUpdatedTotal(rec);const remaining=total-issued;if(!(total>0&&remaining<=100&&issued>0&&updated>=issued)){alert('Complete Stack tabhi hoga jab remaining bags 100 ya usse kam ho aur issued bags ka moisture complete ho.');return}if(!confirm('Is stack ko Complete karke History me move karein?'))return;const all=moistureStore();delete all[st];saveMoistureStore(all);const r=rows.find(x=>stack(x)===st),h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]');const completedAt=dateTimeNow(),receiptDate=r?dateText(receipt(r)):''; const receiptObj=r?receipt(r):null; const completedDate=parseDate(completedAt.split(' ')[0]),receiptDateObj=parseDate(receiptObj); const storageDays=(completedDate&&receiptDateObj)?Math.max(0,Math.floor((new Date(completedDate.getFullYear(),completedDate.getMonth(),completedDate.getDate())-new Date(receiptDateObj.getFullYear(),receiptDateObj.getMonth(),receiptDateObj.getDate()))/86400000)):0; const finalRmc=rec.manualRmc!=null?num(rec.manualRmc):stackMasterRmc(r||{}); const finalImc=updated?stackWtTotal(rec)/updated:0; h.unshift({...rec,id:Date.now(),stack:st,completedAt,shed:r?shed(r):'',receipt:receiptDate,storageDays,commodity:r?commodity(r):'',cropYear:r?cropYearFromRow(r):'',stackBags:total,rmc:finalRmc,dmc:finalImc,imc:finalImc});localStorage.setItem('shambhuMoistureHistory',JSON.stringify(h));alert('Stack History me move ho gaya.');clearMoisture(false);renderMoistureHistory();}
function clearMoisture(confirmIt=true){if(confirmIt&&!confirm('Current screen clear karein? Saved truck entries delete nahi hongi.'))return;if($('mStack'))$('mStack').value='';for(const id of ['mReceipt','mCommodity','mCrop','mStackBags','mRmcAuto','mRmcManual','mRemainBags','mUpdateBags','mUpdateMoisture'])if($(id))$(id).value='';if($('mUpdateDate'))$('mUpdateDate').value=dateText(new Date());if($('mUpdateTime'))$('mUpdateTime').value=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});if($('moTruckRows'))$('moTruckRows').innerHTML='<tr><td colspan="7" class="empty">Select a stack to view moisture entries.</td></tr>';if($('mStackBar'))$('mStackBar').style.display='none';if($('mActivity'))$('mActivity').style.display='none';if($('mRmc'))$('mRmc').textContent='0.00';if($('mImc'))$('mImc').textContent='0.00';if($('mDiff'))$('mDiff').textContent='0.00';if($('mCompleteStatus'))$('mCompleteStatus').textContent='Select a stack';if($('mCompleteStatusVisible'))$('mCompleteStatusVisible').textContent='Select a stack';if($('mCompleteBtn'))$('mCompleteBtn').disabled=true;if($('mCompleteBtnVisible'))$('mCompleteBtnVisible').disabled=true;}
function newMoisture(){localStorage.removeItem('shambhuSelectedMoistureStack');clearMoisture();}
function renderMoistureHistory(){
  const box=$('moistureHistory');if(!box)return;const h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]');const cf=$('mhCommodity')?.value||'all';
  const list=h.filter(x=>(cf==='all'||(x.commodity||'').toLowerCase().includes(cf.toLowerCase())));
  if(!list.length){box.innerHTML='No completed moisture history yet.';return}
  box.innerHTML=`<div class="mo-history-wrap"><table class="mo-history-table"><thead><tr><th>Sr. No.</th><th>Stack Number</th><th>Receipt Date</th><th>Commodity</th><th>Crop Year</th><th>Storage Period (Days)</th><th>RMC</th><th>DMC / IMC</th><th>Moisture Difference (IMC − RMC)</th><th>Completed On</th><th>View</th></tr></thead><tbody>${list.map((x,i)=>{const rmc=num(x.rmc),imc=num(x.imc!=null?x.imc:x.dmc),diff=imc-rmc;const cls=diff>0?'diff-green':diff<0?'diff-red':'diff-neutral';const sign=diff>0?'+':'';return `<tr><td>${i+1}</td><td><b>${esc(x.stack)}</b></td><td>${esc(x.receipt||'—')}</td><td>${esc(x.commodity||'—')}</td><td>${esc(x.cropYear||'—')}</td><td>${num(x.storageDays||0)}</td><td>${rmc.toFixed(2)}</td><td>${imc.toFixed(2)}</td><td class="${cls}">${sign}${diff.toFixed(2)} ${diff>0?'🟢':diff<0?'🔴':'⚪'}</td><td>${esc(x.completedAt||'—')}</td><td><button class="view-btn" onclick="viewMoistureHistory(${x.id||0})">View</button></td></tr>`}).join('')}</tbody></table></div>`;
}

function viewMoistureHistory(id){const h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]'),x=h.find(a=>a.id===id);if(!x){const st=h[0];if(!st)return;x=st}const wt=stackWtTotal(x),entries=(x.activities&&x.activities.length?x.activities:(x.truckEntries||x.entries||[])),bags=entries.reduce((s,e)=>s+num(e.bags),0),imc=bags?wt/bags:0; $('modalTitle').textContent=`Moisture History — Stack ${x.stack}`;$('modalBody').innerHTML=`<div class="smallmuted">${esc(x.commodity)} · Crop ${esc(x.cropYear||'—')} · Completed ${esc(x.completedAt||'—')} · RMC ${num(x.rmc).toFixed(2)}%</div>${table('MOISTURE ENTRY DETAILS',['Sr','Bags','Moisture %','Updated On'],entries.map((e,i)=>`<tr><td>${i+1}</td><td>${num(e.bags).toLocaleString()}</td><td>${esc(e.moisture)}</td><td>${esc(e.date||e.updatedAt||'—')}</td></tr>`).join(''))}<div class="note">IMC = Total (Bags × Moisture) ÷ Moisture Updated Bags = ${imc.toFixed(2)}% · RMC − IMC = ${(imc-num(x.rmc)>=0?'+':'')+(imc-num(x.rmc)).toFixed(2)}</div>`;$('modal').classList.add('show')}
async function downloadMoistureHistoryExcel(which){const h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]');const match=which==='wheat'?h.filter(x=>/wheat/i.test(x.commodity||'')):h.filter(x=>/rice|frk|rra|rrc/i.test(x.commodity||''));if(!match.length){alert('Is category ki completed history available nahi hai.');return}const data=[['SHAMBHU SHED — COMPLETED MOISTURE HISTORY'],[which==='wheat'?'WHEAT':'FRK / RRA / RRC'],[],['Sr No.','Stack Number','Receipt Date','Commodity','Storage Period (Days)','RMC','IMC / DMC','Difference (IMC-RMC)','Completed On','Bags','Moisture %']];let sr=1;match.forEach(x=>{const es=(x.activities||x.truckEntries||x.entries||[]);es.forEach(e=>data.push([sr++,x.stack,x.receipt,x.commodity,x.storageDays,num(x.rmc).toFixed(2),num(x.imc!=null?x.imc:x.dmc).toFixed(2),(num(x.imc!=null?x.imc:x.dmc)-num(x.rmc)).toFixed(2),x.completedAt,num(e.bags),e.moisture]));});await makeWorkbook([{name:which==='wheat'?'Wheat':'FRK_RRA_RRC',data,widths:[8,18,15,20,20,10,10,18,22,10,12]}],`SHAMBHU_SHED_Moisture_History_${which}.xlsx`)}
function clearMoistureReportWithPin(){const pin=prompt('Moisture Report clear karne ke liye PIN enter karein:');if(pin===null)return;if(String(pin)!==String(getSitePin())){alert('Wrong PIN. Moisture Report clear nahi hua.');return}const h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]');if(!h.length){alert('Moisture Report already empty hai.');return}if(!confirm('PIN verified. Puri completed Moisture Report/History clear karein?'))return;localStorage.removeItem('shambhuMoistureHistory');renderMoistureHistory();if(currentPage==='moistureReports')renderPage('moistureReports');alert('Moisture Report clear ho gaya.');}
function clearMoistureHistory(){if(!confirm('Puri completed Moisture History delete karein?'))return;localStorage.removeItem('shambhuMoistureHistory');renderMoistureHistory();}
function exportMoisture(){const h=JSON.parse(localStorage.getItem('shambhuMoistureHistory')||'[]');if(!h.length){alert('History empty.');return}let csv='Completed,Stack,Shed,Commodity,Crop Year,Truck,Bags,Moisture %,Updated On,RMC %,IMC %,IMC-RMC\n';h.forEach(x=>{const bags=(x.truckEntries||x.entries||[]).reduce((s,e)=>s+num(e.bags),0)+(x.activities||[]).reduce((s,e)=>s+num(e.bags),0),wt=stackWtTotal(x),imc=bags?wt/bags:0;(x.truckEntries||x.entries||[]).forEach(e=>csv+=`"${x.completedAt}","${x.stack}","${x.shed}","${x.commodity}","${x.cropYear}","${e.truck}","${e.bags}","${e.moisture}","${e.updatedAt}","${x.rmc}","${imc.toFixed(2)}","${(imc-num(x.rmc)).toFixed(2)}"\n`);(x.activities||[]).forEach(e=>csv+=`"${x.completedAt}","${x.stack}","${x.shed}","${x.commodity}","${x.cropYear}","MOISTURE ACTIVITY","${e.bags}","${e.moisture}","${e.date}","${x.rmc}","${imc.toFixed(2)}","${(imc-num(x.rmc)).toFixed(2)}"\n`)});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='SHAMBHU_SHED_Moisture_History.csv';a.click();}
function renderMoistureActivityOnLoad(){if(currentMoistureStack()){renderMoistureActivity();}}

// PIN lock. Default PIN = 9001; changeable from the lock screen.
function getSitePin(){return localStorage.getItem('shambhuSitePin')||'9001'}
function unlockSite(){const v=$('sitePin').value;if(v===getSitePin()){$('pinScreen').style.display='none';sessionStorage.setItem('shambhuUnlocked','1');}else{$('pinError').textContent='Wrong PIN. Try again.';$('sitePin').value='';}}
function changePin(){const old=prompt('Current PIN enter karein:');if(old!==getSitePin()){alert('Current PIN galat hai.');return}const np=prompt('New PIN (4–6 digits):');if(!/^\d{4,6}$/.test(np||'')){alert('PIN 4–6 digits ka hona chahiye.');return}localStorage.setItem('shambhuSitePin',np);alert('PIN changed successfully.');}
if(sessionStorage.getItem('shambhuUnlocked')==='1')document.addEventListener('DOMContentLoaded',()=>{$('pinScreen').style.display='none'});else document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{$('sitePin')?.focus();},120)});
// Auto-lock after 5 minutes without user activity.
const SHAMBHU_IDLE_LIMIT=5*60*1000;let shambhuIdleTimer=null;
function resetShambhuIdleTimer(){if($('pinScreen')&&$('pinScreen').style.display==='none'){clearTimeout(shambhuIdleTimer);shambhuIdleTimer=setTimeout(lockForInactivity,SHAMBHU_IDLE_LIMIT);}}
function lockForInactivity(){clearTimeout(shambhuIdleTimer);sessionStorage.removeItem('shambhuUnlocked');if($('pinScreen')){$('pinScreen').style.display='flex';if($('sitePin')){$('sitePin').value='';$('sitePin').focus();}if($('pinError'))$('pinError').textContent='Auto-locked after 5 minutes of inactivity.';}}
['click','touchstart','keydown','scroll','pointerdown'].forEach(ev=>document.addEventListener(ev,resetShambhuIdleTimer,{passive:true}));
const _unlockSite=unlockSite;unlockSite=function(){_unlockSite();if(sessionStorage.getItem('shambhuUnlocked')==='1')resetShambhuIdleTimer();};
document.addEventListener('DOMContentLoaded',()=>{if(sessionStorage.getItem('shambhuUnlocked')==='1')resetShambhuIdleTimer();});


const _oldRenderPage=renderPage;
renderPage=function(page){if(page==='moisture'){document.querySelector('#dynamicPage').innerHTML=moisturePage();const savedStack=localStorage.getItem('shambhuSelectedMoistureStack')||'';if($('mStack')&&savedStack&&[...$('mStack').options].some(o=>o.value===savedStack)){$('mStack').value=savedStack;loadMoistureStack();}else{renderMoistureStackStatus();}if($('mUpdateDate'))$('mUpdateDate').value=dateText(new Date());if($('mUpdateTime'))$('mUpdateTime').value=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});if($('moTruckRows')&&savedStack==='')$('moTruckRows').innerHTML='<tr><td colspan="7" class="empty">Select a stack to view moisture entries.</td></tr>';return;}if(page==='moistureHistory'){document.querySelector('#dynamicPage').innerHTML=moistureHistoryPage();renderMoistureHistory();return;}if(page==='moistureReports'){document.querySelector('#dynamicPage').innerHTML=moistureReportsPage();return;}return _oldRenderPage(page)};

/* FIREBASE MULTI-PHONE SYNC — V10 BASE + PER-STACK MOISTURE SYNC */
const SHAMBHU_FIREBASE_CONFIG={
  apiKey:"AIzaSyBF3soiMUaZFqf_z9p4AiljHfwE5PKwv40",
  authDomain:"shambhu-shed.firebaseapp.com",
  projectId:"shambhu-shed",
  storageBucket:"shambhu-shed.firebasestorage.app",
  messagingSenderId:"720957862261",
  appId:"1:720957862261:web:f9706180f5f5345801233c"
};
/* Moisture Active is deliberately NOT synced as one large document.
   Each stack gets its own Firestore document so two phones can update
   different stacks without overwriting each other. */
const SHAMBHU_SHARED_KEYS=['shambhuMoistureHistory','shambhuWorkNotes'];
const SHAMBHU_CLIENT_ID=(()=>{let x=localStorage.getItem('shambhuSyncClientId');if(!x){x='c_'+Date.now()+'_'+Math.random().toString(36).slice(2);localStorage.setItem('shambhuSyncClientId',x)}return x})();
let shambhuFirebaseReady=false,shambhuFirebaseBusy=false,shambhuSharedUnsub=null,shambhuMoistureUnsub=null;
const shambhuPendingShared=new Map(),shambhuSharedRev=new Map(),shambhuMoistureRev=new Map();
let shambhuKnownMoisture={};
function shambhuDecode(v){if(typeof v!=='string')return {value:v,ts:0,client:''};try{const o=JSON.parse(v);if(o&&o.__shambhuSync>=2&&Object.prototype.hasOwnProperty.call(o,'value'))return o;}catch(e){}return {value:v,ts:0,client:''}}
function shambhuEncode(value,ts){return JSON.stringify({__shambhuSync:3,value:value,ts:ts,client:SHAMBHU_CLIENT_ID})}
function shambhuRefreshUI(){try{if(typeof renderAll==='function')renderAll();if(typeof renderPage==='function'&&currentPage==='moisture')renderPage('moisture');}catch(e){console.warn(e)}}
function shambhuFirebaseInit(){
  try{
    if(!window.firebase){console.warn('Firebase SDK missing');return;}
    if(!firebase.apps.length)firebase.initializeApp(SHAMBHU_FIREBASE_CONFIG);
    window.shambhuDB=firebase.firestore();
    try{shambhuDB.settings({experimentalForceLongPolling:true,useFetchStreams:false});}catch(e){}
    shambhuFirebaseReady=true;

    /* Shared non-moisture data keeps timestamped whole-key sync. */
    const sharedRef=shambhuDB.collection('shambhuSync').doc('shared');
    let sharedFirst=true;
    shambhuSharedUnsub=sharedRef.onSnapshot(async snap=>{
      const remote=snap.exists?(snap.data()||{}):{};
      if(sharedFirst){
        sharedFirst=false;
        const out={};
        SHAMBHU_SHARED_KEYS.forEach(k=>{
          const rv=remote[k];
          if(rv!==undefined){const d=shambhuDecode(String(rv));shambhuSharedRev.set(k,d.ts||0);out[k]=d.value;}
          else {const lv=localStorage.getItem(k);if(lv!==null){const ts=Date.now();shambhuSharedRev.set(k,ts);shambhuPendingShared.set(k,{value:lv,ts});out[k]=lv;}}
        });
        const write={};Object.keys(out).forEach(k=>write[k]=shambhuEncode(out[k],shambhuSharedRev.get(k)||Date.now()));
        if(Object.keys(write).length)try{await sharedRef.set(write,{merge:true})}catch(e){console.warn('Firebase initial shared sync failed:',e)}
        return;
      }
      shambhuFirebaseBusy=true;
      try{SHAMBHU_SHARED_KEYS.forEach(k=>{if(remote[k]===undefined)return;const d=shambhuDecode(String(remote[k])),lr=shambhuSharedRev.get(k)||0,p=shambhuPendingShared.get(k);if(p&&d.ts<p.ts)return;if(d.ts&&d.ts<lr)return;if(d.value===null)localStorage.removeItem(k);else localStorage.setItem(k,String(d.value));shambhuSharedRev.set(k,d.ts||Date.now());if(p&&d.ts>=p.ts)shambhuPendingShared.delete(k)});shambhuRefreshUI();}
      finally{shambhuFirebaseBusy=false}
    },e=>console.warn('Firebase shared listener:',e));

    /* Per-stack moisture listener. */
    shambhuKnownMoisture=JSON.parse(localStorage.getItem('shambhuMoistureActive')||'{}');
    shambhuMoistureUnsub=shambhuDB.collection('shambhuMoistureStacks').onSnapshot(async snap=>{
      let changed=false;
      shambhuFirebaseBusy=true;
      try{
        const all=JSON.parse(localStorage.getItem('shambhuMoistureActive')||'{}');
        snap.docChanges().forEach(ch=>{
          const id=ch.doc.id, d=ch.doc.data()||{}, remoteTs=Number(d.ts)||0, localTs=Number(shambhuMoistureRev.get(id))||0;
          const pending=shambhuMoistureRev.get(id+'_pending');
          if(pending&&remoteTs<pending)return;
          if(remoteTs&&remoteTs<localTs)return;
          if(d.deleted){if(Object.prototype.hasOwnProperty.call(all,id.replace(/^stack_/,''))){delete all[id.replace(/^stack_/,'')];changed=true}}
          else if(d.record!==undefined){const st=id.replace(/^stack_/,'');try{all[st]=JSON.parse(String(d.record));changed=true}catch(e){}}
          shambhuMoistureRev.set(id,remoteTs);
          if(pending&&remoteTs>=pending)shambhuMoistureRev.delete(id+'_pending');
        });
        if(changed){localStorage.setItem('shambhuMoistureActive',JSON.stringify(all));shambhuKnownMoisture=JSON.parse(JSON.stringify(all));shambhuRefreshUI();}
      }finally{shambhuFirebaseBusy=false}

      /* First connection: upload local stacks that do not exist remotely. */
      if(!snap.metadata.fromCache){
        const remoteIds=new Set(snap.docs.map(d=>d.id));
        const local=JSON.parse(localStorage.getItem('shambhuMoistureActive')||'{}');
        for(const st of Object.keys(local)){if(!remoteIds.has('stack_'+st))shambhuFirebasePushMoistureStack(st,local[st])}
      }
    },e=>console.warn('Firebase moisture listener:',e));

    window.shambhuFirebaseSyncNow=()=>{SHAMBHU_SHARED_KEYS.forEach(k=>shambhuFirebasePushShared(k,localStorage.getItem(k)));const a=JSON.parse(localStorage.getItem('shambhuMoistureActive')||'{}');Object.keys(a).forEach(st=>shambhuFirebasePushMoistureStack(st,a[st]))};
  }catch(e){console.warn('Firebase init failed:',e)}
}
async function shambhuFirebasePushShared(key,value){if(!shambhuFirebaseReady||!SHAMBHU_SHARED_KEYS.includes(key))return;const ts=Date.now();shambhuSharedRev.set(key,ts);shambhuPendingShared.set(key,{value,ts});try{const data={};data[key]=shambhuEncode(value,ts);await shambhuDB.collection('shambhuSync').doc('shared').set(data,{merge:true});const p=shambhuPendingShared.get(key);if(p&&p.ts===ts)shambhuPendingShared.delete(key)}catch(e){console.warn('Firebase shared write failed:',e)}}
async function shambhuFirebasePushMoistureStack(stack,record){if(!shambhuFirebaseReady||!stack)return;const id='stack_'+String(stack);const ts=Date.now();shambhuMoistureRev.set(id,ts);shambhuMoistureRev.set(id+'_pending',ts);try{await shambhuDB.collection('shambhuMoistureStacks').doc(id).set({record:JSON.stringify(record),ts,client:SHAMBHU_CLIENT_ID,deleted:false},{merge:true});if(shambhuMoistureRev.get(id+'_pending')===ts)shambhuMoistureRev.delete(id+'_pending')}catch(e){console.warn('Firebase moisture stack write failed:',e)}}
async function shambhuFirebaseDeleteMoistureStack(stack){if(!shambhuFirebaseReady||!stack)return;const id='stack_'+String(stack),ts=Date.now();shambhuMoistureRev.set(id,ts);shambhuMoistureRev.set(id+'_pending',ts);try{await shambhuDB.collection('shambhuMoistureStacks').doc(id).set({record:null,ts,client:SHAMBHU_CLIENT_ID,deleted:true},{merge:true})}catch(e){console.warn('Firebase moisture stack delete failed:',e)}}
(function installFirebaseStorageSync(){
  const origSet=Storage.prototype.setItem,origRemove=Storage.prototype.removeItem;
  Storage.prototype.setItem=function(k,v){
    if(this===localStorage&&k==='shambhuMoistureActive'&&!shambhuFirebaseBusy){
      let before=shambhuKnownMoisture||{};try{before=JSON.parse(JSON.stringify(before))}catch(e){before={}}
      let after={};try{after=JSON.parse(String(v)||'{}')}catch(e){after={}}
      origSet.call(this,k,v);shambhuKnownMoisture=after;
      const keys=new Set([...Object.keys(before),...Object.keys(after)]);
      keys.forEach(st=>{if(!Object.prototype.hasOwnProperty.call(after,st))shambhuFirebaseDeleteMoistureStack(st);else if(JSON.stringify(before[st])!==JSON.stringify(after[st]))shambhuFirebasePushMoistureStack(st,after[st])});
      return;
    }
    origSet.call(this,k,v);
    if(this===localStorage&&!shambhuFirebaseBusy&&SHAMBHU_SHARED_KEYS.includes(k))shambhuFirebasePushShared(k,String(v));
  };
  Storage.prototype.removeItem=function(k){
    if(this===localStorage&&k==='shambhuMoistureActive'&&!shambhuFirebaseBusy){const before=shambhuKnownMoisture||{};origRemove.call(this,k);Object.keys(before).forEach(st=>shambhuFirebaseDeleteMoistureStack(st));shambhuKnownMoisture={};return}
    origRemove.call(this,k);if(this===localStorage&&!shambhuFirebaseBusy&&SHAMBHU_SHARED_KEYS.includes(k))shambhuFirebasePushShared(k,null);
  };
  window.addEventListener('load',()=>setTimeout(shambhuFirebaseInit,300));
})();
