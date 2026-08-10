/* Offline Indian-food nutrition calculator. Values are approximate per 100 g edible portion. */
window.FOOD_DB = [
 {name:'Egg, whole',aliases:['egg','eggs','boiled egg','fried egg'],calories:143,protein:12.6,defaultGrams:50},
 {name:'Chicken breast, cooked',aliases:['chicken breast','grilled chicken','chicken'],calories:165,protein:31,defaultGrams:100},
 {name:'Chicken curry',aliases:['chicken gravy','chicken masala'],calories:190,protein:18,defaultGrams:150},
 {name:'Mutton curry',aliases:['mutton gravy','mutton masala'],calories:250,protein:25,defaultGrams:150},
 {name:'Fish, cooked',aliases:['fish','grilled fish','fried fish'],calories:180,protein:26,defaultGrams:150},
 {name:'Dal, cooked',aliases:['dal','daal','lentils'],calories:116,protein:9,defaultGrams:150},
 {name:'Chapati / roti',aliases:['chapati','roti','roti wheat'],calories:297,protein:10,defaultGrams:40},
 {name:'White rice, cooked',aliases:['rice','white rice','cooked rice'],calories:130,protein:2.7,defaultGrams:150},
 {name:'Biryani',aliases:['chicken biryani','mutton biryani'],calories:200,protein:8,defaultGrams:200},
 {name:'Paneer',aliases:['cottage cheese','paneer cheese'],calories:265,protein:18.3,defaultGrams:100},
 {name:'Curd / yogurt',aliases:['curd','yogurt','dahi'],calories:61,protein:3.5,defaultGrams:150},
 {name:'Milk, whole',aliases:['milk','full cream milk'],calories:61,protein:3.2,defaultGrams:250},
 {name:'Oats, dry',aliases:['oats','rolled oats'],calories:389,protein:16.9,defaultGrams:60},
 {name:'Banana',aliases:['banana'],calories:89,protein:1.1,defaultGrams:100},
 {name:'Apple',aliases:['apple'],calories:52,protein:0.3,defaultGrams:150},
 {name:'Almonds',aliases:['almond','badam','badaam'],calories:579,protein:21.2,defaultGrams:20},
 {name:'Cashews',aliases:['cashew','kaju'],calories:553,protein:18.2,defaultGrams:20},
 {name:'Potato, cooked',aliases:['potato','aloo'],calories:87,protein:1.9,defaultGrams:150},
 {name:'Bhindi / okra',aliases:['bhindi','okra'],calories:33,protein:1.9,defaultGrams:150},
 {name:'Baingan / eggplant',aliases:['baingan','eggplant','brinjal'],calories:35,protein:1,defaultGrams:150},
 {name:'Karela / bitter gourd',aliases:['karela','bitter gourd'],calories:34,protein:3.6,defaultGrams:150},
 {name:'Ghee',aliases:['ghee','cow ghee'],calories:900,protein:0,defaultGrams:5}
];
(function(){
 const db=window.FOOD_DB;
 const normalize=s=>String(s||'').trim().toLowerCase();
 const findFood=s=>{const q=normalize(s);return db.find(f=>normalize(f.name)===q||f.aliases.some(a=>normalize(a)===q))||db.find(f=>normalize(f.name).includes(q)||f.aliases.some(a=>normalize(a).includes(q)));};
 const calculate=(meal)=>{const name=document.getElementById(meal+'Name'), grams=document.getElementById(meal+'Grams'), cal=document.getElementById(meal+'Calories'), protein=document.getElementById(meal+'Protein');if(!name||!grams)return;const food=findFood(name.value);if(!food)return;const g=Number(grams.value)||food.defaultGrams;grams.value=g;cal.value=Math.round(food.calories*g/100);protein.value=Math.round(food.protein*g/100*10)/10;name.dataset.food=food.name;name.title=`${food.name}: ${food.calories} kcal and ${food.protein} g protein per 100 g`;};
 const init=()=>['breakfast','lunch','dinner'].forEach(meal=>{['Name','Grams'].forEach(s=>document.getElementById(meal+s)?.addEventListener('input',()=>calculate(meal)));document.getElementById(meal+'Name')?.addEventListener('change',()=>calculate(meal));});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 window.foodCalculator={calculate,findFood};
})();
