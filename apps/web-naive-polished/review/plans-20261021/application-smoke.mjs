import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:3102';
const created=[];
async function request(path,token,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};}
try{
 const user=await request('/api/auth/login',null,'POST',{username:'user',password:'user123'});
 const admin=await request('/api/auth/login',null,'POST',{username:'admin',password:'admin123'});
 assert.equal(user.status,200);assert.equal(admin.status,200);
 const categories=await request('/api/categories',user.data.token);
 const category=categories.data.find(c=>c.power)?.key;assert(category);
 const measurements=await request('/api/'+category+'/power',user.data.token);assert(measurements.datasetVersion);assert(measurements.data.length);
 const ids=measurements.data.slice(0,2).map(row=>row.id);
 const name='__plan_verification_'+Date.now();
 for(const account of [user.data,admin.data]){
  const result=await request('/api/analysis-plans',account.token,'POST',{name,category,datasetVersion:measurements.datasetVersion,selectedIds:ids,baselineId:ids[0],hiddenByRow:{}});
  assert.equal(result.status,200,JSON.stringify(result));created.push({id:result.data.id,token:account.token});
  assert.equal(result.data.visibility,account.role==='admin'?'shared':'private');
 }
 const userList=await request('/api/analysis-plans?category='+category,user.data.token);
 assert(userList.data.plans.some(p=>p.id===created[0].id));assert(userList.data.plans.some(p=>p.id===created[1].id));
 assert.equal((await request('/api/analysis-plans/'+created[0].id,admin.data.token)).status,404);
 const report={actualApplication:true,accountScopedPlans:true,adminSharedPlan:true,privatePlanHiddenFromAdmin:true,selectedRecords:ids.length};
 console.log(JSON.stringify(report));await fs.writeFile('review/plans-20261021/application-smoke.json',JSON.stringify(report,null,2));
}finally{for(const plan of created)await request('/api/analysis-plans/'+plan.id,plan.token,'DELETE');}
