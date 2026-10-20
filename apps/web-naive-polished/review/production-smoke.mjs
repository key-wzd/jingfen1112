import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5891/#/auth/login',{waitUntil:'networkidle'});
 await page.locator('#__app-loading__').waitFor({state:'hidden'});
 await page.getByLabel('用户名',{exact:true}).fill('user');
 await page.getByLabel('密码',{exact:true}).fill('user123');
 await page.getByRole('button',{name:/进入 TechCompare/}).click();
 await page.waitForURL('**/#/home');
 await page.waitForFunction(()=>document.querySelectorAll('.category-card').length===5);
 await page.waitForTimeout(350);
 await page.locator('#categories').screenshot({path:'review/category-icons.png'});
 await page.screenshot({path:'review/production-home.png',fullPage:true});
 const result={productionLogin:true,categories:await page.locator('.category-card').count(),pageErrors:errors};
 if(errors.length)throw Error(errors.join('\n'));
 await fs.writeFile('review/production-smoke.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await browser.close();}
