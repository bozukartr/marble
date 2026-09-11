/* Shared content catalog. Each description corresponds to a rule in engine.js. */
(function(root){
'use strict';
const categories={home:{name:'Konut',color:'#dc8256',symbol:'⌂'},trade:{name:'Ticaret',color:'#cf9a37',symbol:'◇'},industry:{name:'Üretim',color:'#8c86ba',symbol:'▥'},utility:{name:'Altyapı',color:'#508dba',symbol:'ϟ'},service:{name:'Hizmet',color:'#d2728d',symbol:'✚'},green:{name:'Yeşil & kültür',color:'#559d80',symbol:'♧'},project:{name:'Proje',color:'#738596',symbol:'↗'}};
// id, name, category, cost, population, income, power, happiness, tier, token, rule
const rows=[
['house','Müstakil ev','home',3,3,0,-1,0,0,'EV','Komşu park başına +2 nüfus.'],
['apartment','Apartman','home',6,7,0,-3,0,0,'AP','Komşu kamu hizmeti başına +2 mutluluk.'],
['garden','Bahçeli konut','home',5,3,0,-1,1,0,'BK','Komşu boş parsel başına +1 nüfus.'],
['dorm','Öğrenci yurdu','home',5,4,0,-2,0,1,'YR','Komşu okul +4, ulaşım +2 nüfus.'],
['residence','Rezidans','home',9,5,1,-3,0,2,'RZ','Komşu ticaret başına +2 nüfus, hizmet başına +2 mutluluk.'],
['shop','Bakkal','trade',4,0,1,-1,0,0,'BA','Komşu konut başına +2 gelir.'],
['cafe','Kafe','trade',4,0,1,-1,0,0,'KF','Komşu park veya meydan başına +3 gelir.'],
['market','Pazar yeri','trade',5,0,1,-1,0,1,'PZ','Komşu farklı bina kategorisi başına +1 gelir.'],
['office','Ofis','trade',7,0,2,-2,0,1,'OF','Komşu okul/kütüphane başına +3 gelir. Enerji fazlası +2.'],
['hotel','Otel','trade',8,0,2,-2,0,2,'OT','Su kenarı +3; komşu müze, park veya sahil başına +2 gelir.'],
['workshop','Atölye','industry',4,0,3,-1,0,0,'AT','Komşu depo başına +2 gelir; kirlilik üretmez.'],
['factory','Fabrika','industry',6,0,6,-3,0,0,'FB','Komşu konut başına −2 mutluluk. Depo +3 gelir. Filtre veya geri dönüşüm kirliliği azaltır.'],
['warehouse','Depo','industry',4,0,1,-1,0,1,'DP','Komşu ticaret/üretim başına +1 gelir; fabrika ve atölyeyi destekler.'],
['greenhouse','Sera','industry',5,0,2,-2,0,1,'SR','Su kenarı veya komşu su deposu +3 gelir. Enerji fazlası +1.'],
['recycling','Geri dönüşüm','industry',6,0,1,-1,1,2,'GD','Komşu fabrikaların kirliliğini 1 azaltır; her fabrika için +2 gelir.'],
['solar','Güneş santrali','utility',4,0,0,5,0,0,'GÜ','Komşu apartman, rezidans veya ofis başına −1 enerji.'],
['plant','Enerji santrali','utility',6,0,0,10,0,1,'EN','Komşu konut başına −2 mutluluk.'],
['water','Su deposu','utility',4,0,0,0,0,0,'SU','Komşu konut başına +1 nüfus. Seraları ve sıcak hava korumasını destekler.'],
['tram','Tramvay durağı','utility',5,0,0,-1,0,1,'TR','Aynı satır/sütundaki her diğer durak/aktarma +2 gelir.'],
['hub','Aktarma merkezi','utility',8,0,1,-2,0,2,'AK','Aynı satır/sütundaki durak başına +2 gelir. İki yönde bağlantı +4 gelir.'],
['school','Okul','service',5,0,0,-1,1,0,'OK','Komşu konut başına +1 nüfus; yurt ve ofisleri destekler.'],
['clinic','Klinik','service',5,0,0,-1,0,0,'KL','Komşu konut başına +2 mutluluk; apartman varsa ek +2.'],
['fire','İtfaiye','service',4,0,0,-1,1,1,'İT','Komşu üretim binalarını yangın olayından korur.'],
['library','Kütüphane','service',5,0,0,-1,1,2,'KT','Komşu okul başına +4 mutluluk; ofisleri destekler.'],
['community','Toplum merkezi','service',6,0,0,-1,0,2,'TM','Komşu farklı konut türü başına +3 mutluluk.'],
['park','Cep parkı','green',3,0,0,0,1,0,'PK','Komşu konut başına +2 mutluluk; ev ve kafeleri destekler.'],
['forest','Kent ormanı','green',4,0,0,0,2,1,'OR','Komşu orman başına +2 mutluluk.'],
['square','Meydan','green',4,0,0,0,1,2,'MY','Komşu ticaret veya hizmet başına +2 mutluluk.'],
['museum','Müze','green',7,0,1,-1,2,2,'MZ','Komşu otel veya ulaşım başına +3 gelir.'],
['promenade','Sahil yolu','green',5,0,1,0,2,2,'SH','Yalnız su kenarına kurulur. Komşu konut/ticaret başına +2 mutluluk.']
];
const buildings=rows.map(([id,name,category,cost,pop,income,power,happy,tier,token,description])=>({id,name,category,cost,pop,income,power,happy,tier,token,description,kind:'building'}));
const projects=[
['upgrade','Yenileme',5,'Bir binayı bir seviye yükselt. En fazla seviye 3.'],
['move','Taşınma',2,'Bir binayı seç, ardından uygun boş parseli seç.'],
['demolish','Yıkım izni',0,'Bir binayı kaldır. Temel maliyetinin yarısını geri al.'],
['rezone','İmar değişikliği',2,'Bir konutu aynı seviyede bakkala dönüştür.'],
['insulate','Yalıtım',3,'Bir binanın enerji tüketimini 2 azalt. Bir kez uygulanır.'],
['roof','Yeşil çatı',3,'Bir binaya +2 mutluluk ve sıcak hava koruması ekle.'],
['filter','Filtre sistemi',3,'Bir fabrikanın kirliliğini kaldır.'],
['festival','Yerel festival',0,'Bir binanın her dolu komşusu için 2 para kazan.'],
['transport','Ulaşım desteği',3,'Bir durak veya aktarmaya bağlantı başına +2 gelir ekle.'],
['restore','Restorasyon',4,'Bir müzeye her dolu komşusu için +2 mutluluk ekle.'],
['swap','Parsel düzenleme',2,'İki binanın yerini değiştir.'],
['subsidy','Yatırım teşviki',0,'Sonraki bina maliyetinden 4 indirim. Biriktirilemez.']
].map(([id,name,cost,description])=>({id,name,cost,description,kind:'project',category:'project',token:'↗',tier:0}));
const events=[
{id:'migration',name:'Göç dalgası',description:'Bu dönem her konut +1 nüfus.'},
{id:'tourism',name:'Turizm haftası',description:'Otel, müze ve sahil gelirleri iki katına çıkar.'},
{id:'heat',name:'Sıcak hava',description:'Su veya yeşil alan desteği olmayan her konut −2 mutluluk.'},
{id:'outage',name:'Enerji sıkıntısı',description:'Bu dönem şehir enerjisi −3.'},
{id:'fair',name:'Ticaret fuarı',description:'Komşu ticareti olan ticaret binaları +3 gelir.'},
{id:'orders',name:'Üretim talebi',description:'Üretim binaları +2 gelir.'},
{id:'fire',name:'Yangın riski',description:'İtfaiye komşusu olmayan üretim binalarının geliri bu dönem yarıya iner.'},
{id:'grant',name:'Yeşil şehir hibesi',description:'Dönem başında her yeşil/kültür binası için 3 para hibe.'}
];
const maps=[{id:'plain',name:'Açık arazi',description:'35 boş parsel. Her stratejiye açık.',unlock:0},{id:'river',name:'Nehir kıyısı',description:'Doğu kıyısı suyla çevrili.',unlock:1},{id:'lake',name:'Göl çevresi',description:'Ortada göl, çevresinde fırsatlar.',unlock:2},{id:'valley',name:'Dar vadi',description:'Kayalıklar arasında alan yönetimi.',unlock:3}];
const goals=[{id:'neighborhood',name:'Yeşil mahalle',description:'Bir parkın dört komşusunu konutla doldur.'},{id:'services',name:'Herkese hizmet',description:'Üç farklı kamu hizmeti kur.'},{id:'population',name:'Yeni komşular',description:'En az 35 nüfusa ulaş.'},{id:'transit',name:'Birbirine bağlı',description:'Aynı satır/sütunda iki ulaşım binası kur.'},{id:'production',name:'Temiz üretim',description:'Bir fabrikayı depo ve geri dönüşümle komşu yap.'},{id:'savings',name:'Sağlam bütçe',description:'Şehri en az 35 parayla tamamla.'}];
const all=[...buildings,...projects],byId=Object.fromEntries(all.map(x=>[x.id,x]));
const data={categories,buildings,projects,events,maps,goals,all,byId};
if(typeof module!=='undefined'&&module.exports)module.exports=data;else root.ParselData=data;
})(globalThis);
