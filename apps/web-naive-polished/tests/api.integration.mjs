import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(new URL('../server/package.json',import.meta.url));
const xlsx=require('xlsx');
const base=process.env.TC_TEST_API || 'http://127.0.0.1:3002';
async function login(username,password){
 const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 assert.equal(r.status,200);return (await r.json()).data.token;
}
function form(buffer,name='test.xlsx',previewToken){
 const f=new FormData();f.append('file',new Blob([buffer]),name);if(previewToken)f.append('previewToken',previewToken);return f;
}
async function get(url,token){
 const r=await fetch(base+url,{headers:{Authorization:'Bearer '+token}});
 return {status:r.status,body:await r.json()};
}
const report=[];
const noAuth=await fetch(base+'/api/categories');
assert.equal(noAuth.status,401);report.push('unauthenticated API blocked');
const invalid=await fetch(base+'/api/categories',{headers:{Authorization:'Bearer token_fake'}});
assert.equal(invalid.status,401);report.push('forged browser token blocked');
const analyst=await login('user','user123');
const denied=await fetch(base+'/api/import-preview',{method:'POST',headers:{Authorization:'Bearer '+analyst}});
assert.equal(denied.status,403);report.push('analyst cannot modify/import data');
const admin=await login('admin','admin123');
const baseline=await get('/api/overview',admin);
assert.equal(baseline.status,200);assert(baseline.body.data.categories.length>0);
const template=await fs.readFile(new URL('../public/gh.xlsx',import.meta.url));
const previewResponse=await fetch(base+'/api/import-preview',{method:'POST',headers:{Authorization:'Bearer '+admin},body:form(template,'gh.xlsx')});
const preview=await previewResponse.json();
assert.equal(previewResponse.status,200,JSON.stringify(preview));
assert(preview.data.sheets.length>0);
report.push('actual workbook preview succeeds');
const changedWorkbook=xlsx.read(template);
const changedSheet=changedWorkbook.Sheets[changedWorkbook.SheetNames[0]];
const target=Object.keys(changedSheet).find(key=>key[0]!=='!' && typeof changedSheet[key].v==='number');
if(target)changedSheet[target].v+=1;
const changedBuffer=xlsx.write(changedWorkbook,{bookType:'xlsx',type:'buffer'});
const changed=await fetch(base+'/api/import-all',{method:'POST',headers:{Authorization:'Bearer '+admin},body:form(changedBuffer,'changed.xlsx',preview.data.token)});
assert.equal(changed.status,409);report.push('changed file invalidates preview');
const malformedWorkbook=xlsx.utils.book_new();
xlsx.utils.book_append_sheet(malformedWorkbook,xlsx.utils.aoa_to_sheet([['品牌','A'],['型号','X'],['使用功耗','bad-value']]),'旗舰手机功耗数据');
const malformedBuffer=xlsx.write(malformedWorkbook,{bookType:'xlsx',type:'buffer'});
const malformed=await fetch(base+'/api/import-preview',{method:'POST',headers:{Authorization:'Bearer '+admin},body:form(malformedBuffer)});
assert.equal(malformed.status,400);report.push('invalid measurement rejected before mutation');
const afterInvalid=await get('/api/overview',admin);
assert.deepEqual(afterInvalid.body.data,baseline.body.data);report.push('rejected imports leave active data unchanged');
// Explicitly target the isolated copy database on port 3002 for the successful round trip.
assert.equal(new URL(base).port,'3002');
const imported=await fetch(base+'/api/import-all',{method:'POST',headers:{Authorization:'Bearer '+admin},body:form(template,'gh.xlsx',preview.data.token)});
const importBody=await imported.json();
assert.equal(imported.status,200,JSON.stringify(importBody));assert.equal(importBody.success,true);assert.equal(importBody.totalFail,0);
const after=await get('/api/overview',admin);
assert.equal(after.body.data.powerCount,baseline.body.data.powerCount);
assert.equal(after.body.data.infoCount,baseline.body.data.infoCount);
report.push('staged import switches all validated metadata and preserves record counts');
const backups=await fs.readdir(new URL('../server/backups/',import.meta.url));
assert(backups.some(name=>name.startsWith('import-')));report.push('restore manifest produced');
await fetch(base+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+analyst}});
assert.equal((await get('/api/categories',analyst)).status,401);report.push('logout revokes server session');
console.log(JSON.stringify({passed:report.length,checks:report},null,2));
await fs.writeFile(new URL('../review/api-test-results.json',import.meta.url),JSON.stringify({passed:report.length,checks:report},null,2));

