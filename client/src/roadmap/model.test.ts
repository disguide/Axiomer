import { describe, expect, it } from 'vitest';
import { addThought, approveSuggestion, connectThought, diffRoadmaps, emptyGraph, exampleGraph, importRoadmap, indexGraph, layoutRoadmap, parseSuggestions, rejectSuggestion, removeThought, validateRoadmap, type Roadmap } from './model';
import { readDrafts, STORAGE_KEY } from './storage';

describe('value-first roadmaps', () => {
  it('allows a value to lead to unclassified reasons and several branches', () => {
    let g=addThought(emptyGraph(),'Reduce suffering',null,'value','root');
    g=addThought(g,'Consider consequences','root',null,'a');
    g=addThought(g,'Protect rights','root',null,'b');
    g=addThought(g,'Choose an action','a',null,'c');
    expect(g.anchor).toBe('root');expect(g.nodes[1].kind).toBeNull();
    expect(indexGraph(g).children.get('root')).toEqual(['a','b']);
    g=connectThought(g,'b','c');
    expect(indexGraph(g).parents.get('c')).toEqual(['a','b']);
    expect(()=>connectThought(g,'c','root')).toThrow('loop');
    expect(g.edges).toHaveLength(4);
  });
  it('walks and lays out a deep 2,000-node map without recursive traversal', () => {
    const g:Roadmap={schema:2,anchor:'0',nodes:Array.from({length:2000},(_,i)=>({id:String(i),text:`Reason ${i}`,kind:null})),edges:Array.from({length:1999},(_,i)=>({id:`e${i}`,from:String(i),to:String(i+1),label:''}))};
    const positions=layoutRoadmap(validateRoadmap(g));
    expect(indexGraph(g).order).toHaveLength(2000);
    expect(positions.get('1999')!.y).toBe(1999*160);
  });
  it('removes only the selected thought while keeping other branches',()=>{
    const g=exampleGraph();const n=removeThought(g,'r');
    expect(n.nodes).toHaveLength(g.nodes.length-1);
    expect(n.nodes.some(n=>n.id==='d')).toBe(true);
    expect(n.edges.some(e=>e.from==='r'||e.to==='r')).toBe(false);
  });
  it('rejects duplicate IDs, missing anchors and broken links',()=>{
    const g=exampleGraph();
    expect(()=>validateRoadmap({...g,nodes:[...g.nodes,g.nodes[0]]})).toThrow('Duplicate');
    expect(()=>validateRoadmap({...g,anchor:'missing'})).toThrow('Starting');
    expect(()=>validateRoadmap({...g,edges:[...g.edges,{id:'bad',from:'v',to:'missing',label:''}]})).toThrow('missing');
  });
  it('imports old graphs with the exact original connection semantics retained',()=>{
    const legacy={nodes:[{id:'v',type:'value',content:'Care'},{id:'r',type:'support',content:'Reason'},{id:'c',type:'claim',content:'Position'}],edges:[{id:'a',from:'r',to:'v',edgeType:'grounds'},{id:'b',from:'r',to:'c',edgeType:'supports'}]};
    const g=importRoadmap(legacy);
    expect(g.anchor).toBe('v');
    expect(g.edges[0]).toMatchObject({from:'v',to:'r',semantic:legacy.edges[0]&&{from:'r',to:'v',type:'grounds'}});
    expect(g.edges[1].semantic).toEqual({from:'r',to:'c',type:'supports'});
    expect(legacy.nodes[0]).toEqual({id:'v',type:'value',content:'Care'});
  });
  it('compares content and connections by stable identity',()=>{
    const before=exampleGraph(), after=addThought({...before,nodes:before.nodes.map(n=>n.id==='a'?{...n,text:'Changed reason'}:n)},'New branch','r',null,'new');
    const d=diffRoadmaps(before,after);
    expect(d.edited[0].after.id).toBe('a');expect(d.added[0].id).toBe('new');expect(d.connectionsAdded).toHaveLength(1);
  });
});

describe('AI proposals and recovery',()=>{
  const step=(id:string,parentId:string|null)=>({id,parentId,text:`Proposed ${id}`,kind:null,rationale:'Follows the previous thought',excerpt:''});
  it('approves exactly once and rejects dependent suggestions without touching the map',()=>{
    const g=exampleGraph();const steps=parseSuggestions({steps:[step('one','v'),step('two','one'),step('independent','r')]},g);
    const accepted=approveSuggestion(g,steps[0]);
    expect(()=>approveSuggestion(accepted,steps[0])).toThrow('already');
    expect(()=>approveSuggestion(g,steps[1])).toThrow('existing');
    const rejected=rejectSuggestion(steps,'one');
    expect(rejected.map(s=>s.status)).toEqual(['rejected','blocked','pending']);
    expect(g.nodes).toHaveLength(7);
  });
  it('rejects fabricated parent references and reused IDs',()=>{
    expect(()=>parseSuggestions({steps:[step('new','invented')]},exampleGraph())).toThrow('parent');
    expect(()=>parseSuggestions({steps:[step('v',null)]},exampleGraph())).toThrow('reused');
  });
  it('recovers unclassified work and the review queue from the same snapshot',()=>{
    const g=exampleGraph(),draft={id:'draft',title:'Private',graph:g,updated:'now'};
    const queue={draftId:'draft',steps:parseSuggestions({steps:[step('one','v')]},g)};
    const recovered=readDrafts({getItem:k=>k===STORAGE_KEY?JSON.stringify({drafts:[draft],queue}):null});
    expect(recovered.error).toBeNull();expect(recovered.queue?.steps[0].status).toBe('pending');expect(recovered.drafts[0].graph.nodes[2].kind).toBeNull();
  });
  it('reports corrupt data without replacing it with a successful empty library',()=>{
    const r=readDrafts({getItem:()=>'{broken'});expect(r.error).toContain('not been overwritten');
    const invalid=readDrafts({getItem:()=>JSON.stringify([{id:'x',title:'x',updated:'now',graph:{}}])});expect(invalid.error).not.toBeNull();
  });
});
