
(function(){
  const oldOpenAdd=window.openAddMoistureStackModal;
  if(typeof oldOpenAdd!=='function') return;
  window.openAddMoistureStackModal=function(){
    oldOpenAdd();
    const m=document.getElementById('modal');
    if(m) m.classList.add('mo-add-stack-modal-fix');
    requestAnimationFrame(function(){
      const s=document.getElementById('newMoStack');
      if(s){s.focus({preventScroll:true}); s.scrollIntoView({block:'nearest'});}
    });
  };
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
