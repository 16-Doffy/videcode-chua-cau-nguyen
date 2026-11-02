import {MEASUREMENT_ID,CONSENT_KEY,safeEvent,safeLocation,safeReferrer,validConsent} from './analytics-policy.js';
const $=s=>document.querySelector(s),disabledKey='ga-disable-'+MEASUREMENT_ID;
let consent=null,configured=false,sceneStatus=null,started=false,initialized=false;const lastSent=new Map();
try{consent=validConsent(JSON.parse(localStorage.getItem(CONSENT_KEY)))}catch{}
window[disabledKey]=consent!=='granted';
function ga(){window.dataLayer.push(arguments)}
function debugEnabled(){return ['localhost','127.0.0.1'].includes(location.hostname)}
function config(){const path=new URL('.',location.href).pathname;return{
 send_page_view:false,page_location:safeLocation(location.href),page_referrer:safeReferrer(document.referrer),page_title:'Duy Gioi',
 allow_google_signals:false,allow_ad_personalization_signals:false,cookie_prefix:'duygioi',cookie_path:path,cookie_domain:'none',cookie_expires:30*86400,
 ...(debugEnabled()?{debug_mode:true}:{})
}}
function start(){
 if(consent!=='granted'||configured)return;configured=true;window[disabledKey]=false;
 // Strip unknown query data before any Google code is loaded. Never transmit free-form URLs.
 const clean=safeLocation(location.href);if(clean!==location.href)history.replaceState(history.state,'',clean);
 window.dataLayer=window.dataLayer||[];window.gtag=ga;
 ga('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 ga('set','ads_data_redaction',true);ga('js',new Date());ga('config',MEASUREMENT_ID,config());
 ga('event','page_view',{send_to:MEASUREMENT_ID,page_title:'Duy Gioi',page_location:clean,page_referrer:safeReferrer(document.referrer),...(debugEnabled()?{debug_mode:true}:{})});
 const script=document.createElement('script');script.id='duygioi-google-tag';script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+MEASUREMENT_ID;
 script.onerror=()=>{const status=$('#analytics-status');if(status)status.textContent='Đã chọn bật, nhưng trình duyệt hoặc mạng chưa tải được Analytics. Bạn vẫn chơi bình thường.'};
 document.head.append(script);if(sceneStatus)track(sceneStatus.name,sceneStatus.params);
}
export function track(name,params={}){
 if(consent!=='granted'||!configured||window[disabledKey])return false;
 const event=safeEvent(name,params);if(!event)return false;
 if(name==='experience_started'){if(started)return false;started=true}
 const key=JSON.stringify(event),now=performance.now();if(now-(lastSent.get(key)??-Infinity)<700)return false;lastSent.set(key,now);
 ga('event',event.name,{...event.params,send_to:MEASUREMENT_ID,...(debugEnabled()?{debug_mode:true}:{})});return true;
}
export function reportScene(ready){const ms=performance.now();sceneStatus={name:ready?'scene_ready':'scene_failed',params:ready?{load_bucket:ms<3000?'under_3s':ms<10000?'3_to_10s':'over_10s'}:{}};track(sceneStatus.name,sceneStatus.params)}
function deleteAnalyticsCookies(){
 const path=new URL('.',location.href).pathname;
 for(const chunk of document.cookie.split(';')){const name=chunk.split('=')[0].trim();if(/^duygioi_ga(?:_|$)/.test(name))document.cookie=name+'=; Max-Age=0; Path='+path+'; SameSite=Lax; Secure'}
}
function persist(state){try{localStorage.setItem(CONSENT_KEY,JSON.stringify({version:1,state,updatedAt:Date.now()}));return true}catch{return false}}
function render(){
 if(!initialized)return;
 $('#analytics-status').textContent=consent==='granted'?'Thống kê đang bật trên thiết bị này.':consent==='denied'?'Thống kê đang tắt. Bạn vẫn dùng đầy đủ trải nghiệm.':'Chưa bật thống kê. Bạn vẫn dùng đầy đủ trải nghiệm.';
 $('#analytics-grant').disabled=consent==='granted';$('#analytics-deny').disabled=consent==='denied';$('#analytics-banner').hidden=consent!==null;
}
function choose(state){
 const wasActive=configured;consent=state;window[disabledKey]=state!=='granted';const saved=persist(state);
 if(state==='denied'){
  // Reload unloads already-loaded Google code; the next document will not load it.
  // The opt-out flag blocks this measurement ID immediately, before the reload.
  if(wasActive){deleteAnalyticsCookies();if(saved){location.reload();return}}
 }else start();render();
 if(!saved)$('#analytics-status').textContent='Thiết bị chưa cho nhớ lựa chọn. Lựa chọn này áp dụng trong tab hiện tại.';
}
export function initAnalytics(){
 initialized=true;
 $('#analytics-accept').onclick=()=>choose('granted');$('#analytics-reject').onclick=()=>choose('denied');
 $('#analytics-grant').onclick=()=>choose('granted');$('#analytics-deny').onclick=()=>choose('denied');
 function open(){render();$('#privacy-dialog').showModal()}
 $('#privacy-open').onclick=open;$('#analytics-details').onclick=open;render();if(consent==='granted')start();
 window.addEventListener('error',()=>track('app_error',{error_type:'script'}));
 window.addEventListener('unhandledrejection',()=>track('app_error',{error_type:'promise'}));
 window.addEventListener('storage',event=>{if(event.key!==CONSENT_KEY)return;let next=null;try{next=validConsent(JSON.parse(event.newValue))}catch{}if(next!==consent){window[disabledKey]=next!=='granted';location.reload()}});
}
