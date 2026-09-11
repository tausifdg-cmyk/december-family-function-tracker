import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const state={schemaVersion:3,config:{age:40,height:175,sex:'male',startWeight:89,goalWeight:80,goalDate:'2026-12-15',calories:2100,protein:170,steps:8000,water:3.5},weights:[],abdomen:[],pantWaist:[],nutrition:{},activity:{},workoutLog:{},theme:'dark',customFoods:[],workouts:[{name:'Full Body',focus:'Test',exercises:[['Bench Press',3,10,[10,10,10]]]}],profile:{name:'E2E User',email:'e2e@example.com',createdAt:new Date().toISOString(),coach:{plan:{profile:{goal:'fat_loss',days:1,steps:8000},metrics:{calories:2100,protein:170},training:[]}}}};

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of [{width:390,height:844},{width:412,height:915}]){
    const page=await browser.newPage({viewportSize:viewport});
    await page.addInitScript((payload)=>{
      localStorage.setItem('tausifTracker.accounts.v1',JSON.stringify([{id:'e2e',name:'E2E User',email:'e2e@example.com'}]));
      localStorage.setItem('tausifTracker.session.v1','e2e');
      localStorage.setItem('decemberTracker.v1.user.e2e',JSON.stringify(payload));
      localStorage.setItem('decemberTracker.v1',JSON.stringify(payload));
    },state);
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
    await page.waitForTimeout(700);
    assert.match(await page.title(),/MYBODY 2\.0/);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(overflow<=1,`horizontal overflow ${overflow}px at ${viewport.width}`);
    for(const tab of ['today','workout','food','progress','settings']){
      await page.locator(`#${tab}-tab`).click();
      await page.waitForTimeout(80);
      assert.equal(await page.locator(`#${tab}`).isVisible(),true,`${tab} should be visible`);
    }
    await page.locator('#today-tab').click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#experienceBrief').count(),1,'consolidated Today experience should render');
    assert.equal(await page.locator('#experienceBrief > .xp-coach-tools').count(),1,'Coach action toolbar should render');
    assert.equal(await page.locator('#experienceBrief > .xp-coach-tools button').count(),3,'Coach should show exactly three secondary actions');
    const labels=await page.locator('#experienceBrief > .xp-coach-tools button').allTextContents();
    assert.deepEqual(labels.map(x=>x.trim()),['View plan','Weekly review','Recalculate']);
    assert.equal(await page.locator('#experienceBrief .xp-coach > [data-xp-action="workout"]').count(),0,'duplicate workout CTA should be removed from Coach card');
    assert.equal(await page.locator('#today .today-workout-card [data-nav="workout"]').count(),1,'Featured workout should keep one Start workout CTA');
    assert.equal(await page.locator('#quickFoodLog').count(),1,'Today should include the quick food logger');
    const todayChildren=await page.locator('#today > section').evaluateAll((nodes)=>nodes.map((node)=>node.id||node.className));
    assert.ok(todayChildren.indexOf('quickFoodLog')<todayChildren.indexOf('experienceBrief'),'Quick food logger should appear before coaching cards');
    await page.locator('#quickFoodName').fill('Whey protein');
    await page.locator('#quickFoodName').press('Tab');
    await page.waitForTimeout(80);
    assert.equal(await page.locator('#quickFoodAmount').inputValue(),'30','Known foods should receive their default portion');
    assert.match(await page.locator('#quickFoodPreview').innerText(),/120 kcal/i,'Quick logger should preview calculated calories');
    await page.locator('#quickFoodSave').click();
    await page.waitForTimeout(120);
    assert.match(await page.locator('#scoreProtein').innerText(),/24(?:\.0)? \/ 115g/,'Quick food save should update Today protein');
    assert.equal(await page.locator('#quickRecentFoods button').count(),1,'Saved food should become a one-tap recent choice');
    assert.equal(await page.evaluate(()=>document.body.classList.contains('modal-open')),false,'Today should not be scroll locked without a modal');
    const scrollInfo=await page.evaluate(()=>({height:document.documentElement.scrollHeight,view:window.innerHeight}));
    if(scrollInfo.height>scrollInfo.view+100){
      await page.evaluate(()=>window.scrollTo(0,Math.min(600,document.documentElement.scrollHeight-window.innerHeight)));
      await page.waitForTimeout(120);
      assert.ok(await page.evaluate(()=>window.scrollY)>50,'Today should scroll vertically on mobile');
      await page.evaluate(()=>window.scrollTo(0,0));
    }
    await page.locator('#workout-tab').click();
    assert.equal(await page.locator('#dayPicker').count(),1,'workout day selector should exist');
    await page.locator('#food-tab').click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#experienceFoodTools').count(),1,'fast food tools should render');
    await page.locator('#progress-tab').click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#experienceJourney').count(),1,'Journey should render');
    await page.close();
  }
  console.log('MYBODY browser E2E passed');
} finally {
  await browser.close();
}
