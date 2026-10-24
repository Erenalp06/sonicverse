const API='https://discoveryprovider.audius.co/v1';
const APP='SonicVerse';
export type Track={id:string;title:string;artist:string;artwork?:string;streamable:boolean;permalink?:string};
type RawTrack={id?:string;title?:string;user?:{name?:string};artwork?:{'150x150'?:string};is_streamable?:boolean;is_unlisted?:boolean;access?:{stream?:boolean};permalink?:string};
function normalize(t:RawTrack):Track|null{if(!t.id||!t.title)return null;return {id:t.id,title:t.title,artist:t.user?.name||'Bilinmeyen sanatçı',artwork:t.artwork?.['150x150'],streamable:t.is_streamable!==false&&t.access?.stream!==false,permalink:t.permalink};}
async function request(path:string,params:Record<string,string>={},signal?:AbortSignal):Promise<Track[]>{const u=new URL(API+path);u.searchParams.set('app_name',APP);u.searchParams.set('limit','20');Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));const response=await fetch(u,{signal});if(!response.ok)throw Error('Audius HTTP '+response.status);const body=await response.json() as {data?:RawTrack[]};if(!Array.isArray(body.data))throw Error('Audius beklenmeyen yanıt döndürdü');return body.data.map(normalize).filter((x):x is Track=>!!x&&x.streamable);}
export const trending=(signal?:AbortSignal)=>request('/tracks/trending',{time:'week'},signal);
export const searchTracks=(query:string,signal?:AbortSignal)=>request('/tracks/search',{query},signal);
export function streamUrl(id:string){return API+'/tracks/'+encodeURIComponent(id)+'/stream?app_name='+APP;}
