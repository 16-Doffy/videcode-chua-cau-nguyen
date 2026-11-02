export const MEASUREMENT_ID='G-C8Q2YZW3GS';
export const CONSENT_KEY='duy-gioi:analytics-consent-v1';
export const CONSENT_DAYS=180;
const features=new Set(['map','tarot','zodiac','notes','breathing','character']);
const activities=new Set(['world','tarot','breathing','saved_note']);
export function safeEvent(name,params={}){
 if(name==='scene_ready')return{name,params:['under_3s','3_to_10s','over_10s'].includes(params.load_bucket)?{load_bucket:params.load_bucket}:{}};
 if(['scene_failed','experience_started'].includes(name))return{name,params:{}};
 if(name==='feature_opened'&&features.has(params.feature_name))return{name,params:{feature_name:params.feature_name}};
 if(name==='interaction_completed'&&activities.has(params.activity))return{name,params:{activity:params.activity}};
 if(name==='app_error'&&['script','promise','webgl'].includes(params.error_type))return{name,params:{error_type:params.error_type}};
 return null;
}
export function safeLocation(raw){
 const u=new URL(raw);u.hash='';const keep=new URLSearchParams();
 const sources=new Set(['facebook','instagram','tiktok','youtube']);
 const media=new Set(['social','paid_social','cpc','organic']);
 const source=u.searchParams.get('utm_source'),medium=u.searchParams.get('utm_medium'),campaign=u.searchParams.get('utm_campaign'),content=u.searchParams.get('utm_content');
 if(sources.has(source))keep.set('utm_source',source);
 if(media.has(medium))keep.set('utm_medium',medium);
 if(campaign==='beta_launch')keep.set('utm_campaign',campaign);
 if(content&&/^(?:post|reel|story|video)_\d{1,3}$|^bio$/.test(content))keep.set('utm_content',content);
 u.search=keep.toString();return u.href;
}
export function safeReferrer(raw){try{const u=new URL(raw);return /^https?:$/.test(u.protocol)?u.origin+'/':''}catch{return ''}}
export function validConsent(value,now=Date.now()){
 return value&&value.version===1&&['granted','denied'].includes(value.state)&&Number.isFinite(value.updatedAt)&&value.updatedAt<=now&&now-value.updatedAt<CONSENT_DAYS*86400000?value.state:null;
}
