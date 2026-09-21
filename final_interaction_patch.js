/* Final interaction patch:
   Under Issue > OPEN is a normal-page action — it does NOT open a popup.
   It selects that stack for moisture update, refreshes its saved moisture
   entries below, and scrolls to the saved-entry/update area. The separate
   MOISTURE UPDATE control continues to open the Bags + Moisture popup with
   live Projection Difference.
*/
(function(){
  document.addEventListener('click', function(e){
    const el = e.target.closest && e.target.closest('button,[role="button"],a');
    if(!el) return;
    const txt = (el.textContent || '').trim().toUpperCase();
    if (txt === 'MOISTURE UPDATE' || txt === 'UPDATE MOISTURE') {
      el.setAttribute('data-moisture-update','1');
    }
  }, true);
})();
