import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sessions,reportPeriod} from '../volunteer-sessions.mjs';
const zone='America/Los_Angeles';
const e=(id,time,type,extra={})=>({id,timestamp:time,type,member_id:'a',location_code:'main',...extra});
const at=(id,time,type,extra)=>e(id,`2026-07-01T${time}:00Z`,type,extra);
test('normal, repeated check-in, open, and orphan events',()=>{
 const rows=sessions([at('0','08:00','checkOut'),at('1','09:00','checkIn'),at('2','10:00','checkIn'),at('3','11:00','checkOut'),at('4','12:00','checkIn')],zone);
 assert.equal(rows.reduce((n,r)=>n+r.seconds,0),3600);
 assert.equal(rows.filter(r=>r.status==='open').length,2);
 assert.equal(rows.filter(r=>r.status==='unmatched_checkout').length,1);
 assert.equal(sessions([at('1','09:00','checkIn'),at('2','11:30','checkOut')],zone)[0].seconds,9000);
});
test('events never pair across locations or members',()=>{
 assert.equal(sessions([at('1','09:00','checkIn'),at('2','10:00','checkOut',{member_id:'other'}),at('3','11:00','checkOut',{location_code:'other'})],zone).reduce((n,r)=>n+r.seconds,0),0);
});
test('DST elapsed durations, midnight attribution and reporting boundaries',()=>{
 assert.equal(sessions([e('1','2026-03-08T09:30:00Z','checkIn'),e('2','2026-03-08T10:30:00Z','checkOut')],zone)[0].seconds,3600);
 const row=sessions([e('1','2026-07-02T06:30:00Z','checkIn'),e('2','2026-07-02T07:30:00Z','checkOut')],zone)[0];
 assert.equal(row.date,'2026-07-01');assert.equal(row.seconds,3600);
 assert.deepEqual(reportPeriod(zone,new Date('2026-06-01T06:59:00Z')),{from:'2025-06-01',to:'2026-05-31'});
 assert.equal(reportPeriod(zone,new Date('2026-06-01T07:00:00Z')).from,'2026-06-01');
});
test('seconds sum before rounding, null-only activity fallback, stable tied events',()=>{
 const rows=sessions([e('1','2026-07-01T09:00:00Z','checkIn'),e('2','2026-07-01T09:00:59Z','checkOut',{activity_name:'Music'}),e('3','2026-07-01T10:00:00Z','checkIn',{activity_name:''}),e('4','2026-07-01T10:00:59Z','checkOut',{activity_name:'Music'})],zone);
 assert.equal(Math.floor(rows.reduce((n,r)=>n+r.seconds,0)/60),1);
 assert.equal(rows.find(r=>r.id==='1').activity,'Music');assert.equal(rows.find(r=>r.id==='3').activity,'Attendance');
 const tied=sessions([at('2','09:00','checkOut'),at('1','09:00','checkIn')],zone);
 assert.equal(tied[0].review_required,true);assert.equal(tied[0].status,'complete');
});
