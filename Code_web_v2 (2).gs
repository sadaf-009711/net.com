/**
 * Net Manager ISP - Web demo (Google Apps Script) - English + Urdu
 * Chrome page: Owner (voice/text), Technician (Done button), Customer (complaint).
 *
 * Script Properties (Project Settings > Script properties):
 *   GEMINI_KEY = aistudio.google.com ki API key
 *   SHEET_ID   = Google Sheet ke link mein /d/ aur /edit ke beech wala hissa
 *   OWNER_PIN  = owner ka PIN (jaise 1234)
 *   TECH_PIN   = technician ka PIN (optional, na ho to sirf OWNER_PIN chalega)
 *   GEMINI_MODEL = optional
 */
const DEFAULT_MODEL = 'gemini-2.5-flash';
const CATEGORIES = 'Slow speed, No internet, Billing, Router/WiFi, Repair, Router change, New connection, Shifting, Other';

// ---------- Zabanein (en / ur) ----------
const STR = {
  en: {
    pay_need: 'Name or amount not clear. Please say it again, e.g. "Ali paid 1000".',
    no_cust: 'This customer was not found in the sheet.',
    pay_ok: '✅ Payment recorded (Rs {amt}).',
    name_unclear: 'Customer name not clear. Please say it again.',
    req_owner: '✅ {name}: {type} recorded.\nID: {id}\nIt will show on the technician page.',
    not_understood: 'I did not understand. Say a payment, a balance, a report or a complaint.',
    ph_notfound: 'This number is not in our records. Please contact the shop.',
    cust_req: 'Hello {name}, your {kind} has been recorded.\nID: {id}\nThe technician has been informed.',
    cust_unknown: 'Please tell us your problem again, e.g. "my internet is slow".',
    latest: 'Your latest request {id} ({cat}) is: {status}.',
    latest_none: 'You have no requests on record.',
    bill_none: 'No bill found for {month}.',
    bill: '{name} ({month})\nTotal bill: Rs {total}\nPaid: Rs {paid}\nPending: Rs {pending}\nDue date: {due}\nStatus: {icon} {status}',
    report: 'Summary {month}\nBilled: Rs {billed}\nReceived: Rs {got}\nPending: Rs {pend}\n\nNot paid yet:\n{lines}',
    all_paid: 'Everyone has paid 🎉',
    open_hdr: 'Open requests:',
    open_none: 'No open requests, everything is done.',
    done_ok: '✅ {id} marked Done.',
    done_already: 'This is already Done.',
    req_nf: 'Request not found.',
    wrong_pin: 'Wrong PIN.',
    pin_unset: 'OWNER_PIN is not set in Script properties.',
    t_Complaint: 'complaint', t_Technician: 'technician request', k_Complaint: 'complaint', k_Technician: 'request',
    s_Paid: 'Paid', s_Due: 'Due', s_Overdue: 'Overdue', r_Open: 'Open', r_Done: 'Done'
  },
  ur: {
    pay_need: 'نام یا رقم واضح نہیں ملی۔ دوبارہ بولیں، جیسے "علی نے 1000 دیے"۔',
    no_cust: 'یہ کسٹمر شیٹ میں نہیں ملا۔',
    pay_ok: '✅ ادائیگی درج ہو گئی (Rs {amt})۔',
    name_unclear: 'کسٹمر کا نام واضح نہیں ملا۔ دوبارہ بولیں۔',
    req_owner: '✅ {name}: {type} درج ہو گئی۔\nآئی ڈی: {id}\nٹیکنیشن کے صفحے پر نظر آ جائے گی۔',
    not_understood: 'سمجھ نہیں آیا۔ ادائیگی، بیلنس، رپورٹ یا شکایت بولیں۔',
    ph_notfound: 'یہ نمبر ہمارے ریکارڈ میں نہیں ملا۔ دکان سے رابطہ کریں۔',
    cust_req: 'جی {name}، آپ کی {kind} درج ہو گئی ہے۔\nآئی ڈی: {id}\nٹیکنیشن کو اطلاع کر دی گئی ہے۔',
    cust_unknown: 'مہربانی کر کے اپنا مسئلہ دوبارہ بتائیں، جیسے "میرا انٹرنیٹ سلو ہے"۔',
    latest: 'آپ کی آخری درخواست {id} ({cat}) کی حالت: {status}۔',
    latest_none: 'آپ کی کوئی درخواست درج نہیں ہے۔',
    bill_none: '{month} کا بل نہیں ملا۔',
    bill: '{name} ({month})\nکل بل: Rs {total}\nادا کیے: Rs {paid}\nباقی: Rs {pending}\nآخری تاریخ: {due}\nحالت: {icon} {status}',
    report: 'خلاصہ {month}\nبل: Rs {billed}\nوصولی: Rs {got}\nباقی: Rs {pend}\n\nجنہوں نے ادا نہیں کیا:\n{lines}',
    all_paid: 'سب نے ادا کر دیا 🎉',
    open_hdr: 'کھلی درخواستیں:',
    open_none: 'کوئی درخواست کھلی نہیں، سب مکمل ہیں۔',
    done_ok: '✅ {id} مکمل ہو گئی۔',
    done_already: 'یہ پہلے سے مکمل ہے۔',
    req_nf: 'درخواست نہیں ملی۔',
    wrong_pin: 'پن غلط ہے۔',
    pin_unset: 'OWNER_PIN اسکرپٹ پراپرٹیز میں نہیں ڈالا گیا۔',
    t_Complaint: 'شکایت', t_Technician: 'ٹیکنیشن کی درخواست', k_Complaint: 'شکایت', k_Technician: 'درخواست',
    s_Paid: 'ادا شدہ', s_Due: 'واجب', s_Overdue: 'مدت گزر گئی', r_Open: 'کھلی', r_Done: 'مکمل'
  }
};
function lg_(l){ return l==='ur'?'ur':'en'; }
function t_(l,key,vars){
  let s=(STR[lg_(l)][key]!==undefined)?STR[lg_(l)][key]:(STR.en[key]!==undefined?STR.en[key]:key);
  for(const k in (vars||{})) s=s.split('{'+k+'}').join(String(vars[k]));
  return s;
}

function prop_(k){ return PropertiesService.getScriptProperties().getProperty(k); }
function ss_(){ return SpreadsheetApp.openById(prop_('SHEET_ID')); }
function tz_(){ return Session.getScriptTimeZone(); }
function digits_(s){ return String(s||'').replace(/\D/g,'').slice(-10); }
function currentMonth_(){ return ss_().getSheetByName('Settings').getRange('B4').getDisplayValue(); }

function doGet(){
  return HtmlService.createHtmlOutput(HTML_)
    .setTitle('Net Manager ISP')
    .addMetaTag('viewport','width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---------- PIN ----------
function auth_(pin,ownerOnly,lang){
  const o=prop_('OWNER_PIN'), t=prop_('TECH_PIN');
  const p=String(pin||'');
  if(!o) throw new Error(t_(lang,'pin_unset'));
  if(p===o) return;
  if(!ownerOnly && t && p===t) return;
  throw new Error(t_(lang,'wrong_pin'));
}

// ---------- Sheet se data ----------
function customers_(){
  const v=ss_().getSheetByName('Customers').getDataRange().getValues(); const out=[];
  for(let i=1;i<v.length;i++){
    if(!v[i][0]) continue;
    out.push({id:String(v[i][0]),name:String(v[i][1]),phone:String(v[i][2]),address:String(v[i][3])});
  }
  return out;
}
function custById_(id){
  const l=customers_();
  for(let i=0;i<l.length;i++){ if(l[i].id===id) return l[i]; }
  return null;
}
function custByPhone_(ph){
  const d=digits_(ph); if(!d) return null;
  const l=customers_();
  for(let i=0;i<l.length;i++){ if(digits_(l[i].phone)===d) return l[i]; }
  return null;
}
function employees_(){
  const sh=ss_().getSheetByName('Employees');
  if(!sh) return [];
  const v=sh.getDataRange().getValues(); const out=[];
  for(let i=1;i<v.length;i++){ if(v[i][0]) out.push({name:String(v[i][0]),role:String(v[i][2]||'')}); }
  return out;
}

// ---------- Gemini (text) ----------
function gemini_(prompt,text){
  const model=prop_('GEMINI_MODEL')||DEFAULT_MODEL;
  const res=UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+prop_('GEMINI_KEY'),{
    method:'post',contentType:'application/json',muteHttpExceptions:true,
    payload:JSON.stringify({contents:[{parts:[{text:prompt},{text:'User message: '+text}]}],generationConfig:{responseMimeType:'application/json',temperature:0}})});
  const body=JSON.parse(res.getContentText());
  if(!body.candidates) throw new Error('Gemini: '+res.getContentText().slice(0,200));
  return JSON.parse(body.candidates[0].content.parts[0].text);
}
function ownerPrompt_(){
  const list=customers_().map(function(c){return c.id+' = '+c.name;}).join('\n');
  return 'You are an ISP business manager. Customers (ID = name):\n'+list+'\n\n'+
  'The message is in English, Urdu script or Roman Urdu. Names may be written in Urdu script: match them to the list. Reply with JSON only:\n'+
  '{"intent":"payment|status|report|complaint|technician|open_requests|unknown","customer_id":"C001 or null","amount":number or null,"month":"YYYY-MM or null","method":"Cash|JazzCash|Easypaisa|Bank or null","category":"one of: '+CATEGORIES+' or null","details":"short summary of the problem in English","priority":"Low|Medium|High or null"}\n'+
  'payment = someone paid money. status = one customer balance. report = overall summary / who has not paid. complaint = a customer problem (slow internet, no internet, billing etc). technician = send a technician. open_requests = which complaints/requests are open.\n'+
  'If the name or amount is unclear use null. Never guess.';
}
function customerPrompt_(){
  return 'You are an ISP customer service bot. The customer message is in English, Urdu script or Roman Urdu. Reply with JSON only:\n'+
  '{"intent":"complaint|technician|my_bill|request_status|unknown","category":"one of: '+CATEGORIES+'","details":"short summary of the problem in English","priority":"Low|Medium|High"}\n'+
  'complaint = internet problem or complaint. technician = customer wants a technician visit. my_bill = asking about own bill/balance. request_status = asking about own complaint status. Use unknown if unsure.';
}

// ---------- Page se bulaye jane wale kaam ----------
function ownerCommand(pin,text,lang){
  auth_(pin,true,lang);
  const cmd=gemini_(ownerPrompt_(),text);
  const month=cmd.month||currentMonth_();
  if(cmd.intent==='payment'){
    if(!cmd.customer_id||!cmd.amount) return t_(lang,'pay_need');
    if(!custById_(cmd.customer_id)) return t_(lang,'no_cust');
    addPayment_(cmd.customer_id,month,cmd.amount,cmd.method||'Cash','Web voice');
    SpreadsheetApp.flush();
    return t_(lang,'pay_ok',{amt:cmd.amount})+'\n\n'+statusText_(cmd.customer_id,month,lang);
  }
  if(cmd.intent==='status'){
    if(!cmd.customer_id) return t_(lang,'name_unclear');
    return statusText_(cmd.customer_id,month,lang);
  }
  if(cmd.intent==='report') return reportText_(month,lang);
  if(cmd.intent==='complaint'||cmd.intent==='technician'){
    const c=cmd.customer_id?custById_(cmd.customer_id):null;
    if(!c) return t_(lang,'name_unclear');
    const type=cmd.intent==='technician'?'Technician':'Complaint';
    const r=createRequest_(c,type,cmd.category,cmd.details||text,cmd.priority);
    return t_(lang,'req_owner',{name:c.name,type:t_(lang,'t_'+type),id:r.id});
  }
  if(cmd.intent==='open_requests') return openRequestsText_(lang);
  return t_(lang,'not_understood');
}
function custMessage(phone,text,lang){
  const c=custByPhone_(phone);
  if(!c) return t_(lang,'ph_notfound');
  const cmd=gemini_(customerPrompt_(),text);
  if(cmd.intent==='complaint'||cmd.intent==='technician'){
    const type=cmd.intent==='technician'?'Technician':'Complaint';
    const r=createRequest_(c,type,cmd.category,cmd.details||text,cmd.priority);
    return t_(lang,'cust_req',{name:c.name,kind:t_(lang,'k_'+type),id:r.id});
  }
  if(cmd.intent==='my_bill') return statusText_(c.id,currentMonth_(),lang);
  if(cmd.intent==='request_status') return latestRequestText_(c.id,lang);
  return t_(lang,'cust_unknown');
}
function techList(pin,lang){
  auth_(pin,false,lang);
  const v=ss_().getSheetByName('Requests').getDataRange().getValues();
  const map={}; customers_().forEach(function(c){ map[c.id]=c; });
  const out=[];
  for(let i=1;i<v.length;i++){
    if(!v[i][0] || v[i][8]==='Done') continue;
    const c=map[String(v[i][2])]||{name:String(v[i][2]),phone:'',address:''};
    let d=''; try{ d=Utilities.formatDate(new Date(v[i][1]),tz_(),'dd-MMM HH:mm'); }catch(e){}
    out.push({id:String(v[i][0]),date:d,name:c.name,phone:c.phone,address:c.address,type:String(v[i][3]),category:String(v[i][4]),details:String(v[i][5]),priority:String(v[i][6]),tech:String(v[i][7])});
  }
  return out;
}
function techDone(pin,id,lang){
  auth_(pin,false,lang);
  const sh=ss_().getSheetByName('Requests');
  const v=sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){
    if(String(v[i][0])!==String(id)) continue;
    if(v[i][8]==='Done') return t_(lang,'done_already');
    sh.getRange(i+1,9).setValue('Done');
    sh.getRange(i+1,10).setValue(new Date());
    return t_(lang,'done_ok',{id:id});
  }
  return t_(lang,'req_nf');
}

// ---------- Request banana ----------
function pickTech_(){
  const emp=employees_().filter(function(e){ return !e.role || /tech/i.test(e.role); });
  if(!emp.length) return 'Technician';
  const v=ss_().getSheetByName('Requests').getDataRange().getValues();
  const open={};
  for(let i=1;i<v.length;i++){ if(v[i][8]!=='Done' && v[i][7]) open[v[i][7]]=(open[v[i][7]]||0)+1; }
  emp.sort(function(a,b){ return (open[a.name]||0)-(open[b.name]||0); });
  return emp[0].name;
}
function createRequest_(c,type,category,details,priority){
  const sh=ss_().getSheetByName('Requests');
  const id='REQ-'+Utilities.formatDate(new Date(),tz_(),'MMddHHmmss');
  sh.appendRow([id,new Date(),c.id,type,category||'Other',details||'',priority||'Medium',pickTech_(),'Open','']);
  return {id:id};
}

// ---------- Text banane wale ----------
function openRequestsText_(lang){
  const v=ss_().getSheetByName('Requests').getDataRange().getValues(); const names={};
  customers_().forEach(function(c){ names[c.id]=c.name; });
  const lines=[];
  for(let i=1;i<v.length;i++){
    if(v[i][0] && v[i][8]!=='Done') lines.push('• '+v[i][0]+': '+(names[v[i][2]]||v[i][2])+' - '+v[i][4]);
  }
  return lines.length?t_(lang,'open_hdr')+'\n'+lines.join('\n'):t_(lang,'open_none');
}
function latestRequestText_(custId,lang){
  const v=ss_().getSheetByName('Requests').getDataRange().getValues();
  for(let i=v.length-1;i>=1;i--){
    if(String(v[i][2])===custId) return t_(lang,'latest',{id:v[i][0],cat:v[i][4],status:t_(lang,'r_'+v[i][8])});
  }
  return t_(lang,'latest_none');
}

// ---------- Payments / Bills ----------
function addPayment_(customerId,month,amount,method,note){
  const sh=ss_().getSheetByName('Payments');
  const col=sh.getRange('A1:A500').getValues();
  let row=2; while(row<=500 && col[row-1][0]!=='') row++;
  if(row>500) throw new Error('Payments sheet is full');
  sh.getRange(row,1).setValue('P'+Utilities.formatDate(new Date(),tz_(),'yyMMddHHmmss'));
  sh.getRange(row,2).setValue(new Date());
  sh.getRange(row,3).setValue(customerId);
  sh.getRange(row,5).setValue(month);
  sh.getRange(row,6).setValue(amount);
  sh.getRange(row,7).setValue(method);
  sh.getRange(row,8).setValue(note);
}
function billRow_(customerId,month){
  const v=ss_().getSheetByName('Bills').getDataRange().getValues();
  for(let i=1;i<v.length;i++){ if(v[i][0]===month && v[i][1]===customerId) return v[i]; }
  return null;
}
function statusText_(customerId,month,lang){
  const b=billRow_(customerId,month);
  if(!b) return t_(lang,'bill_none',{month:month});
  const due=Utilities.formatDate(new Date(b[9]),tz_(),'dd-MMM');
  const icon=b[12]==='Paid'?'🟢':(b[12]==='Overdue'?'🔴':'🟡');
  return t_(lang,'bill',{name:b[2],month:month,total:b[8],paid:b[10],pending:b[11],due:due,icon:icon,status:t_(lang,'s_'+b[12])});
}
function reportText_(month,lang){
  const v=ss_().getSheetByName('Bills').getDataRange().getValues();
  let billed=0,got=0,pend=0; const lines=[];
  for(let i=1;i<v.length;i++){
    if(v[i][0]!==month) continue;
    billed+=Number(v[i][8]); got+=Number(v[i][10]); pend+=Number(v[i][11]);
    if(v[i][12]!=='Paid') lines.push('• '+v[i][2]+': Rs '+v[i][11]+' ('+t_(lang,'s_'+v[i][12])+')');
  }
  return t_(lang,'report',{month:month,billed:billed,got:got,pend:pend,lines:(lines.join('\n')||t_(lang,'all_paid'))});
}

// ---------- Page ----------
const HTML_ = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:Arial,Tahoma,sans-serif;margin:0;background:#f3f6fb;color:#1c2b3a}
header{background:#1F3A5F;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
header h1{margin:0;font-size:18px}
header small{opacity:.8}
.langs{display:flex;gap:6px}
.lb{background:#2E75B6;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-size:14px;cursor:pointer}
.lb.on{background:#fff;color:#1F3A5F;font-weight:bold}
.tabs{display:flex;background:#fff;border-bottom:1px solid #d5dde8}
.tab{flex:1;padding:12px 4px;text-align:center;font-size:14px;border:0;background:#fff;color:#556;cursor:pointer}
.tab.on{color:#1F3A5F;font-weight:bold;border-bottom:3px solid #2E75B6}
.panel{display:none;padding:14px}
.box{background:#fff;border-radius:12px;padding:12px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
textarea,input{width:100%;box-sizing:border-box;padding:10px;font-size:16px;border:1px solid #c5d0de;border-radius:8px;margin-bottom:8px}
.btn{padding:12px 16px;font-size:16px;border:0;border-radius:8px;background:#2E75B6;color:#fff;cursor:pointer}
.btn.mic{background:#6A1B9A}
.btn.done{background:#2E7D32;margin-top:8px;width:100%}
.btn.gray{background:#667}
.row{display:flex;gap:8px}
.row .btn{flex:1}
.chip{display:inline-block;background:#e6eefa;color:#1F3A5F;border-radius:16px;padding:7px 12px;margin:3px 3px 0 0;font-size:13px;cursor:pointer}
.out{white-space:pre-wrap;background:#fff;border-radius:12px;padding:12px;min-height:60px;box-shadow:0 1px 3px rgba(0,0,0,.08);line-height:1.6}
.card{background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.08);line-height:1.6}
.muted{color:#778}
small{color:#667}
</style></head><body>
<header>
<div><h1 data-i="title">Net Manager ISP</h1><small data-i="sub">Demo - sample data</small></div>
<div class="langs"><button class="lb on" id="b_en" onclick="applyLang('en')">EN</button><button class="lb" id="b_ur" onclick="applyLang('ur')">اردو</button></div>
</header>
<div class="tabs">
<button class="tab on" id="t_owner" onclick="show('owner')" data-i="tab_owner">Owner</button>
<button class="tab" id="t_tech" onclick="show('tech')" data-i="tab_tech">Technician</button>
<button class="tab" id="t_cust" onclick="show('cust')" data-i="tab_cust">Customer</button>
</div>

<div class="panel" id="p_owner" style="display:block">
<div class="box">
<input id="pin" type="password" data-p="pin_ph" placeholder="PIN" onchange="savePin()">
<textarea id="otext" rows="3" dir="auto" data-p="otext_ph" placeholder=""></textarea>
<div class="row"><button class="btn mic" onclick="mic('otext','omic')" data-i="btn_mic">Speak</button><button class="btn" onclick="ownerSend()" data-i="btn_send">Send</button></div>
<small id="omic" data-i="mic_hint"></small>
<div style="margin-top:8px">
<span class="chip" data-i="c1" data-c="c1" onclick="ochip(this)"></span>
<span class="chip" data-i="c2" data-c="c2" onclick="ochip(this)"></span>
<span class="chip" data-i="c3" data-c="c3" onclick="ochip(this)"></span>
<span class="chip" data-i="c4" data-c="c4" onclick="ochip(this)"></span>
<span class="chip" data-i="c5" data-c="c5" onclick="ochip(this)"></span>
</div></div>
<div class="out" id="oout"></div>
</div>

<div class="panel" id="p_tech">
<div class="box"><div class="row"><button class="btn gray" onclick="loadTasks()" data-i="refresh">Refresh</button></div><small id="tmsg"></small></div>
<div id="tlist"></div>
</div>

<div class="panel" id="p_cust">
<div class="box">
<input id="cphone" type="tel" dir="auto" data-p="cphone_ph" placeholder="">
<textarea id="ctext" rows="3" dir="auto" data-p="ctext_ph" placeholder=""></textarea>
<div class="row"><button class="btn mic" onclick="mic('ctext','cmic')" data-i="btn_mic">Speak</button><button class="btn" onclick="custSend()" data-i="btn_send">Send</button></div>
<small id="cmic" data-i="mic_hint"></small>
<div style="margin-top:8px">
<span class="chip" data-i="k1" data-c="k1" onclick="cchip(this)"></span>
<span class="chip" data-i="k2" data-c="k2" onclick="cchip(this)"></span>
</div></div>
<div class="out" id="cout"></div>
</div>

<script>
var pin='';
var lang='en';
try{ pin=localStorage.getItem('pin')||''; lang=localStorage.getItem('lang')||'en'; }catch(e){}
var used={};
var I={
en:{title:"Net Manager ISP",sub:"Demo - sample data",tab_owner:"Owner",tab_tech:"Technician",tab_cust:"Customer",pin_ph:"PIN",
otext_ph:"Type here or tap Speak. e.g. Ali paid 1000",btn_mic:"Speak",btn_send:"Send",
mic_hint:"If the mic does not work, use your phone keyboard mic.",init:"The reply will appear here.",
c1:"Ali paid 1000",c2:"What is Ali's balance?",c3:"Who has not paid?",c4:"Sara's internet is slow",c5:"Show open requests",
refresh:"Refresh",tmsg_init:"Open requests will show here (enter the PIN in the Owner tab).",
cphone_ph:"Your phone number",ctext_ph:"Describe your problem or tap Speak. e.g. My internet is slow",
k1:"What is the status of my request?",k2:"Show my bill",wait:"Please wait...",err:"Problem: ",
need_text:"Please type or speak first.",need_phone:"Please enter your phone number first.",need_pin:"Enter the PIN in the Owner tab first.",
open_count:"Open requests: ",no_open:"No open requests. Everything is done.",done_btn:"Done",heard_ok:"Heard. Now tap Send.",
listening:"Listening...",mic_fail:"The mic did not work. Use your keyboard mic.",no_mic:"This browser has no mic support. Use your keyboard mic.",
lbl_issue:"Issue",lbl_priority:"Priority",mic_lang:"en-US"},
ur:{title:"نیٹ مینیجر آئی ایس پی",sub:"ڈیمو - نمونہ ڈیٹا",tab_owner:"مالک",tab_tech:"ٹیکنیشن",tab_cust:"کسٹمر",pin_ph:"پن",
otext_ph:"یہاں لکھیں یا بولیں۔ جیسے: علی نے 1000 دیے",btn_mic:"بولیں",btn_send:"بھیجیں",
mic_hint:"مائیک نہ چلے تو فون کیبورڈ کا مائیک استعمال کریں۔",init:"جواب یہاں نظر آئے گا۔",
c1:"علی نے 1000 دیے",c2:"علی کا بیلنس بتاؤ",c3:"کس کس نے ادائیگی نہیں کی",c4:"سارہ کا انٹرنیٹ سلو ہے",c5:"کھلی درخواستیں بتاؤ",
refresh:"ریفریش",tmsg_init:"کھلی درخواستیں یہاں نظر آئیں گی (پن مالک والے ٹیب میں ڈالیں)۔",
cphone_ph:"اپنا فون نمبر",ctext_ph:"اپنا مسئلہ لکھیں یا بولیں۔ جیسے: میرا انٹرنیٹ سلو ہے",
k1:"میری درخواست کا کیا بنا",k2:"میرا بل بتاؤ",wait:"انتظار کریں...",err:"مسئلہ: ",
need_text:"پہلے کچھ بولیں یا لکھیں۔",need_phone:"پہلے اپنا فون نمبر لکھیں۔",need_pin:"پہلے مالک والے ٹیب میں پن ڈالیں۔",
open_count:"کھلی درخواستیں: ",no_open:"کوئی کھلی درخواست نہیں۔ سب مکمل ہیں۔",done_btn:"مکمل",heard_ok:"سن لیا۔ اب بھیجیں دبائیں۔",
listening:"سن رہا ہوں...",mic_fail:"مائیک نہیں چلا۔ کیبورڈ کا مائیک استعمال کریں۔",no_mic:"اس براؤزر میں مائیک نہیں چلتا۔ کیبورڈ کا مائیک استعمال کریں۔",
lbl_issue:"مسئلہ",lbl_priority:"ترجیح",mic_lang:"ur-PK"}
};
function $(id){ return document.getElementById(id); }
function tt(k){ return I[lang][k]; }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function applyLang(l){
  lang=l;
  try{ localStorage.setItem('lang',l); }catch(e){}
  document.body.dir=(l==='ur')?'rtl':'ltr';
  var els=document.querySelectorAll('[data-i]');
  for(var i=0;i<els.length;i++){ els[i].textContent=I[l][els[i].getAttribute('data-i')]; }
  var ps=document.querySelectorAll('[data-p]');
  for(var j=0;j<ps.length;j++){ ps[j].placeholder=I[l][ps[j].getAttribute('data-p')]; }
  $('b_en').className=(l==='en')?'lb on':'lb';
  $('b_ur').className=(l==='ur')?'lb on':'lb';
  if(!used.oout) $('oout').textContent=tt('init');
  if(!used.cout) $('cout').textContent=tt('init');
  if($('p_tech').style.display==='block') loadTasks(); else $('tmsg').textContent=tt('tmsg_init');
}
function show(tab){
  ['owner','tech','cust'].forEach(function(t){
    $('p_'+t).style.display=(t===tab)?'block':'none';
    $('t_'+t).className=(t===tab)?'tab on':'tab';
  });
  if(tab==='tech') loadTasks();
}
function savePin(){ pin=$('pin').value.trim(); try{ localStorage.setItem('pin',pin); }catch(e){} }
function run(fn,args,ok,outId){
  var out=outId?$(outId):null;
  if(out){ out.textContent=tt('wait'); used[outId]=true; }
  var r=google.script.run
    .withSuccessHandler(function(x){ ok(x); })
    .withFailureHandler(function(e){ var m=tt('err')+(e&&e.message?e.message:e); if(out) out.textContent=m; else $('tmsg').textContent=m; });
  r[fn].apply(r,args);
}
function mic(targetId,statusId){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ $(statusId).textContent=tt('no_mic'); return; }
  var r=new SR(); r.lang=tt('mic_lang'); r.interimResults=false;
  r.onresult=function(e){ $(targetId).value=e.results[0][0].transcript; $(statusId).textContent=tt('heard_ok'); };
  r.onerror=function(e){ $(statusId).textContent=tt('mic_fail'); };
  $(statusId).textContent=tt('listening');
  try{ r.start(); }catch(e2){ $(statusId).textContent=tt('mic_fail'); }
}
function ochip(el){ ownerSend(tt(el.getAttribute('data-c'))); }
function cchip(el){ custSend(tt(el.getAttribute('data-c'))); }
function ownerSend(txt){
  savePin();
  var t=txt||$('otext').value.trim();
  if(!t){ $('oout').textContent=tt('need_text'); used.oout=true; return; }
  $('otext').value=t;
  run('ownerCommand',[pin,t,lang],function(x){ $('oout').textContent=x; },'oout');
}
function loadTasks(){
  if(!pin){ $('tmsg').textContent=tt('need_pin'); return; }
  $('tmsg').textContent=tt('wait');
  run('techList',[pin,lang],function(list){
    var h='';
    if(!list.length) h='<p class="muted">'+esc(tt('no_open'))+'</p>';
    list.forEach(function(r){
      h+='<div class="card"><b>'+esc(r.id)+'</b> - '+esc(r.type)+' / '+esc(r.category)+'<br>'
        +esc(r.name)+' ('+esc(r.phone)+')<br>'+esc(r.address)+'<br>'+esc(tt('lbl_issue'))+': '+esc(r.details)+'<br>'
        +'<small>'+esc(r.date)+' | '+esc(tt('lbl_priority'))+': '+esc(r.priority)+' | '+esc(r.tech)+'</small>'
        +'<button class="btn done" data-id="'+esc(r.id)+'" onclick="doneReq(this)">'+esc(tt('done_btn'))+'</button></div>';
    });
    $('tlist').innerHTML=h;
    $('tmsg').textContent=tt('open_count')+list.length;
  });
}
function doneReq(btn){
  var id=btn.getAttribute('data-id');
  btn.disabled=true; btn.textContent=tt('wait');
  run('techDone',[pin,id,lang],function(x){ $('tmsg').textContent=x; loadTasks(); });
}
function custSend(txt){
  var ph=$('cphone').value.trim();
  var t=txt||$('ctext').value.trim();
  if(!ph){ $('cout').textContent=tt('need_phone'); used.cout=true; return; }
  if(!t){ $('cout').textContent=tt('need_text'); used.cout=true; return; }
  $('ctext').value=t;
  run('custMessage',[ph,t,lang],function(x){ $('cout').textContent=x; },'cout');
}
$('pin').value=pin;
applyLang(lang);
setInterval(function(){ if($('p_tech').style.display==='block' && pin) loadTasks(); },20000);
</script>
</body></html>
`;
