
document.addEventListener('DOMContentLoaded',function(){
  const pin=document.getElementById('sitePin');
  if(pin){
    pin.type='tel'; pin.inputMode='numeric'; pin.pattern='[0-9]*'; pin.autocomplete='one-time-code'; pin.enterKeyHint='done'; pin.maxLength=6;
    const focusPin=()=>{ if(document.getElementById('pinScreen')?.style.display!=='none'){ try{pin.focus({preventScroll:true}); pin.setSelectionRange(pin.value.length,pin.value.length);}catch(e){pin.focus();} } };
    pin.addEventListener('click',focusPin);
    pin.addEventListener('pointerdown',()=>{pin.inputMode='numeric';pin.type='tel';},{passive:true});
    pin.addEventListener('touchend',()=>setTimeout(focusPin,0),{passive:true});
    requestAnimationFrame(focusPin);
    setTimeout(focusPin,120);
    setTimeout(focusPin,500);
  }
});
