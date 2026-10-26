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
async function ask(question){
 const response=await fetch(base+'/api/ai/ask',{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'application/json'},body:JSON.stringify({question})});
 return {status:response.status,body:await response.json()};
}
const overallPower=await ask('旗舰手机综合功耗谁更高？');
assert.equal(overallPower.status,200,JSON.stringify(overallPower.body));
assert.match(overallPower.body.data.answer,/功耗最高|功耗都比|更高/);
assert(overallPower.body.data.citations.length>0);
const scenePower=await ask('按待机功耗谁最好？');
assert.equal(scenePower.status,200,JSON.stringify(scenePower.body));
assert.match(scenePower.body.data.answer,/待机|省电|功耗/);
assert(scenePower.body.data.citations.length>0);
report.push('assistant ranks comprehensive power and filters by a requested scenario');
const template=await fs.readFile(new URL('../public/gh.xlsx',import.meta.url));
const previewResponse=await fetch(base+'/api/import-preview',{method:'POST',headers:{Authorization:'Bearer '+admin},body:form(template,'gh.xlsx')});
const preview=await previewResponse.json();
assert.equal(previewResponse.status,200,JSON.stringify(preview));
assert(preview.data.sheets.length>0);
report.push('actual workbook preview succeeds');
const placeholderWorkbook=xlsx.utils.book_new();
xlsx.utils.book_append_sheet(placeholderWorkbook,xlsx.utils.aoa_to_sheet([
 ['品牌','A','B','C','D','E','F','G','H','I','J'],
 ['型号','slash','spaced-slash','wide-slash','zero','blank','dash','em-dash','na','n-a','number'],
 ['使用功耗','/',' / ','／',0,'','-','—','NA','N/A','1,250.5'],
]),'旗舰手机功耗数据');
const placeholderBuffer=xlsx.write(placeholderWorkbook,{bookType:'xlsx',type:'buffer'});
const placeholders=await fetch(base+'/api/import-preview',{method:'POST',headers:{Authorization:'Bearer '+admin},body:form(placeholderBuffer)});
const placeholderPreview=await placeholders.json();
assert.equal(placeholders.status,200,JSON.stringify(placeholderPreview));
assert.equal(placeholderPreview.data.sheets[0].rows,10);
report.push('slash placeholders, existing missing markers and real numbers pass preview');
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
// Explicitly target the isolated AI copy database on port 3004 for the successful round trip.
assert.equal(new URL(base).port,'3004');
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
await fs.mkdir(new URL('../review/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../review/api-test-results.json',import.meta.url),JSON.stringify({passed:report.length,checks:report},null,2));

