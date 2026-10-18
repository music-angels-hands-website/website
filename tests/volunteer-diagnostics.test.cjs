const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
test('visible alert includes error code and retry while redacting sensitive values',()=>{
 const elements=new Map();const handlers={};let watchdog;
 const get=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',addEventListener(name,fn){this[name]=fn;}});return elements.get(id);};
 const window={location:{hash:'#volunteer'},addEventListener(name,fn){handlers[name]=fn;},dispatchEvent(event){this.lastEvent=event.type;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../volunteer-diagnostics.js'),'utf8'),{window,document:{getElementById:get},Event:class{constructor(type){this.type=type;}},setTimeout(fn){watchdog=fn;}});
 window.musicAngelsVolunteerError({code:'PGRST202',status:404,message:'Missing function for someone@example.com at https://example.test/private',hint:'Reload schema cache.'},'Loading records');
 assert.equal(get('volunteer-error').hidden,false);
 assert.match(get('volunteer-error-details').textContent,/PGRST202/);
 assert.match(get('volunteer-error-details').textContent,/HTTP status: 404/);
 assert.doesNotMatch(get('volunteer-error-details').textContent,/someone@example.com|example.test/);
 get('volunteer-retry').click();assert.equal(window.lastEvent,'volunteer-retry');
 watchdog();assert.match(get('volunteer-error-details').textContent,/PAGE_NOT_READY/);
});
