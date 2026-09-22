
let shambhuInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();shambhuInstallPrompt=e;const b=document.getElementById('installAppBtn');if(b)b.style.display='inline-block';});
window.addEventListener('appinstalled',()=>{shambhuInstallPrompt=null;const b=document.getElementById('installAppBtn');if(b)b.style.display='none';});
async function installShambhuApp(){
  if(!shambhuInstallPrompt){
    alert('Chrome ne abhi install prompt nahi diya. Latest Netlify files deploy karke Chrome me site ko dobara open karein; phir INSTALL APP dabayein. Agar Chrome menu me sirf “Add to home screen” dikhe, pehle purana shortcut/app remove karke fresh site open karein.');
    return;
  }
  shambhuInstallPrompt.prompt();
  try{await shambhuInstallPrompt.userChoice;}catch(e){}
  shambhuInstallPrompt=null;
  const b=document.getElementById('installAppBtn');if(b)b.style.display='none';
}
