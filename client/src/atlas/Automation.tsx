import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { api, post } from './client';
import { Modal } from './Organization';
import type { Destination, Page } from './model';
type Status={enabled:boolean;connected:boolean;model:string|null;pending:number};
type Change={id:string;node_id:string;title:string;status:string;created_at:string;before:{details:{labels:string};destination:Destination};after:{details:{labels:string;abstract:string};destination:Destination}};
export function Automation({onChanged,onOpen}:{onChanged:()=>void;onOpen:(id:string)=>void}){
  const [open,setOpen]=useState(false),[status,setStatus]=useState<Status|null>(null),[history,setHistory]=useState<Page<Change>>({items:[],nextCursor:null}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const running=useRef(false);const changed=useRef(onChanged);changed.current=onChanged;
  async function refresh(){setStatus(await api<Status>('/organization'));}
  async function loadHistory(cursor=''){const next=await api<Page<Change>>(`/organization/history?limit=20&cursor=${encodeURIComponent(cursor)}`);setHistory(old=>cursor?{...next,items:[...old.items,...next.items]}:next);}
  useEffect(()=>{let alive=true;api<Status>('/organization').then(s=>{if(alive)setStatus(s);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  useEffect(()=>{if(!status?.enabled||!status.connected||error)return;let alive=true;
    async function tick(){if(running.current||document.visibilityState==='hidden')return;running.current=true;setBusy(true);try{const result=await post<{processed:number}>('/organization/run',{});if(alive){await refresh();if(result.processed){changed.current();if(open)await loadHistory();}}}catch(e){if(alive)setError((e as Error).message);}finally{running.current=false;if(alive)setBusy(false);}}
    const timer=setInterval(()=>void tick(),15000);void tick();return()=>{alive=false;clearInterval(timer);};
  },[status?.enabled,status?.connected,error,open]);
  async function toggle(){setBusy(true);setError('');try{setStatus(await post<Status>('/organization',{enabled:!status?.enabled}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function undo(id:string){setBusy(true);setError('');try{await post(`/organization/${id}/undo`,{});await loadHistory();changed.current();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><button className="automation-trigger" onClick={()=>{setOpen(true);void refresh().catch(e=>setError(e.message));void loadHistory().catch(e=>setError(e.message));}}><Sparkles/><span>AI organization<small>{error?'Needs attention':busy?'Organizing…':status?.enabled?'Automatic':status?.connected?'Ready':'Connect a model'}</small></span></button>
    {open&&<Modal title="A little help staying organized" close={()=>setOpen(false)}><div className="automation-panel"><p>AI can label and summarize new or changed notes, and file unfiled notes into existing projects. Your text, manual labels, and chosen folders stay yours.</p>
      <div className="automation-status"><Sparkles/><div><b>{status?.connected?'Model connected':'No model connected yet'}</b><p>{status?.connected?`${status.pending.toLocaleString()} notes awaiting organization`:'You can already use an external agent through Workspace tools → Connect an agent.'}</p></div></div>
      {status?.connected?<><p className="muted">Automatic mode sends changed note text to the connected model while this workspace is open. It works through one note at a time.</p><button className="primary" onClick={()=>void toggle()} disabled={busy}>{busy?<LoaderCircle className="spin"/>:status.enabled?<Pause/>:<Play/>}{status.enabled?'Pause automatic organization':'Enable automatic organization'}</button></>:<details><summary>Connect the built-in model</summary><p>Set the server’s <code>OPENAI_API_KEY</code> and optional <code>AXIOMER_AI_MODEL</code> through your hosting settings. Keep the key on the server. Then reopen this panel.</p><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Open OpenAI API settings <ArrowUpRight/></a></details>}
      {error&&<p className="form-error" role="alert">{error} <button className="text-button" onClick={()=>{setError('');void refresh().catch(e=>setError(e.message));}}>Try again</button></p>}
      <h3>Organization history</h3>{!history.items.length&&<p className="muted">AI changes will appear here with an Undo button.</p>}{history.items.map(c=><article className="organization-change" key={c.id}><button className="text-button" onClick={()=>{onOpen(c.node_id);setOpen(false);}}>{c.title}</button><p>{c.after.details.abstract}</p><small>{JSON.parse(c.after.details.labels).join(' · ')||'No labels'}{JSON.stringify(c.before.destination)!==JSON.stringify(c.after.destination)?' · Filed in a project':''}</small><button className="text-button" disabled={busy||c.status==='undone'} onClick={()=>void undo(c.id)}><RotateCcw/>{c.status==='undone'?'Undone':'Undo'}</button></article>)}{history.nextCursor&&<button className="outline" onClick={()=>void loadHistory(history.nextCursor!).catch(e=>setError(e.message))}>More history</button>}
    </div></Modal>}
  </>;
}
