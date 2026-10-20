import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.TC_TEST_WEB||'http://127.0.0.1:5890';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const checks=[];
async function waitReady(){await page.locator('#__app-loading__').waitFor({state:'hidden',timeout:15000});}
async function login(username,password){
 await page.goto(base+'/auth/login',{waitUntil:'networkidle'});await waitReady();
 await page.getByLabel('用户名',{exact:true}).fill(username);
 await page.getByLabel('密码',{exact:true}).fill(password);
 await page.getByRole('button',{name:/进入 TechCompare/}).click();
 await page.waitForURL('**/home');
 await page.waitForFunction(()=>document.querySelectorAll('.category-card').length>0);
}
try{
 await login('user','user123');
 assert.equal(await page.locator('.category-card').count(),5);
 assert.equal(await page.locator('.category-card .device-icon').count(),5);
 assert.equal(await page.locator('.analysis-carousel').count(),1);
 const carouselBefore=await page.locator('.carousel-copy h2').innerText();
 await page.waitForTimeout(9000);
 const carouselAfter=await page.locator('.carousel-copy h2').innerText();
 assert.notEqual(carouselBefore,carouselAfter);
 await page.getByRole('button',{name:'下一张分析视图'}).click();
 checks.push('internal analysis carousel mounts, autoplays and supports controls');
 assert(!(await page.locator('body').innerText()).includes('购买'));
 assert(!(await page.locator('body').innerText()).includes('+12%'));
 await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(250);
 await page.screenshot({path:'review/home-desktop.png',fullPage:true});
 checks.push('homepage real dataset counts, internal wording and five explicit device icons');
 await page.locator('.category-card').filter({hasText:'旗舰手机'}).click();
 await page.waitForURL('**/power/phones');
 await page.getByRole('button',{name:'选择筛选结果',exact:true}).click();
 await page.locator('.chart-content canvas').first().waitFor();
 await page.locator('.raw-values summary').first().click();
 assert((await page.locator('.raw-values table tbody tr').count())>=2);
 await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(250);
 await page.screenshot({path:'review/power-desktop.png',fullPage:true});
 checks.push('category opens power analysis directly; records, charts and raw values render');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'导出当前对象 CSV',exact:true}).click();
 const download=await downloadPromise;
 await download.saveAs('review/export-verified.csv');
 checks.push('selected measurement export');
 await page.getByRole('button',{name:'设备参数对照 →',exact:true}).click();
 await page.waitForURL('**/compare/phones**');
 await page.locator('.comparison-table').waitFor();
 await page.getByLabel('仅显示差异参数').check();
 await page.getByRole('button',{name:/进入功耗对比/}).click();
 await page.waitForURL('**/power/phones**');
 await page.locator('.chart-content canvas').first().waitFor();
 checks.push('selection persists between parameter and power views');
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(200);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'mobile overflow');
 await page.getByRole('button',{name:'展开或收起导航'}).click();
 await page.locator('.mobile-logout').click();
 await page.waitForURL('**/auth/login');
 checks.push('mobile charts resize, no page overflow, logout remains accessible');
 await login('admin','admin123');
 await page.goto(base+'/config',{waitUntil:'networkidle'});await waitReady();
 await page.locator('input[type=file]').first().setInputFiles('public/gh.xlsx');
 await page.getByRole('button',{name:'校验并预览',exact:true}).click();
 await page.locator('.import-preview').waitFor();
 assert((await page.locator('.import-preview tbody tr').count())>=5);
 await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(250);
 await page.screenshot({path:'review/config-mobile.png',fullPage:true});
 checks.push('management imports show a real preflight checklist on mobile');
 // Synthetic fixtures are confined to browser interception; no database mutations.
 const config={key:'phones',name:'旗舰手机',info:{fields:['brand','model'],cnFields:['品牌','型号']},power:{chartConfig:[
  {order:1,scenario:'使用功耗',chartType:'bar',fields:['usage','idle'],labels:['使用','待机'],unit:'mW'},
  {order:2,scenario:'持续时间',chartType:'line',fields:['duration'],labels:['持续时间'],unit:'h'},
 ]}};
 await page.route('**/api/categories',route=>route.fulfill({json:{success:true,data:[config]}}));
 await page.route('**/api/phones/power',route=>route.fulfill({json:{success:true,data:[
  {id:1,brand:'A',model:'同名设备',usage:0,idle:null,duration:10},
  {id:2,brand:'B',model:'同名设备',usage:25,idle:'N/A',duration:12},
 ],headerRows:[]}}));
 const selected=encodeURIComponent(JSON.stringify([{id:2,brand:'B',model:'同名设备'}]));
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/power/phones?samples='+selected,{waitUntil:'networkidle'});await waitReady();
 assert.equal(await page.locator('.sample-button.selected').count(),1);
 assert((await page.locator('.sample-button.selected').innerText()).includes('B'));
 await page.getByRole('button',{name:'选择筛选结果',exact:true}).click();
 await page.locator('.raw-values summary').first().click();
 assert((await page.locator('.raw-values table').first().innerText()).includes('0'));
 assert((await page.locator('.raw-values table').first().innerText()).includes('—'));
 assert.equal(await page.locator('.measurement-chart .chart-heading span').allTextContents().then(v=>v.join(',')),'mW,h');
 assert(!(await page.locator('body').innerText()).includes('测试结论'));
 await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(250);
 await page.screenshot({path:'review/measurements-zero-missing.png',fullPage:true});
 checks.push('brand identity, zero, missing values and scenario-specific units');
 await page.getByRole('button',{name:'清空',exact:true}).click();
 assert.equal(await page.locator('.chart-content canvas').count(),0);
 checks.push('clearing selection disposes chart DOM');
 await page.route('**/api/overview',route=>route.fulfill({status:503,json:{success:false,message:'测试：服务不可用'}}));
 await page.goto(base+'/home',{waitUntil:'networkidle'});await waitReady();
 await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('.category-card').count(),0);
 assert((await page.locator('.metrics-strip').innerText()).includes('连接失败'));
 assert((await page.locator('.metrics-strip').innerText()).includes('—'));
 checks.push('offline home shows error/retry and no fabricated dataset');
 assert.deepEqual(errors,[]);
 const result={passed:checks.length,checks,pageErrors:errors};
 console.log(JSON.stringify(result,null,2));
 await fs.writeFile('review/browser-test-results.json',JSON.stringify(result,null,2));
}finally{await browser.close();}

