const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../volunteer.js'),'utf8').replace(/^import[^\n]+\n/,'');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(){
 const {sessions}=await import('../volunteer-sessions.mjs');
 const elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{value:'',hidden:false,children:[],handlers:{},textContent:'',append(child){this.children.push(child);if(!this.value&&child.value)this.value=child.value;},replaceChildren(){this.children=[];this.value='';},addEventListener(name,fn){this.handlers[name]=fn;},click(){this.handlers.click?.();}});return elements.get(id);}
 let signedIn=true;let resolveRecords;const calls=[];const listeners={};
 const window={location:{hash:'#volunteer'},addEventListener(name,fn){listeners[name]=fn;},musicAngelsAuth:{getSession:async()=>({data:{session:signedIn?{user:{id:'a'}}:null}}),rpc:async(name,args)=>{calls.push({name,args});if(args.operation==='me')return {data:{locations:[{location_code:'main',display_name:'Main',time_zone:'America/Los_Angeles',linked:true}]}};if(args.operation==='link')return {data:{status:'linked'}};return new Promise(r=>{resolveRecords=r;});}}};
 vm.runInNewContext(source,{window,document:{getElementById:element,createElement:()=>({children:[],append(child){this.children.push(child);}})},URLSearchParams,Intl,Date,Error,sessions,setTimeout,clearTimeout});
 await flush();await flush();
 return {element,calls,listeners,signout(){signedIn=false;listeners['music-angels-auth']();},finish(response){resolveRecords(response || {data:{status:'linked',time_zone:'America/Los_Angeles',events:[{id:'1',location_code:'main',member_id:'a',timestamp:'2026-07-01T17:00:00Z',type:'checkIn',activity_name:'Music'},{id:'2',location_code:'main',member_id:'a',timestamp:'2026-07-01T18:30:00Z',type:'checkOut'}]}});}};
}
test('page calls authenticated Supabase RPC without a Worker and renders personal hours',async()=>{
 const ui=await setup();assert.equal(ui.calls[0].name,'volunteer_portal');assert.equal(ui.calls[1].args.operation,'records');
 ui.finish();await flush();assert.equal(ui.element('volunteer-rows').children.length,1);assert.match(ui.element('volunteer-summary').textContent,/1h 30m/);
 ui.signout();await flush();assert.equal(ui.element('volunteer-rows').children.length,0);assert.equal(ui.element('volunteer-filters').hidden,true);
});
test('sign-out during an in-flight request prevents private rows from reappearing',async()=>{
 const ui=await setup();ui.signout();ui.finish();await flush();assert.equal(ui.element('volunteer-rows').children.length,0);assert.equal(ui.element('volunteer-table').hidden,true);
});

test('Supabase error codes and messages are shown instead of an empty page',async()=>{
 const ui=await setup();
 ui.finish({error:{code:'PGRST202',message:'Could not find the function public.volunteer_portal'},status:404});
 await flush();
 assert.match(ui.element('volunteer-status').textContent,/PGRST202/);
 assert.match(ui.element('volunteer-status').textContent,/Could not find the function/);
 assert.equal(ui.element('volunteer-table').hidden,true);
});
