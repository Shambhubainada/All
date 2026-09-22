
// Numeric PIN keyboard: tel/inputmode is mobile-friendly; typing is restricted to digits.
document.addEventListener('DOMContentLoaded',function(){
  const p=document.getElementById('sitePin');
  if(!p)return;
  p.type='tel'; p.setAttribute('inputmode','numeric'); p.setAttribute('pattern','[0-9]*'); p.setAttribute('enterkeyhint','done'); p.setAttribute('autocomplete','off');
  p.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'').slice(0,6);});
  p.addEventListener('focus',function(){this.setSelectionRange(this.value.length,this.value.length);});
  p.addEventListener('click',function(){this.focus();});
});
