(() => {
  'use strict';
  const works = window.PORTFOLIO_WORKS;
  const grid = document.querySelector('#works-grid');
  const dialog = document.querySelector('#video-dialog');
  const player = document.querySelector('#player');
  const error = document.querySelector('#video-error');
  const captionButton = document.querySelector('#toggle-captions');
  const mobilePortrait = window.matchMedia('(max-width: 700px) and (orientation: portrait)');
  let savedScroll = null;
  function lockPage() {
    if(savedScroll)return;
    savedScroll={y:window.scrollY,body:document.body.style.cssText};
    Object.assign(document.body.style,{position:'fixed',top:`-${savedScroll.y}px`,left:'0',right:'0',width:'100%',overflow:'hidden'});
  }
  function unlockPage() {
    if(!savedScroll)return;
    const previous=savedScroll;savedScroll=null;
    document.body.style.cssText=previous.body;
    window.scrollTo({top:previous.y,behavior:'instant'});
  }
  function resetViewerLayout() {
    dialog.querySelector('.dialog-content').scrollTop=0;
  }
  const captionTrack = player.addTextTrack('subtitles','English','en');
  captionTrack.mode='hidden';
  const labels = {uk:{filming:'Зйомка і монтаж',editing:'Монтаж',watch:'Переглянути',frame:'Кадр із відео',vertical:'Вертикальне відео · 9:16',square:'Квадратне відео · 1:1',more:'Показати ще',of:'з'},en:{filming:'Filming & editing',editing:'Editing',watch:'Watch',frame:'Frame from',vertical:'Vertical video · 9:16',square:'Square video · 1:1',more:'Show more',of:'of'}};
  let category='filming',language='en',visible=9,activeId='',hls=null,opener=null;
  // English by default; only an explicit UA/EN click is remembered (old auto-saved key is dropped).
  try { localStorage.removeItem('liuda-language'); if(localStorage.getItem('liuda-lang') === 'uk') language='uk'; } catch {}
  const time = seconds => `${Math.floor(Math.round(seconds)/60)}:${String(Math.round(seconds)%60).padStart(2,'0')}`;
  const list = () => category==='selected' ? works.filter(w=>w.featured) : works.filter(w=>w.category===category);
  const escapeHTML = text => text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render() {
    grid.replaceChildren();
    const selected=list(),shown=selected.slice(0,visible), l=labels[language];
    document.querySelector('#work-count').textContent=`${shown.length} ${l.of} ${selected.length}`;
    document.querySelectorAll('.filter').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
    shown.forEach((work,index)=>{
      const card=document.createElement('article');card.className='work-card';
      const title=escapeHTML(work.title[language]);
      card.innerHTML=`<button class="work-open" type="button" aria-label="${l.watch}: ${title}"><img src="assets/media/${work.id}/cover-720.webp" srcset="assets/media/${work.id}/cover-720.webp 720w, assets/media/${work.id}/cover.webp 1080w" sizes="(max-width:900px) 50vw, 33vw" alt="${l.frame} «${title}»" width="540" height="960" loading="lazy" decoding="async"><span class="play-icon" aria-hidden="true"><svg viewBox="0 0 20 24" fill="currentColor"><path d="M1 1 19 12 1 23z"/></svg></span><span class="duration">${time(work.duration)}</span></button>`;
      card.querySelector('button').addEventListener('click',e=>{opener=e.currentTarget;openVideo(work.id)});grid.append(card);
    });
    const more=document.querySelector('#show-more');more.hidden=visible>=selected.length;more.textContent=`${l.more} (${Math.min(9,Math.max(0,selected.length-visible))})`;
  }
  function updateContext() {
    const work=works.find(w=>w.id===activeId); if(!work)return;
    const l=labels[language],at=list().findIndex(w=>w.id===activeId);
    document.querySelector('#video-position').textContent=`${at+1} / ${list().length}`;
    player.setAttribute('aria-label',work.title[language]);dialog.setAttribute('aria-label',work.title[language]);
  }
  function setCaptions(show) {
    captionTrack.mode=show?'showing':'hidden';
    captionButton.setAttribute('aria-pressed',String(show));
  }
  function loadCaptions(id) {
    for(const cue of Array.from(captionTrack.cues||[]))captionTrack.removeCue(cue);
    const cues=window.PORTFOLIO_CAPTIONS[id]||[];
    captionButton.hidden=!cues.length;
    cues.forEach(item=>{
      const cue=new VTTCue(item.start,item.end,item.text);
      cue.line=-3;cue.position=50;cue.size=94;cue.align='center';
      captionTrack.addCue(cue);
    });
    setCaptions(language==='en'&&cues.length>0);
  }
  function stopVideo() {
    player.pause(); if(hls){hls.destroy();hls=null} player.removeAttribute('src');player.load();
  }
  function openVideo(id) {
    if(!works.some(w=>w.id===id))return;
    stopVideo();activeId=id;error.hidden=true;updateContext();
    player.poster=`assets/media/${id}/cover.webp`;
    if(!dialog.open){lockPage();dialog.showModal()}
    resetViewerLayout();
    dialog.scrollTop=0;
    loadCaptions(id);
    if(document.documentElement.dataset.mediaFormat==='mp4'){
      player.src=`assets/media/${id}/video.mp4`;player.play().catch(()=>{});
    }else{
      const src=`assets/media/${id}/index.m3u8`;
      if(player.canPlayType('application/vnd.apple.mpegurl')){player.src=src;player.play().catch(()=>{})}
      else if(window.Hls&&Hls.isSupported()){
        hls=new Hls({maxBufferLength:18,maxMaxBufferLength:30,backBufferLength:6});hls.loadSource(src);hls.attachMedia(player);
        hls.on(Hls.Events.MANIFEST_PARSED,()=>player.play().catch(()=>{}));
        hls.on(Hls.Events.ERROR,(_,info)=>{if(info.fatal)error.hidden=false});
      }else error.hidden=false;
    }
  }
  function changeLanguage(next,remember) {
    language=next; document.documentElement.lang=next;
    if(remember){try{localStorage.setItem('liuda-lang',next)}catch{}}
    document.querySelectorAll('[data-i18n]').forEach(el=>el.innerHTML=window.PORTFOLIO_TRANSLATIONS[el.dataset.i18n][next]);
    document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===next)));
    const title=next==='uk'?'Люда — відеокреаторка в Пафосі':'Liuda — Video Creator in Paphos';
    const description=next==='uk'?'Предметна зйомка, lifestyle-відео та монтаж для бізнесу й особистих блогів.':'Product films, lifestyle videos and editing for businesses and personal brands.';
    document.title=title;document.querySelector('meta[name="description"]').content=description;document.querySelector('meta[property="og:title"]').content=title;document.querySelector('meta[property="og:description"]').content=description;
    render();if(dialog.open){updateContext();setCaptions(next==='en'&&!captionButton.hidden)}
  }
  function switchCategory(next){
    const belowGalleryStart=grid.getBoundingClientRect().top<0;
    category=next;visible=9;render();
    if(belowGalleryStart)grid.scrollIntoView({block:'start',behavior:'instant'});
  }
  function step(direction){const selected=list(),at=selected.findIndex(w=>w.id===activeId);if(selected.length)openVideo(selected[(at+direction+selected.length)%selected.length].id)}
  document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>switchCategory(b.dataset.category)));
  document.querySelectorAll('[data-jump-category]').forEach(b=>b.addEventListener('click',()=>switchCategory(b.dataset.jumpCategory)));
  document.querySelectorAll('[data-open-work]').forEach(b=>b.addEventListener('click',()=>{opener=b;switchCategory('selected');openVideo(b.dataset.openWork)}));
  document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>changeLanguage(b.dataset.language,true)));
  document.querySelector('#show-more').addEventListener('click',()=>{const previous=visible;visible+=9;render();const firstNew=grid.querySelectorAll('button')[previous];if(firstNew){firstNew.focus({preventScroll:true});firstNew.scrollIntoView({block:'start',behavior:'instant'})}});
  captionButton.addEventListener('click',()=>setCaptions(captionTrack.mode!=='showing'));
  player.textTracks.addEventListener('change',()=>captionButton.setAttribute('aria-pressed',String(captionTrack.mode==='showing')));
  document.querySelector('#close-video').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{stopVideo();unlockPage();if(opener?.isConnected)opener.focus({preventScroll:true})});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
  document.querySelector('#prev-video').addEventListener('click',()=>step(-1));
  document.querySelector('#next-video').addEventListener('click',()=>step(1));
  document.querySelector('#retry-video').addEventListener('click',()=>openVideo(activeId));
  player.addEventListener('error',()=>{if(player.getAttribute('src')&&dialog.open)error.hidden=false});
  changeLanguage(language);
})();
