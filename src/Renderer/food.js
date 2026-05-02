'use strict';
// ─────────────────────────────────────────────────────────────
// food.js — Food tab
// Database: BUILTIN_FOODS (local) + community_foods + usda_foods (Supabase)
// Data: S.foodLog  = { 'YYYY-MM-DD': [{ id, name, brand, meal, grams, kcal, protein, carbs, fat, fiber, per100g }] }
//       S.foodTargets = { kcal, protein, carbs, fat }
// ─────────────────────────────────────────────────────────────

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

// ── Built-in food database ─────────────────────────────────────
// per100g = nutrients per 100g. serving/servingG = display serving size.
// mode: 'ingredient' | 'dish' | 'drink'   gcc:true = Gulf/Kuwait-specific
const BUILTIN_FOODS = [
  // ─── Protein / Meat ───
  { id:'b-chicken-breast',    name:'Chicken Breast (raw)',       cat:'Protein',  mode:'ingredient', serving:'100g',        servingG:100, per100g:{ kcal:120, protein:22,  carbs:0,    fat:2.5,  fiber:0   } },
  { id:'b-chicken-thigh',     name:'Chicken Thigh (raw)',        cat:'Protein',  mode:'ingredient', serving:'100g',        servingG:100, per100g:{ kcal:177, protein:18,  carbs:0,    fat:11,   fiber:0   } },
  { id:'b-chicken-cooked',    name:'Chicken Breast (grilled)',   cat:'Protein',  mode:'ingredient', serving:'100g',        servingG:100, per100g:{ kcal:165, protein:31,  carbs:0,    fat:3.6,  fiber:0   } },
  { id:'b-egg-whole',         name:'Egg (whole)',                cat:'Protein',  mode:'ingredient', serving:'1 egg',       servingG:50,  per100g:{ kcal:155, protein:13,  carbs:1.1,  fat:11,   fiber:0   } },
  { id:'b-egg-white',         name:'Egg White',                  cat:'Protein',  mode:'ingredient', serving:'1 white',     servingG:33,  per100g:{ kcal:52,  protein:11,  carbs:0.7,  fat:0.2,  fiber:0   } },
  { id:'b-ground-beef',       name:'Ground Beef (80/20)',        cat:'Protein',  mode:'ingredient', serving:'100g',        servingG:100, per100g:{ kcal:254, protein:17,  carbs:0,    fat:20,   fiber:0   } },
  { id:'b-lamb-lean',         name:'Lamb (lean)',                cat:'Protein',  mode:'ingredient', serving:'100g',        servingG:100, per100g:{ kcal:258, protein:26,  carbs:0,    fat:17,   fiber:0   } },
  { id:'b-beef-steak',        name:'Beef Steak (lean)',          cat:'Protein',  mode:'ingredient', serving:'100g',        servingG:100, per100g:{ kcal:207, protein:26,  carbs:0,    fat:11,   fiber:0   } },
  { id:'b-tuna-canned',       name:'Tuna (canned, water)',       cat:'Protein',  mode:'ingredient', serving:'1 can',       servingG:165, per100g:{ kcal:108, protein:25,  carbs:0,    fat:0.5,  fiber:0   } },
  { id:'b-salmon',            name:'Salmon',                     cat:'Protein',  mode:'ingredient', serving:'1 fillet',    servingG:150, per100g:{ kcal:208, protein:20,  carbs:0,    fat:13,   fiber:0   } },
  { id:'b-shrimp',            name:'Shrimp',                     cat:'Protein',  mode:'ingredient', serving:'100g',        servingG:100, per100g:{ kcal:99,  protein:24,  carbs:0.2,  fat:0.3,  fiber:0   } },
  { id:'b-hammour',           name:'Hammour (Grouper)',          cat:'Protein',  mode:'ingredient', serving:'1 fillet',    servingG:180, per100g:{ kcal:93,  protein:20,  carbs:0,    fat:1,    fiber:0   }, gcc:true },
  { id:'b-zubaidi',           name:'Zubaidi (Silver Pomfret)',   cat:'Protein',  mode:'ingredient', serving:'1 fish',      servingG:200, per100g:{ kcal:112, protein:20,  carbs:0,    fat:3.3,  fiber:0   }, gcc:true },
  { id:'b-americana-chicken', name:'Americana Chicken Fillet',   cat:'Protein',  mode:'ingredient', serving:'1 fillet',    servingG:100, per100g:{ kcal:115, protein:22,  carbs:0,    fat:2.5,  fiber:0   }, gcc:true },
  { id:'b-sadia-chicken',     name:'Sadia Frozen Chicken Breast',cat:'Protein',  mode:'ingredient', serving:'1 piece',     servingG:120, per100g:{ kcal:113, protein:21,  carbs:0,    fat:2.6,  fiber:0   }, gcc:true },
  // ─── Vegetables ───
  { id:'b-tomato',            name:'Tomato',                     cat:'Vegetable',mode:'ingredient', serving:'1 medium',    servingG:120, per100g:{ kcal:18,  protein:0.9, carbs:3.9,  fat:0.2,  fiber:1.2 } },
  { id:'b-cucumber',          name:'Cucumber',                   cat:'Vegetable',mode:'ingredient', serving:'\u00bd medium',servingG:100, per100g:{ kcal:15,  protein:0.7, carbs:3.6,  fat:0.1,  fiber:0.5 } },
  { id:'b-onion',             name:'Onion',                      cat:'Vegetable',mode:'ingredient', serving:'1 medium',    servingG:110, per100g:{ kcal:40,  protein:1.1, carbs:9.3,  fat:0.1,  fiber:1.7 } },
  { id:'b-potato',            name:'Potato (raw)',               cat:'Vegetable',mode:'ingredient', serving:'1 medium',    servingG:150, per100g:{ kcal:77,  protein:2,   carbs:17,   fat:0.1,  fiber:2.2 } },
  { id:'b-carrot',            name:'Carrot',                     cat:'Vegetable',mode:'ingredient', serving:'1 medium',    servingG:80,  per100g:{ kcal:41,  protein:0.9, carbs:10,   fat:0.2,  fiber:2.8 } },
  { id:'b-broccoli',          name:'Broccoli',                   cat:'Vegetable',mode:'ingredient', serving:'1 cup',       servingG:90,  per100g:{ kcal:34,  protein:2.8, carbs:7,    fat:0.4,  fiber:2.6 } },
  { id:'b-spinach',           name:'Spinach',                    cat:'Vegetable',mode:'ingredient', serving:'1 cup',       servingG:30,  per100g:{ kcal:23,  protein:2.9, carbs:3.6,  fat:0.4,  fiber:2.2 } },
  { id:'b-eggplant',          name:'Eggplant / Aubergine',       cat:'Vegetable',mode:'ingredient', serving:'\u00bd medium',servingG:150, per100g:{ kcal:25,  protein:1,   carbs:5.9,  fat:0.2,  fiber:3   } },
  { id:'b-pepper',            name:'Bell Pepper',                cat:'Vegetable',mode:'ingredient', serving:'1 medium',    servingG:120, per100g:{ kcal:31,  protein:1,   carbs:6,    fat:0.3,  fiber:2.1 } },
  { id:'b-zucchini',          name:'Zucchini / Courgette',       cat:'Vegetable',mode:'ingredient', serving:'1 medium',    servingG:200, per100g:{ kcal:17,  protein:1.2, carbs:3.1,  fat:0.3,  fiber:1   } },
  { id:'b-mushroom',          name:'Mushroom',                   cat:'Vegetable',mode:'ingredient', serving:'1 cup',       servingG:70,  per100g:{ kcal:22,  protein:3.1, carbs:3.3,  fat:0.3,  fiber:1   } },
  { id:'b-lettuce',           name:'Lettuce',                    cat:'Vegetable',mode:'ingredient', serving:'1 cup',       servingG:40,  per100g:{ kcal:15,  protein:1.4, carbs:2.9,  fat:0.2,  fiber:1.3 } },
  { id:'b-garlic',            name:'Garlic',                     cat:'Vegetable',mode:'ingredient', serving:'1 clove',     servingG:5,   per100g:{ kcal:149, protein:6.4, carbs:33,   fat:0.5,  fiber:2.1 } },
  // ─── Grains ───
  { id:'b-white-rice',        name:'White Rice (cooked)',        cat:'Grain',    mode:'ingredient', serving:'1 cup',       servingG:186, per100g:{ kcal:130, protein:2.7, carbs:28,   fat:0.3,  fiber:0.4 } },
  { id:'b-basmati-rice',      name:'Basmati Rice (cooked)',      cat:'Grain',    mode:'ingredient', serving:'1 cup',       servingG:186, per100g:{ kcal:121, protein:3.5, carbs:25,   fat:0.3,  fiber:0.4 }, gcc:true },
  { id:'b-brown-rice',        name:'Brown Rice (cooked)',        cat:'Grain',    mode:'ingredient', serving:'1 cup',       servingG:195, per100g:{ kcal:111, protein:2.6, carbs:23,   fat:0.9,  fiber:1.8 } },
  { id:'b-oats',              name:'Oats (raw)',                 cat:'Grain',    mode:'ingredient', serving:'\u00bd cup',  servingG:40,  per100g:{ kcal:389, protein:17,  carbs:66,   fat:7,    fiber:10  } },
  { id:'b-pita',              name:'Pita / Khobz',              cat:'Grain',    mode:'ingredient', serving:'1 pita',      servingG:60,  per100g:{ kcal:275, protein:9.1, carbs:55,   fat:1.2,  fiber:2.2 }, gcc:true },
  { id:'b-white-bread',       name:'White Bread',                cat:'Grain',    mode:'ingredient', serving:'1 slice',     servingG:30,  per100g:{ kcal:265, protein:9,   carbs:49,   fat:3.2,  fiber:2.7 } },
  { id:'b-pasta',             name:'Pasta (cooked)',             cat:'Grain',    mode:'ingredient', serving:'1 cup',       servingG:140, per100g:{ kcal:131, protein:5,   carbs:25,   fat:1.1,  fiber:1.8 } },
  { id:'b-vermicelli',        name:'Vermicelli (sha\'riya)',     cat:'Grain',    mode:'ingredient', serving:'\u00bd cup',  servingG:40,  per100g:{ kcal:371, protein:12,  carbs:75,   fat:1.5,  fiber:2.5 }, gcc:true },
  // ─── Dairy ───
  { id:'b-whole-milk',        name:'Whole Milk',                 cat:'Dairy',    mode:'ingredient', serving:'1 cup',       servingG:240, per100g:{ kcal:61,  protein:3.2, carbs:4.8,  fat:3.3,  fiber:0   } },
  { id:'b-laban',             name:'Laban (Buttermilk)',         cat:'Dairy',    mode:'ingredient', serving:'1 glass',     servingG:250, per100g:{ kcal:40,  protein:3.3, carbs:4.8,  fat:0.9,  fiber:0   }, gcc:true },
  { id:'b-greek-yogurt',      name:'Greek Yogurt (full fat)',    cat:'Dairy',    mode:'ingredient', serving:'\u00bd cup',  servingG:120, per100g:{ kcal:97,  protein:9,   carbs:3.6,  fat:5,    fiber:0   } },
  { id:'b-halloumi',          name:'Halloumi',                   cat:'Dairy',    mode:'ingredient', serving:'2 slices',    servingG:50,  per100g:{ kcal:321, protein:21,  carbs:2.4,  fat:26,   fiber:0   }, gcc:true },
  { id:'b-labneh',            name:'Labneh',                     cat:'Dairy',    mode:'ingredient', serving:'2 tbsp',      servingG:30,  per100g:{ kcal:170, protein:8,   carbs:4,    fat:14,   fiber:0   }, gcc:true },
  { id:'b-cheddar',           name:'Cheddar Cheese',             cat:'Dairy',    mode:'ingredient', serving:'1 slice',     servingG:28,  per100g:{ kcal:403, protein:25,  carbs:1.3,  fat:33,   fiber:0   } },
  { id:'b-kiri',              name:'Kiri Cream Cheese',          cat:'Dairy',    mode:'ingredient', serving:'1 triangle',  servingG:17,  per100g:{ kcal:257, protein:9,   carbs:4,    fat:22,   fiber:0   }, gcc:true },
  { id:'b-almarai-milk',      name:'Almarai Whole Milk',         cat:'Dairy',    mode:'ingredient', serving:'1 cup',       servingG:240, per100g:{ kcal:64,  protein:3.3, carbs:4.8,  fat:3.5,  fiber:0   }, gcc:true },
  { id:'b-almarai-yogurt',    name:'Almarai Yogurt (plain)',     cat:'Dairy',    mode:'ingredient', serving:'1 cup',       servingG:200, per100g:{ kcal:60,  protein:3.2, carbs:6.2,  fat:2.2,  fiber:0   }, gcc:true },
  // ─── Fruits ───
  { id:'b-banana',            name:'Banana',                     cat:'Fruit',    mode:'ingredient', serving:'1 medium',    servingG:120, per100g:{ kcal:89,  protein:1.1, carbs:23,   fat:0.3,  fiber:2.6 } },
  { id:'b-apple',             name:'Apple',                      cat:'Fruit',    mode:'ingredient', serving:'1 medium',    servingG:180, per100g:{ kcal:52,  protein:0.3, carbs:14,   fat:0.2,  fiber:2.4 } },
  { id:'b-watermelon',        name:'Watermelon',                 cat:'Fruit',    mode:'ingredient', serving:'1 slice',     servingG:286, per100g:{ kcal:30,  protein:0.6, carbs:7.6,  fat:0.2,  fiber:0.4 } },
  { id:'b-mango',             name:'Mango',                      cat:'Fruit',    mode:'ingredient', serving:'1 cup',       servingG:165, per100g:{ kcal:60,  protein:0.8, carbs:15,   fat:0.4,  fiber:1.6 } },
  { id:'b-strawberry',        name:'Strawberry',                 cat:'Fruit',    mode:'ingredient', serving:'1 cup',       servingG:150, per100g:{ kcal:33,  protein:0.7, carbs:7.7,  fat:0.3,  fiber:2   } },
  { id:'b-orange',            name:'Orange',                     cat:'Fruit',    mode:'ingredient', serving:'1 medium',    servingG:130, per100g:{ kcal:47,  protein:0.9, carbs:12,   fat:0.1,  fiber:2.4 } },
  { id:'b-dates',             name:'Dates (Medjool)',            cat:'GCC',      mode:'ingredient', serving:'3 dates',     servingG:72,  per100g:{ kcal:277, protein:1.8, carbs:75,   fat:0.2,  fiber:7   }, gcc:true },
  // ─── Fats, Oils & Nuts ───
  { id:'b-olive-oil',         name:'Olive Oil',                  cat:'Fat/Oil',  mode:'ingredient', serving:'1 tbsp',      servingG:14,  per100g:{ kcal:884, protein:0,   carbs:0,    fat:100,  fiber:0   } },
  { id:'b-butter',            name:'Butter',                     cat:'Fat/Oil',  mode:'ingredient', serving:'1 tbsp',      servingG:14,  per100g:{ kcal:717, protein:0.9, carbs:0.1,  fat:81,   fiber:0   } },
  { id:'b-ghee',              name:'Ghee (Samn)',                cat:'Fat/Oil',  mode:'ingredient', serving:'1 tbsp',      servingG:13,  per100g:{ kcal:900, protein:0,   carbs:0,    fat:100,  fiber:0   }, gcc:true },
  { id:'b-lurpak',            name:'Lurpak Butter',              cat:'Fat/Oil',  mode:'ingredient', serving:'1 tbsp',      servingG:14,  per100g:{ kcal:720, protein:0.5, carbs:0.4,  fat:80,   fiber:0   }, gcc:true },
  { id:'b-almonds',           name:'Almonds',                    cat:'Nuts',     mode:'ingredient', serving:'1 handful',   servingG:28,  per100g:{ kcal:579, protein:21,  carbs:22,   fat:50,   fiber:12  } },
  { id:'b-peanut-butter',     name:'Peanut Butter',              cat:'Nuts',     mode:'ingredient', serving:'2 tbsp',      servingG:32,  per100g:{ kcal:588, protein:25,  carbs:20,   fat:50,   fiber:6   } },
  { id:'b-cashews',           name:'Cashews',                    cat:'Nuts',     mode:'ingredient', serving:'1 handful',   servingG:28,  per100g:{ kcal:553, protein:18,  carbs:30,   fat:44,   fiber:3.3 } },
  // ─── GCC / Kuwait Dishes ───
  { id:'b-hummus',            name:'Hummus',                     cat:'GCC',      mode:'dish',       serving:'3 tbsp',      servingG:75,  per100g:{ kcal:166, protein:8,   carbs:14,   fat:10,   fiber:6   }, gcc:true },
  { id:'b-falafel',           name:'Falafel (fried)',            cat:'GCC',      mode:'dish',       serving:'3 pieces',    servingG:90,  per100g:{ kcal:333, protein:13,  carbs:32,   fat:18,   fiber:5   }, gcc:true },
  { id:'b-shawarma-chicken',  name:'Shawarma Sandwich (chicken)',cat:'GCC',      mode:'dish',       serving:'1 sandwich',  servingG:250, per100g:{ kcal:195, protein:18,  carbs:8,    fat:10,   fiber:0.5 }, gcc:true },
  { id:'b-shawarma-meat',     name:'Shawarma Sandwich (meat)',   cat:'GCC',      mode:'dish',       serving:'1 sandwich',  servingG:250, per100g:{ kcal:218, protein:16,  carbs:7,    fat:14,   fiber:0.5 }, gcc:true },
  { id:'b-machboos',          name:'Machboos (chicken plate)',   cat:'GCC',      mode:'dish',       serving:'1 plate',     servingG:450, per100g:{ kcal:155, protein:9,   carbs:20,   fat:4,    fiber:1   }, gcc:true },
  { id:'b-kabsa',             name:'Kabsa / Maklouba',           cat:'GCC',      mode:'dish',       serving:'1 plate',     servingG:450, per100g:{ kcal:150, protein:7,   carbs:22,   fat:4.5,  fiber:0.8 }, gcc:true },
  { id:'b-harees',            name:'Harees',                     cat:'GCC',      mode:'dish',       serving:'1 bowl',      servingG:300, per100g:{ kcal:160, protein:8,   carbs:22,   fat:4,    fiber:0.5 }, gcc:true },
  { id:'b-margoog',           name:'Margoog',                    cat:'GCC',      mode:'dish',       serving:'1 bowl',      servingG:350, per100g:{ kcal:130, protein:7,   carbs:17,   fat:3.5,  fiber:1   }, gcc:true },
  { id:'b-luqaimat',          name:'Luqaimat',                   cat:'GCC',      mode:'dish',       serving:'5 pieces',    servingG:75,  per100g:{ kcal:320, protein:5,   carbs:45,   fat:14,   fiber:1   }, gcc:true },
  { id:'b-samboosa',          name:'Samboosa (meat)',            cat:'GCC',      mode:'dish',       serving:'1 piece',     servingG:50,  per100g:{ kcal:285, protein:10,  carbs:28,   fat:15,   fiber:1.5 }, gcc:true },
  { id:'b-balaleet',          name:'Balaleet',                   cat:'GCC',      mode:'dish',       serving:'1 serving',   servingG:200, per100g:{ kcal:310, protein:7,   carbs:48,   fat:10,   fiber:1   }, gcc:true },
  { id:'b-fattoush',          name:'Fattoush Salad',             cat:'GCC',      mode:'dish',       serving:'1 bowl',      servingG:200, per100g:{ kcal:58,  protein:1.5, carbs:10,   fat:2,    fiber:2   }, gcc:true },
  { id:'b-tabbouleh',         name:'Tabbouleh',                  cat:'GCC',      mode:'dish',       serving:'1 cup',       servingG:160, per100g:{ kcal:70,  protein:2,   carbs:12,   fat:3,    fiber:2   }, gcc:true },
  { id:'b-moutabal',          name:'Moutabal (Baba Ghanoush)',   cat:'GCC',      mode:'dish',       serving:'3 tbsp',      servingG:75,  per100g:{ kcal:68,  protein:2,   carbs:8,    fat:3.5,  fiber:2   }, gcc:true },
  { id:'b-jreesh',            name:'Jreesh',                     cat:'GCC',      mode:'dish',       serving:'1 bowl',      servingG:300, per100g:{ kcal:145, protein:5,   carbs:22,   fat:4,    fiber:1.5 }, gcc:true },
  // ─── Drinks ───
  { id:'b-water',             name:'Water',                      cat:'Drink',    mode:'drink',      serving:'1 glass',     servingG:250, per100g:{ kcal:0,   protein:0,   carbs:0,    fat:0,    fiber:0   } },
  { id:'b-arabic-coffee',     name:'Arabic Coffee (Gahwa)',      cat:'Drink',    mode:'drink',      serving:'1 demitasse', servingG:60,  per100g:{ kcal:3,   protein:0.2, carbs:0,    fat:0,    fiber:0   }, gcc:true },
  { id:'b-karak',             name:'Karak Chai',                 cat:'Drink',    mode:'drink',      serving:'1 cup',       servingG:200, per100g:{ kcal:45,  protein:1.5, carbs:6,    fat:1.5,  fiber:0   }, gcc:true },
  { id:'b-black-tea',         name:'Black Tea (no sugar)',       cat:'Drink',    mode:'drink',      serving:'1 mug',       servingG:240, per100g:{ kcal:1,   protein:0,   carbs:0.3,  fat:0,    fiber:0   } },
  { id:'b-coffee-black',      name:'Coffee (black)',             cat:'Drink',    mode:'drink',      serving:'1 cup',       servingG:240, per100g:{ kcal:2,   protein:0.3, carbs:0,    fat:0,    fiber:0   } },
  { id:'b-lemon-mint',        name:'Lemon Mint Juice',           cat:'Drink',    mode:'drink',      serving:'1 glass',     servingG:300, per100g:{ kcal:28,  protein:0.3, carbs:7,    fat:0.1,  fiber:0.2 }, gcc:true },
  { id:'b-kdd-laban',         name:'KDD Laban Drink',            cat:'Drink',    mode:'drink',      serving:'1 carton',    servingG:200, per100g:{ kcal:41,  protein:3.4, carbs:4.9,  fat:0.9,  fiber:0   }, gcc:true },
  { id:'b-pepsi',             name:'Pepsi / Coke (can)',         cat:'Drink',    mode:'drink',      serving:'1 can',       servingG:330, per100g:{ kcal:42,  protein:0,   carbs:10.6, fat:0,    fiber:0   } },
  { id:'b-orange-juice',      name:'Orange Juice (fresh)',       cat:'Drink',    mode:'drink',      serving:'1 glass',     servingG:240, per100g:{ kcal:45,  protein:0.7, carbs:10,   fat:0.2,  fiber:0.2 } },
  { id:'b-vimto',             name:'Vimto (diluted)',            cat:'Drink',    mode:'drink',      serving:'1 glass',     servingG:250, per100g:{ kcal:26,  protein:0,   carbs:6.5,  fat:0,    fiber:0   }, gcc:true },
  { id:'b-protein-shake',     name:'Whey Protein Shake',         cat:'Drink',    mode:'drink',      serving:'1 scoop',     servingG:35,  per100g:{ kcal:380, protein:74,  carbs:10,   fat:4,    fiber:1   } },
  { id:'b-red-bull',          name:'Red Bull (can)',             cat:'Drink',    mode:'drink',      serving:'1 can',       servingG:250, per100g:{ kcal:45,  protein:0,   carbs:11,   fat:0,    fiber:0   } },
];

let _foodSearchTimer  = null;
let _foodDate         = null; // null means "use today()" — set on init
let _foodResults      = [];
let _foodEditId       = null; // id of entry being edited
let _foodCatFilter    = 'all'; // category pill filter
let _builderItems     = [];   // quick-add builder accumulator

// ── Fuzzy search ───────────────────────────────────────────────
function _fuzzyScore(str, q) {
  const s = str.toLowerCase(), t = q.toLowerCase();
  if (s.includes(t)) return 2; // exact substring = best
  let score = 0, si = 0;
  for (let i = 0; i < t.length; i++) {
    const idx = s.indexOf(t[i], si);
    if (idx < 0) return 0; // all query chars must appear in order
    score += 1 / (idx - si + 1);
    si = idx + 1;
  }
  return score / t.length;
}
function _fuzzyFilter(items, q, key = 'name') {
  if (!q) return items;
  return items
    .map(f => ({ f, sc: _fuzzyScore(f[key] || '', q) }))
    .filter(x => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .map(x => x.f);
}

// ── Category filter ────────────────────────────────────────────
function _filterBuiltinByCat(foods) {
  const c = _foodCatFilter;
  if (c === 'all' || c === 'myfoods') return foods;
  if (c === 'protein') return foods.filter(f => f.cat === 'Protein');
  if (c === 'veg')     return foods.filter(f => f.cat === 'Vegetable');
  if (c === 'grains')  return foods.filter(f => f.cat === 'Grain');
  if (c === 'dairy')   return foods.filter(f => f.cat === 'Dairy');
  if (c === 'fruits')  return foods.filter(f => f.cat === 'Fruit');
  if (c === 'gcc')     return foods.filter(f => f.gcc);
  if (c === 'drinks')  return foods.filter(f => f.cat === 'Drink');
  if (c === 'dishes')  return foods.filter(f => f.mode === 'dish');
  return foods;
}

function setCatFilter(cat) {
  _foodCatFilter = cat;
  document.querySelectorAll('.food-cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.cat === cat);
  });
  const q = eid('foodSearchInput')?.value.trim();
  if (q) onFoodSearchInput(); else _showRecentFoods();
}

function _renderCatPills() {
  const el = eid('foodCatPills');
  if (!el) return;
  const cats = [
    { key:'all',     label:'All'      },
    { key:'myfoods', label:'My Foods' },
    { key:'protein', label:'Protein'  },
    { key:'veg',     label:'Veg'      },
    { key:'grains',  label:'Grains'   },
    { key:'dairy',   label:'Dairy'    },
    { key:'fruits',  label:'Fruits'   },
    { key:'gcc',     label:'GCC'      },
    { key:'drinks',  label:'Drinks'   },
    { key:'dishes',  label:'Dishes'   },
  ];
  el.innerHTML = `<div style="display:flex;gap:5px;overflow-x:auto;padding:6px 12px;scrollbar-width:none;-ms-overflow-style:none">
    ${cats.map(c => `<button class="fpill food-cat-pill${_foodCatFilter === c.key ? ' active' : ''}" data-cat="${c.key}"
      onclick="setCatFilter('${c.key}')" style="white-space:nowrap;font-size:0.61rem;padding:3px 9px;flex-shrink:0">${c.label}</button>`).join('')}
  </div>`;
}

// ── Single builtin food row (shared between browse + search) ───
function _builtinFoodRow(f) {
  const srvKcal = f.servingG ? Math.round(f.per100g.kcal * f.servingG / 100) : f.per100g.kcal;
  const srvLabel = f.serving || '100g';
  return `<div onclick="selectBuiltinFood('${f.id}')"
    style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
    onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
    <div style="flex:1;min-width:0">
      <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(f.name)}</div>
      <div style="font-size:0.58rem;color:var(--muted-lt);font-family:'DM Mono',monospace">${f.cat}${f.gcc ? ' \u00b7 <span style="color:var(--gold)">GCC</span>' : ''}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${srvKcal} kcal</div>
      <div style="font-size:0.56rem;color:var(--muted)">${srvLabel}</div>
    </div>
  </div>`;
}

// ── Builder (quick-add by ingredient) ─────────────────────────
function _addToBuilder(name, per100g, servingG) {
  const g = servingG || 100, ratio = g / 100;
  _builderItems.push({
    name,
    kcal:    Math.round((per100g.kcal    || 0) * ratio),
    protein: +((per100g.protein || 0) * ratio).toFixed(1),
    carbs:   +((per100g.carbs   || 0) * ratio).toFixed(1),
    fat:     +((per100g.fat     || 0) * ratio).toFixed(1),
    fiber:   +((per100g.fiber   || 0) * ratio).toFixed(1),
  });
  _renderBuilderPanel();
  toast(`${name} added to builder`);
}

function _removeBuilderItem(i) {
  _builderItems.splice(i, 1);
  _renderBuilderPanel();
}

function _renderBuilderPanel() {
  const el = eid('foodBuilderPanel');
  if (!el) return;
  if (!_builderItems.length) { el.innerHTML = ''; return; }
  const tot = _builderItems.reduce((s, i) => ({
    kcal: s.kcal + i.kcal, protein: s.protein + i.protein,
    carbs: s.carbs + i.carbs, fat: s.fat + i.fat
  }), { kcal:0, protein:0, carbs:0, fat:0 });
  el.innerHTML = `
    <div style="border-top:1px solid var(--border);padding:10px 14px;background:var(--deep)">
      <div style="font-size:0.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px">
        Builder \u00b7 ${_builderItems.length} item${_builderItems.length > 1 ? 's' : ''}
      </div>
      ${_builderItems.map((it, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;padding:3px 0">
          <span style="color:var(--cream);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(it.name)}</span>
          <span style="color:var(--gold-lt);font-family:'DM Mono',monospace;margin:0 8px;flex-shrink:0">${it.kcal} kcal</span>
          <button onclick="_removeBuilderItem(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.7rem;flex-shrink:0">\u2715</button>
        </div>`).join('')}
      <div style="display:flex;gap:10px;font-size:0.65rem;font-family:'DM Mono',monospace;margin:6px 0;padding-top:6px;border-top:1px solid var(--border)">
        <span style="color:var(--gold-lt);font-weight:500">${tot.kcal} kcal</span>
        <span>P ${tot.protein.toFixed(0)}g</span>
        <span>C ${tot.carbs.toFixed(0)}g</span>
        <span>F ${tot.fat.toFixed(0)}g</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <input id="builderMealName" class="add-inp" placeholder="Meal name\u2026" style="flex:1;font-size:0.72rem">
        <select id="builderMeal" class="add-inp" style="font-size:0.72rem;flex-shrink:0">
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snacks">Snacks</option>
        </select>
        <button class="btn btn-p" onclick="logBuilderMeal()" style="font-size:0.7rem;flex-shrink:0">Log</button>
      </div>
    </div>`;
  const mealSel = eid('builderMeal');
  if (mealSel) mealSel.value = _currentMeal;
}

function logBuilderMeal() {
  if (!_builderItems.length) { toast('Add some foods first'); return; }
  const name = eid('builderMealName')?.value.trim() || 'Custom Meal';
  const meal = eid('builderMeal')?.value || _currentMeal;
  const tot  = _builderItems.reduce((s, i) => ({
    kcal: s.kcal + i.kcal, protein: s.protein + i.protein,
    carbs: s.carbs + i.carbs, fat: s.fat + i.fat, fiber: (s.fiber || 0) + (i.fiber || 0)
  }), { kcal:0, protein:0, carbs:0, fat:0, fiber:0 });
  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];
  S.foodLog[_date].push({ id: uid(), name, brand: 'Meal', meal, grams: 0, ...tot, per100g: null });
  _builderItems = [];
  scheduleSave();
  closeFoodSearch();
  renderFoodTab();
  toast(`"${name}" logged`);
}
// _foodSearchTarget: null = add to diary  |  { type:'mealplan', planId, meal }  |  { type:'myfoods' }
let _foodSearchTarget = null;

// ── Init ─────────────────────────────────────────────────────

function _foodEffectiveDate() {
  return _foodDate || today();
}

function _dateOffset(days) {
  const d = new Date(today() + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function _foodStreak() {
  const log = S.foodLog || {};
  let streak = 0;
  const d = new Date(today() + 'T00:00:00');
  while ((log[d.toISOString().slice(0, 10)] || []).length > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function initFoodTab() {
  if (!S.foodLog)     S.foodLog     = {};
  if (!S.foodTargets) S.foodTargets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 };
  // Always reset to today on cold init — user can pick a different date from the picker
  _foodDate = today();
  _bindFoodDatePicker();
  renderFoodTab();
}

function _bindFoodDatePicker() {
  const dateEl = eid('foodDate');
  if (!dateEl) return;
  // Snap to today if null or stale (new day since last visit)
  if (!_foodDate) _foodDate = today();
  dateEl.value = _foodDate;
  // Re-bind each time so the handler always has a fresh closure
  dateEl.onchange = () => { _foodDate = dateEl.value || today(); renderFoodTab(); };
}

function setFoodToday() {
  _foodDate = today();
  _bindFoodDatePicker();
  renderFoodTab();
}

function renderFoodTab() {
  if (!S.foodLog)     S.foodLog     = {};
  if (!S.foodTargets) S.foodTargets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 };
  renderFoodDiaryHeader();
  renderFoodMacroBar();
  renderFoodMeals();
}

function renderFoodDiaryHeader() {
  const el = eid('foodDiaryHeader');
  if (!el) return;
  const streak    = _foodStreak();
  const yesterday = _dateOffset(-1);
  const date      = _foodEffectiveDate();
  const isToday   = date === today();
  const hasYest   = (S.foodLog?.[yesterday] || []).length > 0;

  const streakHtml = streak >= 2
    ? `<span style="font-size:0.66rem;color:var(--gold);font-family:'DM Mono',monospace">${streak} day streak</span>`
    : '';
  const copyBtn = isToday && hasYest
    ? `<button class="btn btn-g" style="font-size:0.64rem;padding:3px 8px" onclick="copyYesterday()">Copy Yesterday</button>`
    : '';

  if (!streakHtml && !copyBtn) { el.innerHTML = ''; return; }
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">${streakHtml}<div>${copyBtn}</div></div>`;
}

function copyYesterday() {
  const yesterday = _dateOffset(-1);
  const src = S.foodLog?.[yesterday] || [];
  if (!src.length) { toast('No entries yesterday to copy'); return; }
  const date = _foodEffectiveDate();
  if (!S.foodLog) S.foodLog = {};
  const existing = (S.foodLog[date] || []).length;
  if (existing > 0 && !confirm(`Today already has ${existing} entr${existing === 1 ? 'y' : 'ies'}. Add yesterday's ${src.length} items anyway?`)) return;
  if (!S.foodLog[date]) S.foodLog[date] = [];
  src.forEach(e => S.foodLog[date].push({ ...e, id: uid() }));
  scheduleSave();
  renderFoodTab();
  toast(`Copied ${src.length} items from yesterday`);
}

// ── Macro summary bar ─────────────────────────────────────────

function renderFoodMacroBar() {
  const el = eid('foodMacroBar');
  if (!el) return;
  const entries = S.foodLog[_foodEffectiveDate()] || [];
  const totals = _sumMacros(entries);
  const T = S.foodTargets || { kcal: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25 };

  const remaining = T.kcal - Math.round(totals.kcal);
  const over      = remaining < 0;
  const consumed  = Math.round(totals.kcal);
  const pct       = calcPercent(consumed, T.kcal);
  const near      = pct >= 80 && !over;
  const remColor  = over ? 'var(--petal)' : near ? 'var(--gold)' : 'var(--gold-lt)';
  const barColor  = over ? 'var(--petal)' : near ? 'var(--gold)' : 'var(--blush)';
  const itemCount = entries.length;

  el.innerHTML = `
    <!-- Calorie budget banner -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:1.6rem;font-family:'DM Mono',monospace;color:${remColor};font-weight:500;line-height:1">${Math.abs(remaining)}</div>
        <div style="font-size:0.62rem;color:var(--muted);margin-top:2px">${over ? 'kcal over goal' : 'kcal remaining'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace">${consumed} <span style="color:var(--muted)">/ ${T.kcal} eaten</span></div>
        <div style="font-size:0.58rem;color:var(--muted);margin-top:2px">${itemCount} item${itemCount!==1?'s':''} · <span style="cursor:pointer;text-decoration:underline" onclick="openFoodTargets()">Edit targets</span></div>
      </div>
    </div>
    <!-- Calorie progress bar -->
    <div style="height:5px;background:var(--mid);border-radius:3px;overflow:hidden;margin-bottom:14px">
      <div style="height:100%;width:100%;background:${barColor};border-radius:3px;transform-origin:left;transform:scaleX(${pct/100});transition:transform 0.3s"></div>
    </div>
    <!-- Macro grid -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${_macroCell('Protein', totals.protein, T.protein, 'g', 'var(--gold)')}
      ${_macroCell('Carbs',   totals.carbs,   T.carbs,   'g', 'var(--petal)')}
      ${_macroCell('Fat',     totals.fat,     T.fat,     'g', 'var(--muted-lt)')}
    </div>
    ${totals.fiber > 0 ? `
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px">
      <span style="font-size:0.62rem;color:var(--muted);min-width:28px">Fiber</span>
      <div style="flex:1;height:3px;background:var(--mid);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${calcPercent(totals.fiber, T.fiber)}%;background:var(--muted-lt);border-radius:2px"></div>
      </div>
      <span style="font-size:0.62rem;color:var(--muted-lt);font-family:'DM Mono',monospace">${Math.round(totals.fiber)}g <span style="color:var(--muted)">/ ${T.fiber||25}g</span></span>
    </div>` : ''}
  `;
}

function _macroCell(label, val, target, unit, color) {
  const pct = calcPercent(val, target);
  const over = val > target && target > 0;
  return `<div style="text-align:center">
    <div style="font-size:0.62rem;color:var(--muted);margin-bottom:3px">${label}</div>
    <div style="font-size:1rem;color:${over ? 'var(--petal)' : 'var(--cream)'};font-family:'DM Mono',monospace;font-weight:500">${Math.round(val)}</div>
    <div style="font-size:0.58rem;color:var(--muted)">${unit}${target ? ' / ' + target : ''}</div>
    <div style="height:4px;background:var(--mid);border-radius:3px;margin-top:4px;overflow:hidden">
      <div style="height:100%;width:100%;background:${over ? 'var(--petal)' : color};border-radius:3px;transform-origin:left;transform:scaleX(${pct/100});transition:transform 0.3s"></div>
    </div>
  </div>`;
}

function _sumMacros(entries) {
  return (entries || []).reduce((s, e) => ({
    kcal:    s.kcal    + (e.kcal    || 0),
    protein: s.protein + (e.protein || 0),
    carbs:   s.carbs   + (e.carbs   || 0),
    fat:     s.fat     + (e.fat     || 0),
    fiber:   s.fiber   + (e.fiber   || 0)
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

// ── Meal sections ─────────────────────────────────────────────

function renderFoodMeals() {
  const el = eid('foodMeals');
  if (!el) return;
  const entries = S.foodLog[_foodEffectiveDate()] || [];
  const T = S.foodTargets || {};
  el.innerHTML = MEAL_TYPES.map(meal => {
    const items  = entries.filter(e => e.meal === meal);
    const totals = _sumMacros(items);
    const mealPct = calcPercent(totals.kcal, T.kcal);
    return `
      <div style="margin-bottom:16px">
        <div style="margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${items.length ? '4px' : '0'}">
            <span style="font-size:0.72rem;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase">${MEAL_LABELS[meal]}</span>
            <div style="display:flex;align-items:center;gap:6px">
              ${items.length ? `<span style="font-size:0.66rem;color:var(--muted-lt);font-family:'DM Mono',monospace">${Math.round(totals.kcal)} kcal</span>` : ''}
              ${items.length ? `<button onclick="event.stopPropagation();copyMealTo('${meal}')" title="Copy meal to another slot" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted);cursor:pointer;font-size:0.56rem;padding:1px 5px;line-height:1.4">copy ⤴</button>` : ''}
            </div>
          </div>
          ${items.length ? `<div style="height:2px;background:var(--mid);border-radius:2px;overflow:hidden"><div style="height:100%;width:100%;background:var(--blush);opacity:0.55;border-radius:2px;transform-origin:left;transform:scaleX(${mealPct/100});transition:transform 0.3s"></div></div>` : ''}
        </div>
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden">
          ${items.length ? items.map(e => _foodEntryRow(e)).join('') : ''}
          <div onclick="openFoodSearch('${meal}')"
            style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;color:var(--muted);font-size:0.76rem;transition:background 0.12s;border-top:${items.length ? '1px solid var(--border)' : 'none'}"
            onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
            <span style="font-size:1rem;line-height:1">+</span> Add food
          </div>
        </div>
      </div>`;
  }).join('');
}

function copyMealTo(sourceMeal) {
  const otherMeals = MEAL_TYPES.filter(m => m !== sourceMeal);
  const choice = prompt(
    `Copy ${MEAL_LABELS[sourceMeal]} items to:\n` +
    otherMeals.map((m, i) => `${i + 1}. ${MEAL_LABELS[m]}`).join('\n') +
    '\n\nEnter number:'
  );
  if (choice === null) return; // user cancelled
  const idx = parseInt(choice) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= otherMeals.length) return;
  const targetMeal = otherMeals[idx];
  const d = _foodEffectiveDate();
  if (!S.foodLog[d]) S.foodLog[d] = [];
  const items = S.foodLog[d].filter(e => e.meal === sourceMeal);
  if (!items.length) { toast('Nothing to copy'); return; }
  items.forEach(e => {
    S.foodLog[d].push({ ...e, id: uid(), meal: targetMeal });
  });
  scheduleSave();
  renderFoodMeals();
  renderFoodDiaryHeader();
  toast(`Copied ${items.length} item${items.length !== 1 ? 's' : ''} to ${MEAL_LABELS[targetMeal]}`);
}

function _foodEntryRow(e) {
  // Determine qty display and step for inline adjustment.
  // Old My Foods entries lack perServing — infer it from stored macros (always logged at 1 serving).
  const effectivePerServing = e.perServing ||
    (!e.per100g && !e.grams ? { kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, fiber: e.fiber || 0 } : null);
  const canAdjust = !!(e.per100g || effectivePerServing);
  const isServings = !e.per100g && !!effectivePerServing;
  const step = isServings ? 0.5 : 25;
  const qtyLabel = isServings
    ? `\u00d7${+(e.servings || 1)}`
    : e.grams ? `${e.grams}g` : '';
  const macroLine = e.grams
    ? `P ${Math.round(e.protein)}g \u00b7 C ${Math.round(e.carbs)}g \u00b7 F ${Math.round(e.fat)}g`
    : `P ${Math.round(e.protein)}g \u00b7 C ${Math.round(e.carbs)}g \u00b7 F ${Math.round(e.fat)}g`;
  const btnStyle = 'background:none;border:none;cursor:pointer;flex-shrink:0;padding:0;line-height:1';
  const qtyVal = isServings ? (e.servings || 1) : (e.grams || 100);
  const adjHtml = canAdjust ? `
    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
      <button onclick="adjustFoodEntry('${e.id}',${-step})" style="${btnStyle};color:var(--muted);font-size:1.1rem;width:36px;height:36px;border-radius:50%;background:var(--mid);-webkit-tap-highlight-color:transparent" title="Less">\u2212</button>
      <input type="number" min="0" step="any" value="${qtyVal}"
        onchange="setFoodEntryQty('${e.id}',this.value)"
        onclick="this.select()"
        style="width:44px;background:var(--mid);border:1px solid var(--border);border-radius:5px;color:var(--cream);font-family:'DM Mono',monospace;font-size:16px;text-align:center;padding:4px 3px;-moz-appearance:textfield">
      <span style="font-size:0.58rem;color:var(--muted);margin-left:-1px">${isServings ? 'srv' : 'g'}</span>
      <button onclick="adjustFoodEntry('${e.id}',${step})" style="${btnStyle};color:var(--muted);font-size:1.1rem;width:36px;height:36px;border-radius:50%;background:var(--mid);-webkit-tap-highlight-color:transparent" title="More">+</button>
    </div>` : '';
  return `
    <div style="border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;padding:9px 14px 6px">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.8rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.name)}</div>
          ${e.brand ? `<div style="font-size:0.64rem;color:var(--muted)">${escapeHtml(e.brand)}</div>` : ''}
          <div style="font-size:0.64rem;color:var(--muted-lt);font-family:'DM Mono',monospace;margin-top:1px">${macroLine}</div>
        </div>
        ${adjHtml}
        <div style="text-align:right;flex-shrink:0;min-width:36px">
          <div style="font-size:0.86rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${Math.round(e.kcal)}</div>
          <div style="font-size:0.6rem;color:var(--muted)">kcal</div>
        </div>
        <button onclick="deleteFoodEntry('${e.id}')" style="${btnStyle};color:var(--muted);font-size:0.9rem;width:36px;height:36px;border-radius:50%;-webkit-tap-highlight-color:transparent">&#x2715;</button>
      </div>
      <textarea
        onchange="setFoodEntryNote('${e.id}',this.value)"
        placeholder="Recipe / notes…"
        style="display:block;width:100%;box-sizing:border-box;background:transparent;border:none;border-top:${e.notes ? '1px solid var(--border)' : 'none'};color:var(--muted);font-size:0.66rem;font-family:'DM Mono',monospace;resize:none;outline:none;padding:${e.notes ? '5px 14px 7px' : '0 14px'};line-height:1.4;transition:all 0.15s"
        rows="${e.notes ? Math.max(1, (e.notes.match(/\n/g)||[]).length + 1) : 1}"
        onfocus="if(!this.value){this.style.borderTop='1px solid var(--border)';this.style.padding='5px 14px 7px'}"
        onblur="if(!this.value){this.style.borderTop='none';this.style.padding='0 14px'}"
      >${escapeHtml(e.notes || '')}</textarea>
    </div>`;
}

// ── Food search ───────────────────────────────────────────────

let _currentMeal = 'breakfast';
let _foodMode    = 'search'; // 'search' | 'quick' | 'builder'

function openFoodSearch(meal) {
  _currentMeal = meal || 'breakfast';
  _foodResults = [];
  _foodCatFilter = 'all';
  _foodMode    = 'search';
  const modal = eid('mFoodSearch');
  if (!modal) return;
  modal.classList.add('open');
  _applyFoodMode('search');
  const qaMeal = eid('qaMeal');
  if (qaMeal) qaMeal.value = _currentMeal;
  const lbl = eid('foodMealLabel');
  if (lbl) lbl.textContent = MEAL_LABELS[meal] || meal;
  setTimeout(() => eid('foodSearchInput')?.focus(), 80);
}

function closeFoodSearch() {
  const modal = eid('mFoodSearch');
  if (modal) modal.classList.remove('open');
  _foodResults      = [];
  _foodEditId       = null;
  _foodSearchTarget = null;
}

function openFoodSearchForPlan(planId, meal) {
  _currentMeal = meal || 'breakfast';
  _foodSearchTarget = { type: 'mealplan', planId, meal };
  _foodResults = [];
  _foodMode = 'search';
  const modal = eid('mFoodSearch');
  if (!modal) return;
  modal.classList.add('open');
  _applyFoodMode('search');
  const lbl = eid('foodMealLabel');
  const plan = findById(S.mealPlans, planId);
  if (lbl) lbl.textContent = `${MEAL_LABELS[meal] || meal} \u00b7 ${escapeHtml(plan?.name || 'Plan')}`;
  const qaMeal = eid('qaMeal');
  if (qaMeal) qaMeal.value = meal;
  setTimeout(() => eid('foodSearchInput')?.focus(), 80);
}

function openFoodSearchForMyFoods() {
  _foodSearchTarget = { type: 'myfoods' };
  _foodResults = [];
  _foodMode = 'search';
  const modal = eid('mFoodSearch');
  if (!modal) return;
  modal.classList.add('open');
  _applyFoodMode('search');
  const lbl = eid('foodMealLabel');
  if (lbl) lbl.textContent = 'My Foods Library';
  setTimeout(() => eid('foodSearchInput')?.focus(), 80);
}

function setFoodMode(mode) {
  _foodMode = mode;
  _applyFoodMode(mode);
}

function _applyFoodMode(mode) {
  const searchInp      = eid('foodSearchInput');
  const catPills       = eid('foodCatPills');
  const resultsPane    = eid('foodSearchResults');
  const builderPanel   = eid('foodBuilderPanel');
  const quickForm      = eid('foodQuickAddForm');
  const addForm        = eid('foodAddForm');
  const modeBtnSearch  = eid('foodModeSearch');
  const modeBtnQuick   = eid('foodModeQuick');
  const modeBtnBuilder = eid('foodModeBuilder');

  [modeBtnSearch, modeBtnQuick, modeBtnBuilder].forEach(b => b?.classList.remove('active'));

  if (mode === 'quick') {
    if (searchInp)   searchInp.style.display  = 'none';
    if (catPills)    catPills.style.display    = 'none';
    if (resultsPane) resultsPane.style.display = 'none';
    if (builderPanel) builderPanel.innerHTML   = '';
    if (quickForm)   quickForm.style.display   = '';
    if (addForm)     addForm.style.display     = 'none';
    modeBtnQuick?.classList.add('active');
    const qaName = eid('qaName');
    if (qaName) { qaName.value = ''; setTimeout(() => qaName.focus(), 80); }
    ['qaKcal','qaProtein','qaCarbs','qaFat','qaFiber'].forEach(id => { const el = eid(id); if (el) el.value = ''; });
    const qaMeal = eid('qaMeal');
    if (qaMeal) qaMeal.value = _currentMeal;
    const hint = eid('qaCalcHint');
    if (hint) hint.textContent = '';
  } else if (mode === 'builder') {
    if (searchInp)   searchInp.style.display  = '';
    if (catPills)    catPills.style.display    = '';
    if (resultsPane) resultsPane.style.display = '';
    if (quickForm)   quickForm.style.display   = 'none';
    if (addForm)     addForm.style.display     = 'none';
    modeBtnBuilder?.classList.add('active');
    if (searchInp)   searchInp.value = '';
    _renderCatPills();
    _showRecentFoods();
    _renderBuilderPanel();
    setTimeout(() => searchInp?.focus(), 80);
  } else {
    // search mode
    if (searchInp)   searchInp.style.display  = '';
    if (catPills)    catPills.style.display    = '';
    if (resultsPane) resultsPane.style.display = '';
    if (builderPanel) builderPanel.innerHTML   = '';
    if (quickForm)   quickForm.style.display   = 'none';
    if (addForm)     addForm.style.display     = 'none';
    modeBtnSearch?.classList.add('active');
    if (searchInp)   searchInp.value = '';
    _renderCatPills();
    _showRecentFoods();
  }
}

function _backToSearch() {
  const addForm = eid('foodAddForm');
  if (addForm) addForm.style.display = 'none';
  const searchInp   = eid('foodSearchInput');
  const resultsPane = eid('foodSearchResults');
  if (searchInp)   searchInp.style.display   = '';
  if (resultsPane) resultsPane.style.display  = '';
  if (searchInp)   { searchInp.value = ''; searchInp.focus(); }
  _showRecentFoods();
}

function _getRecentFoods(limit = 10) {
  // Collect all entries across all days, deduplicate by name, most recent first
  const seen = new Set();
  const recents = [];
  const allDays = Object.keys(S.foodLog || {}).sort().reverse();
  for (const d of allDays) {
    for (const e of [...(S.foodLog[d] || [])].reverse()) {
      if (!e.name) continue;
      const key = e.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        recents.push(e);
        if (recents.length >= limit) return recents;
      }
    }
  }
  return recents;
}

function _customFoodRow(cf, i) {
  return `<div onclick="selectCustomFood(${i})"
    style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
    onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
    <div style="flex:1;min-width:0">
      <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(cf.name)}</div>
      <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace">P${Math.round(cf.protein||0)}g \u00b7 C${Math.round(cf.carbs||0)}g \u00b7 F${Math.round(cf.fat||0)}g</div>
    </div>
    <div style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(cf.kcal||0)} kcal</div>
  </div>`;
}

function _showRecentFoods() {
  const el = eid('foodSearchResults');
  if (!el) return;
  _renderCatPills();

  // ── My Foods category: show ALL custom foods ──
  if (_foodCatFilter === 'myfoods') {
    const all = S.customFoods || [];
    el.innerHTML = all.length
      ? `<div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--gold-lt);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">My Foods (${all.length})</div>
         ${all.map((cf, i) => _customFoodRow(cf, i)).join('')}`
      : `<div style="padding:28px 16px;text-align:center;font-size:0.76rem;color:var(--muted)">No custom foods yet.<br>Tap + Manual or search and save to My Foods.</div>`;
    el._customFoods = all;
    return;
  }

  // ── Standard view ──
  const recents     = _getRecentFoods(8);
  const customFoods = (S.customFoods || []).slice(0, 6);
  el._recentFoods = recents;
  el._customFoods = customFoods;

  const customHtml = (_foodCatFilter === 'all' && customFoods.length) ? `
    <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--gold-lt);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">My Foods</div>
    ${customFoods.map((cf, i) => _customFoodRow(cf, i)).join('')}` : '';

  const recentHtml = (_foodCatFilter === 'all' && recents.length) ? `
    <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">Recent</div>
    ${recents.map((r, i) => `
      <div onclick="selectRecentFood(${i})"
        style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
        onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)}</div>
          ${r.brand ? `<div style="font-size:0.62rem;color:var(--muted)">${escapeHtml(r.brand)}</div>` : ''}
        </div>
        <div style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(r.kcal)} kcal</div>
      </div>`).join('')}` : '';

  // ── Filtered basics ──
  const filtered = _filterBuiltinByCat(BUILTIN_FOODS);
  const quickIds = ['b-chicken-breast','b-white-rice','b-egg-whole','b-dates','b-karak','b-shawarma-chicken','b-hummus','b-laban'];
  const showAll  = _foodCatFilter !== 'all'; // show all when specific category selected
  const quick    = showAll ? filtered : filtered.filter(f => quickIds.includes(f.id));
  const rest     = showAll ? [] : filtered.filter(f => !quickIds.includes(f.id));
  const basicsHtml = filtered.length ? `
    <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">
      ${_foodCatFilter === 'all' ? 'Basics' : BUILTIN_FOODS.find(f => _filterBuiltinByCat([f]).length && f.cat) ? filtered[0]?.cat || 'Foods' : 'Foods'}
    </div>
    ${quick.map(f => _builtinFoodRow(f)).join('')}
    ${rest.length ? `
      <div id="builtinShowAll" onclick="eid('builtinFull').style.display='';this.style.display='none'"
        style="padding:8px 14px;font-size:0.68rem;color:var(--muted);cursor:pointer;text-align:center;border-bottom:1px solid var(--border)">
        Show all (${rest.length} more) \u2193
      </div>
      <div id="builtinFull" style="display:none">${rest.map(f => _builtinFoodRow(f)).join('')}</div>` : ''}` : '';

  el.innerHTML = customHtml + recentHtml + basicsHtml;
}

function selectCustomFood(i) {
  const el = eid('foodSearchResults');
  const customs = el?._customFoods || (S.customFoods || []).slice(0, 5);
  const cf = customs[i];
  if (!cf) return;
  eid('foodAddName').value  = cf.name;
  eid('foodAddBrand').value = '';
  _showFoodAddForm({ kcal: cf.kcal, protein: cf.protein, carbs: cf.carbs, fat: cf.fat, fiber: cf.fiber || 0 }, false, true);
}

function selectRecentFood(i) {
  const el = eid('foodSearchResults');
  const recents = el?._recentFoods || _getRecentFoods(10);
  const r = recents[i];
  if (!r) return;
  eid('foodAddName').value  = r.name;
  eid('foodAddBrand').value = r.brand || '';
  // If the recent entry has per100g, use grams mode; otherwise use servings mode
  if (r.per100g && r.per100g.kcal > 0 && r.grams > 0) {
    _showFoodAddForm(r.per100g, false, false);
    const gramsInp = eid('foodAddGrams');
    if (gramsInp) gramsInp.value = r.grams;
    _updateFoodMacroPreview();
  } else {
    _showFoodAddForm({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber || 0 }, false, true);
  }
}

function _builtinMatchHtml(matches) {
  if (!matches.length) return '';
  return `<div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--muted-lt);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">Basics</div>
    ${matches.map(f => _builtinFoodRow(f)).join('')}`;
}

function onFoodSearchInput() {
  clearTimeout(_foodSearchTimer);
  const q = eid('foodSearchInput')?.value.trim();
  if (!q) { _showRecentFoods(); return; }

  const myPool      = (_foodCatFilter === 'all' || _foodCatFilter === 'myfoods') ? (S.customFoods || []) : [];
  const myMatches   = _fuzzyFilter(myPool, q);
  const builtinPool = _filterBuiltinByCat(BUILTIN_FOODS);
  const builtinMatches = _fuzzyFilter(builtinPool, q);

  const resultsEl = eid('foodSearchResults');
  if (resultsEl) {
    const hasLocal = myMatches.length || builtinMatches.length;
    const searching = _foodCatFilter !== 'myfoods'
      ? `<div style="padding:${hasLocal ? '10px' : '20px'} 14px;font-size:0.72rem;color:var(--muted);text-align:center;${hasLocal ? 'border-top:1px solid var(--border)' : ''}">Searching database\u2026</div>`
      : '';
    resultsEl.innerHTML = _myFoodsMatchHtml(myMatches) + _builtinMatchHtml(builtinMatches) + searching;
  }
  if (_foodCatFilter !== 'myfoods') {
    _foodSearchTimer = setTimeout(() => _doFoodSearch(q), 400);
  }
}

function _myFoodsMatchHtml(matches) {
  if (!matches.length) return '';
  return `
    <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--gold-lt);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">My Foods</div>
    ${matches.map(cf => `
      <div onclick="selectSearchCustomFood('${cf.id}')"
        style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
        onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(cf.name)}</div>
          <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace">P${Math.round(cf.protein||0)}g \u00b7 C${Math.round(cf.carbs||0)}g \u00b7 F${Math.round(cf.fat||0)}g</div>
        </div>
        <div style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(cf.kcal||0)} kcal</div>
      </div>`).join('')}`;
}

async function _doFoodSearch(q) {
  const resultsEl = eid('foodSearchResults');
  if (!resultsEl) return;

  const myPool      = (_foodCatFilter === 'all' || _foodCatFilter === 'myfoods') ? (S.customFoods || []) : [];
  const myMatches   = _fuzzyFilter(myPool, q);
  const builtinPool = _filterBuiltinByCat(BUILTIN_FOODS);
  const builtinMatches = _fuzzyFilter(builtinPool, q);

  try {
    const [commRes, usdaRes] = await Promise.allSettled([
      _fetchCommunityFoods(q),
      _fetchUSDA(q)
    ]);

    const community = commRes.status === 'fulfilled' ? commRes.value : [];
    _foodResults    = usdaRes.status === 'fulfilled' ? usdaRes.value : [];
    _communityResults = community;

    if (!_foodResults.length && !community.length && !myMatches.length && !builtinMatches.length) {
      resultsEl.innerHTML = `
        <div style="padding:20px;text-align:center">
          <div style="font-size:0.78rem;color:var(--muted);margin-bottom:8px">No results for "${escapeHtml(q)}"</div>
          <div style="font-size:0.64rem;color:var(--muted);margin-bottom:12px">Add it manually or save to My Foods and share with the community</div>
          <button class="btn btn-p" style="font-size:0.72rem" onclick="setFoodMode('quick')">Add manually \u2192</button>
        </div>`;
      return;
    }

    const communityHtml = _communityMatchHtml(community);
    const dbHtml = _foodResults.length ? `
      <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">USDA Database</div>
      ${_foodResults.map((r, i) => `
        <div onclick="selectFoodResult(${i})"
          style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
          onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
          <div style="flex:1;min-width:0">
            <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)}</div>
            <div style="font-size:0.62rem;color:var(--muted)">${r.brand ? escapeHtml(r.brand) : 'USDA'}</div>
          </div>
          <div style="font-size:0.7rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(r.per100g.kcal)} kcal/100g</div>
        </div>`).join('')}` : '';

    resultsEl.innerHTML = _myFoodsMatchHtml(myMatches) + communityHtml + _builtinMatchHtml(builtinMatches) + dbHtml;

  } catch(e) {
    resultsEl.innerHTML = _myFoodsMatchHtml(myMatches) + _builtinMatchHtml(builtinMatches) + `
      <div style="padding:16px;text-align:center">
        <div style="font-size:0.72rem;color:var(--muted);margin-bottom:10px">Database unavailable</div>
        <button class="btn btn-p" style="font-size:0.72rem" onclick="setFoodMode('quick')">Add manually \u2192</button>
      </div>`;
  }
}

async function _fetchCommunityFoods(q) {
  if (typeof sb === 'undefined' || !sb) return [];
  const { data, error } = await sb
    .from('community_foods')
    .select('id,name,kcal,protein,carbs,fat,fiber,region')
    .ilike('name', `%${q}%`)
    .order('votes', { ascending: false })
    .limit(8);
  if (error || !data) return [];
  return data.map(r => ({
    _communityId: r.id,
    name:    r.name,
    region:  r.region || 'global',
    per100g: {
      kcal:    r.kcal    || 0,
      protein: r.protein || 0,
      carbs:   r.carbs   || 0,
      fat:     r.fat     || 0,
      fiber:   r.fiber   || 0
    }
  }));
}

function _communityMatchHtml(matches) {
  if (!matches.length) return '';
  return `
    <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--blush);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">Community</div>
    ${matches.map((cf, i) => `
      <div onclick="selectCommunityFood(${i})"
        style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
        onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''" data-cidx="${i}">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(cf.name)}</div>
          <div style="font-size:0.58rem;color:var(--muted-lt);font-family:'DM Mono',monospace">${cf.region === 'kuwait' || cf.region === 'gcc' ? '<span style="color:var(--gold)">GCC</span> \u00b7 ' : ''}Community</div>
        </div>
        <div style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(cf.per100g.kcal)} kcal/100g</div>
      </div>`).join('')}`;
}

function _cleanUsdaName(raw) {
  // USDA names look like: "Chicken, broilers or fryers, drumstick, meat only, cooked, braised"
  // Take first segment only, then append the most useful qualifier in parens if present
  const parts = raw.split(',').map(s => s.trim());
  const base = parts[0];
  const qualifier = parts[1] || '';
  // Skip generic qualifiers that add no useful info
  const skip = new Set(['raw','NFS','','NS as to type']);
  const label = (!skip.has(qualifier) && qualifier.length < 30)
    ? `${base} (${qualifier})`
    : base;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function _fetchUSDA(q) {
  if (typeof sb === 'undefined' || !sb) return [];
  const { data, error } = await sb
    .from('usda_foods')
    .select('fdc_id,name,category,kcal,protein,carbs,fat,fiber')
    .ilike('name', `%${q}%`)
    .limit(15);
  if (error || !data) return [];
  return data
    .filter(r => r.kcal > 0)
    .map(r => ({
      name:    _cleanUsdaName(r.name),
      brand:   r.category || '',
      per100g: { kcal: r.kcal, protein: r.protein || 0, carbs: r.carbs || 0, fat: r.fat || 0, fiber: r.fiber || 0 }
    }));
}

function selectFoodResult(i) {
  const r = _foodResults[i];
  if (!r) return;
  if (_foodSearchTarget?.type === 'myfoods') { _saveToMyFoodsFromResult(r.name, r.per100g); return; }
  if (_foodMode === 'builder') { _addToBuilder(r.name, r.per100g, 100); return; }
  eid('foodAddName').value  = r.name;
  eid('foodAddBrand').value = r.brand || '';
  _showFoodAddForm(r.per100g, false);
}

// Community foods results are stored temporarily for selection
let _communityResults = [];

function _communityMatchHtmlWithStore(matches) {
  _communityResults = matches;
  return _communityMatchHtml(matches);
}

function selectCommunityFood(i) {
  const cf = _communityResults[i];
  if (!cf) return;
  if (_foodSearchTarget?.type === 'myfoods') { _saveToMyFoodsFromResult(cf.name, cf.per100g); return; }
  if (_foodMode === 'builder') { _addToBuilder(cf.name, cf.per100g, 100); return; }
  eid('foodAddName').value  = cf.name;
  eid('foodAddBrand').value = cf.region === 'kuwait' || cf.region === 'gcc' ? 'Community GCC' : 'Community';
  _showFoodAddForm(cf.per100g, false);
}

function selectBuiltinFood(id) {
  const f = BUILTIN_FOODS.find(b => b.id === id);
  if (!f) return;
  if (_foodSearchTarget?.type === 'myfoods') { _saveToMyFoodsFromResult(f.name, f.per100g); return; }
  if (_foodMode === 'builder') { _addToBuilder(f.name, f.per100g, f.servingG); return; }
  eid('foodAddName').value  = f.name;
  eid('foodAddBrand').value = f.mode === 'dish' ? 'GCC Dish' : f.gcc ? 'GCC Basic' : 'Basic';
  _showFoodAddForm(f.per100g, false);
  // Default to the food's natural serving size instead of 100g
  if (f.servingG && f.servingG !== 100) {
    const gramsInp = eid('foodAddGrams');
    if (gramsInp) { gramsInp.value = f.servingG; _updateFoodMacroPreview(); }
  }
}

function _saveToMyFoodsFromResult(name, per100g) {
  if (!Array.isArray(S.customFoods)) S.customFoods = [];
  if (S.customFoods.some(cf => cf.name.toLowerCase() === name.toLowerCase())) {
    toast(`"${name}" already in My Foods`); return;
  }
  S.customFoods.push({ id: uid(), name, kcal: per100g.kcal, protein: per100g.protein, carbs: per100g.carbs, fat: per100g.fat, fiber: per100g.fiber || 0 });
  scheduleSave();
  closeFoodSearch();
  renderMyFoodsTab();
  toast(`"${name}" saved to My Foods`);
}

function selectSearchCustomFood(id) {
  const cf = findById(S.customFoods, id);
  if (!cf) return;
  if (_foodSearchTarget?.type === 'myfoods') { _saveToMyFoodsFromResult(cf.name, cf); return; }
  const per = { kcal: cf.kcal, protein: cf.protein, carbs: cf.carbs, fat: cf.fat, fiber: cf.fiber || 0 };
  if (_foodMode === 'builder') { _addToBuilder(cf.name, per, 100); return; }
  eid('foodAddName').value  = cf.name;
  eid('foodAddBrand').value = '';
  _showFoodAddForm(per, false, true);
}

function selectFoodManual() {
  eid('foodAddName').value  = '';
  eid('foodAddBrand').value = '';
  _showFoodAddForm(null, true);
}

// ── Quick Add ─────────────────────────────────────────────────

function _qaEstimateMacros() {
  // If only kcal is entered and protein/carbs/fat are all 0, show a hint
  const kcal    = parseFloat(eid('qaKcal')?.value) || 0;
  const protein = parseFloat(eid('qaProtein')?.value) || 0;
  const carbs   = parseFloat(eid('qaCarbs')?.value) || 0;
  const fat     = parseFloat(eid('qaFat')?.value) || 0;
  const hint    = eid('qaCalcHint');
  if (!hint) return;
  if (kcal > 0 && protein === 0 && carbs === 0 && fat === 0) {
    hint.textContent = 'Tip: enter protein/carbs/fat for full macro tracking, or leave blank for kcal-only.';
  } else {
    const fromMacros = protein * 4 + carbs * 4 + fat * 9;
    if (fromMacros > 0 && Math.abs(fromMacros - kcal) > 20) {
      hint.textContent = `Macro total: ~${Math.round(fromMacros)} kcal (differs from entered ${Math.round(kcal)})`;
    } else {
      hint.textContent = '';
    }
  }
}

function saveQuickAdd() {
  const name    = eid('qaName')?.value.trim();
  const kcal    = parseFloat(eid('qaKcal')?.value)    || 0;
  const protein = parseFloat(eid('qaProtein')?.value) || 0;
  const carbs   = parseFloat(eid('qaCarbs')?.value)   || 0;
  const fat     = parseFloat(eid('qaFat')?.value)     || 0;
  const fiber   = parseFloat(eid('qaFiber')?.value)   || 0;
  const meal    = eid('qaMeal')?.value || _currentMeal;

  if (!name)          { toast('Enter a food name'); return; }
  if (!kcal && !protein && !carbs && !fat) { toast('Enter at least calories or macros'); return; }

  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];

  // F10: Optionally save to custom foods library
  const saveCustom = eid('qaSaveCustom')?.checked;
  const isEdit = _foodEditId !== null;
  if (saveCustom && !isEdit) {
    if (!Array.isArray(S.customFoods)) S.customFoods = [];
    const exists = S.customFoods.some(cf => cf.name.toLowerCase() === name.toLowerCase());
    if (!exists) S.customFoods.push({ id: uid(), name, kcal, protein, carbs, fat, fiber });
  }

  // Dispatch to meal plan if target set
  if (_foodSearchTarget?.type === 'mealplan' && !isEdit) {
    const plan = (S.mealPlans || []).find(p => p.id === _foodSearchTarget.planId);
    if (!plan) { toast('Plan not found'); return; }
    if (!plan.foods) plan.foods = [];
    plan.foods.push({ id: uid(), name, brand: '', meal: _foodSearchTarget.meal, grams: 0, kcal, protein, carbs, fat, fiber, per100g: null });
    scheduleSave();
    closeFoodSearch();
    renderMealPlansList();
    toast(`${name} added to ${MEAL_LABELS[_foodSearchTarget.meal] || 'plan'}`);
    return;
  }

  if (_foodEditId !== null) {
    // Update existing entry
    const idx = S.foodLog[_date].findIndex(e => String(e.id) === String(_foodEditId));
    if (idx >= 0) {
      const existing = S.foodLog[_date][idx];
      S.foodLog[_date][idx] = { ...existing, name, meal, kcal, protein, carbs, fat, fiber };
    }
    _foodEditId = null;
  } else {
    S.foodLog[_date].push({
      id: uid(),
      name, brand: '', meal, grams: 0,
      kcal, protein, carbs, fat, fiber,
      per100g: null
    });
  }

  scheduleSave();
  closeFoodSearch();
  renderFoodTab();
  toast(`${name} added${saveCustom && !isEdit ? ' · saved to My Foods' : ''}`);
}

// servingsMode=true  → input = servings (×1, ×2…), per100g holds per-1-serving values
// servingsMode=false → input = grams,    per100g holds per-100g values
function _showFoodAddForm(per100g, manual, servingsMode = false) {
  const form = eid('foodAddForm');
  if (!form) return;
  form.style.display = '';
  eid('foodSearchResults').style.display = 'none';
  eid('foodSearchInput').style.display   = 'none';

  const macroFields = eid('foodManualMacros');
  macroFields.style.display = manual ? '' : 'none';

  form._per100g      = per100g;
  form._manual       = manual;
  form._servingsMode = servingsMode;

  const gramsInp = eid('foodAddGrams');
  const gramsLbl = eid('foodAddGramsLabel');
  const presets  = eid('foodAddPresets');

  const nameRow  = eid('foodAddNameRow');
  const brandRow = eid('foodAddBrandRow');
  const titleEl  = eid('foodAddTitle');

  if (servingsMode) {
    // Hide name/brand fields — food is already identified; show title instead
    if (nameRow)  nameRow.style.display  = 'none';
    if (brandRow) brandRow.style.display = 'none';
    if (titleEl) {
      const foodName = eid('foodAddName')?.value.trim() || '';
      titleEl.textContent = foodName;
      titleEl.style.display = foodName ? '' : 'none';
    }
    if (gramsLbl) gramsLbl.textContent = 'Servings';
    if (gramsInp) { gramsInp.value = '1'; gramsInp.step = 'any'; gramsInp.min = '0'; }
    if (presets)  presets.innerHTML = [0.5, 1, 1.5, 2, 3].map(n =>
      `<button type="button" onclick="eid('foodAddGrams').value='${n}';_updateFoodMacroPreview()" style="background:var(--mid);border:1px solid var(--border);border-radius:6px;color:var(--muted-lt);cursor:pointer;font-size:0.62rem;padding:3px 8px">\u00d7${n}</button>`
    ).join('');
    setTimeout(() => gramsInp?.focus(), 50);
  } else {
    // Show name/brand fields normally, hide title
    if (nameRow)  nameRow.style.display  = '';
    if (brandRow) brandRow.style.display = '';
    if (titleEl)  titleEl.style.display  = 'none';
    if (gramsLbl) gramsLbl.textContent = 'Grams';
    if (gramsInp) { gramsInp.value = '100'; gramsInp.step = 'any'; gramsInp.min = '0'; }
    if (presets)  presets.innerHTML = [50, 100, 150, 200, 300].map(g =>
      `<button type="button" onclick="eid('foodAddGrams').value='${g}';_updateFoodMacroPreview()" style="background:var(--mid);border:1px solid var(--border);border-radius:6px;color:var(--muted-lt);cursor:pointer;font-size:0.62rem;padding:3px 8px">${g}g</button>`
    ).join('');
  }

  const mealSel = eid('foodAddMeal');
  if (mealSel) mealSel.value = _currentMeal;
  _updateFoodMacroPreview();
}

function _updateFoodMacroPreview() {
  const form = eid('foodAddForm');
  if (!form) return;
  const qty   = parseFloat(eid('foodAddGrams')?.value) ?? (form._servingsMode ? 1 : 100);
  const p100  = form._per100g;
  const preview = eid('foodMacroPreview');
  if (!preview) return;
  if (form._manual || !p100) { preview.innerHTML = ''; return; }
  // servingsMode: ratio = qty (servings × per-serving values)
  // gramsMode:    ratio = qty/100
  const ratio = form._servingsMode ? qty : qty / 100;
  const label = form._servingsMode
    ? `${qty} serving${qty !== 1 ? 's' : ''}`
    : `${qty}g`;
  preview.innerHTML = `
    <div style="font-size:0.6rem;color:var(--muted);margin-bottom:4px">${label}</div>
    <div style="display:flex;gap:12px;font-size:0.68rem;font-family:'DM Mono',monospace;color:var(--muted-lt);flex-wrap:wrap">
      <span style="color:var(--gold-lt)">${Math.round(p100.kcal * ratio)} kcal</span>
      <span>P ${(p100.protein * ratio).toFixed(1)}g</span>
      <span>C ${(p100.carbs * ratio).toFixed(1)}g</span>
      <span>F ${(p100.fat * ratio).toFixed(1)}g</span>
    </div>`;
}

function saveFoodEntry() {
  const form    = eid('foodAddForm');
  const name    = eid('foodAddName')?.value.trim();
  const brand   = eid('foodAddBrand')?.value.trim() || '';
  const grams   = parseFloat(eid('foodAddGrams')?.value) ?? 100;
  const meal    = eid('foodAddMeal')?.value || _currentMeal;
  if (!name) { toast('Enter a food name'); return; }

  let kcal, protein, carbs, fat, fiber, per100g;
  if (form._manual || !form._per100g) {
    kcal    = parseFloat(eid('foodManualKcal')?.value)    || 0;
    protein = parseFloat(eid('foodManualProtein')?.value) || 0;
    carbs   = parseFloat(eid('foodManualCarbs')?.value)   || 0;
    fat     = parseFloat(eid('foodManualFat')?.value)     || 0;
    fiber   = parseFloat(eid('foodManualFiber')?.value)   || 0;
    per100g = { kcal, protein, carbs, fat, fiber };
  } else {
    const r = form._per100g;
    // servingsMode: grams field holds servings count; ratio = servings
    // gramsMode:    grams field holds actual grams;   ratio = grams/100
    const ratio = form._servingsMode ? grams : grams / 100;
    kcal    = r.kcal    * ratio;
    protein = r.protein * ratio;
    carbs   = r.carbs   * ratio;
    fat     = r.fat     * ratio;
    fiber   = r.fiber   * ratio;
    per100g = form._servingsMode ? null : r; // servings-based entries have no per100g
  }

  const storedGrams = form._servingsMode ? 0 : grams;
  const entry = { id: uid(), name, brand, meal, grams: storedGrams, kcal, protein, carbs, fat, fiber, per100g };
  // Store per-serving data so inline +/- adjustment is possible later
  if (form._servingsMode && !form._manual && form._per100g) {
    entry.perServing = { kcal: form._per100g.kcal, protein: form._per100g.protein, carbs: form._per100g.carbs, fat: form._per100g.fat, fiber: form._per100g.fiber || 0 };
    entry.servings   = grams; // grams field held the servings count
  }

  // Dispatch to meal plan if target set
  if (_foodSearchTarget?.type === 'mealplan') {
    const plan = (S.mealPlans || []).find(p => p.id === _foodSearchTarget.planId);
    if (!plan) { toast('Plan not found'); return; }
    if (!plan.foods) plan.foods = [];
    entry.meal = _foodSearchTarget.meal;
    plan.foods.push(entry);
    scheduleSave();
    closeFoodSearch();
    renderMealPlansList();
    toast(`${name} added to ${MEAL_LABELS[_foodSearchTarget.meal] || 'plan'}`);
    return;
  }

  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];
  S.foodLog[_date].push(entry);
  const _dayEntries = S.foodLog[_date];
  const _dayKcal = _dayEntries.reduce((s, e) => s + (e.kcal || 0), 0);
  pushFeedEvent('food_day', null, { date: _date, calories: _dayKcal, items: _dayEntries.length });
  scheduleSave();
  closeFoodSearch();
  renderFoodTab();
  toast(`${name} added`);
}

function editFoodEntry(id) {
  const _date = _foodEffectiveDate();
  const entry = findById(S.foodLog?.[_date], id);
  if (!entry) return;
  _currentMeal = entry.meal || 'breakfast';
  _foodEditId  = id;
  const modal = eid('mFoodSearch');
  if (!modal) return;
  modal.classList.add('open');
  _applyFoodMode('quick');
  const lbl = eid('foodMealLabel');
  if (lbl) lbl.textContent = MEAL_LABELS[entry.meal] || entry.meal;
  // Pre-fill Quick Add fields
  setTimeout(() => {
    const qaName = eid('qaName'); if (qaName) qaName.value = entry.name || '';
    const qaKcal = eid('qaKcal'); if (qaKcal) qaKcal.value = entry.kcal || '';
    const qaProtein = eid('qaProtein'); if (qaProtein) qaProtein.value = entry.protein || '';
    const qaCarbs = eid('qaCarbs'); if (qaCarbs) qaCarbs.value = entry.carbs || '';
    const qaFat = eid('qaFat'); if (qaFat) qaFat.value = entry.fat || '';
    const qaFiber = eid('qaFiber'); if (qaFiber) qaFiber.value = entry.fiber || '';
    const qaMeal = eid('qaMeal'); if (qaMeal) qaMeal.value = entry.meal || _currentMeal;
  }, 80);
}

function deleteFoodEntry(id) {
  const _date = _foodEffectiveDate();
  if (!S.foodLog?.[_date]) return;
  const entry = findById(S.foodLog[_date], id);
  if (!entry) return;
  toastUndo(`"${entry.name}" removed`, () => {
    if (!S.foodLog[_date]) S.foodLog[_date] = [];
    S.foodLog[_date].push(entry);
    scheduleSave();
    renderFoodTab();
  });
  S.foodLog[_date] = S.foodLog[_date].filter(e => String(e.id) !== String(id));
  scheduleSave();
  renderFoodTab();
}

function setFoodEntryNote(id, value) {
  const _date = _foodEffectiveDate();
  const entries = S.foodLog?.[_date];
  if (!entries) return;
  const e = findById(entries, id);
  if (!e) return;
  e.notes = value.trim();
  scheduleSave();
}

function _resolvePerServing(e) {
  // Returns per-serving macros regardless of whether entry was saved with new or old format.
  // When perServing is absent, divide stored totals by current servings so repeated +/- calls
  // always scale from the true per-serving base rather than the already-scaled total.
  if (e.perServing) return e.perServing;
  if (!e.per100g && !e.grams) {
    const s = e.servings || 1;
    return { kcal: (e.kcal || 0) / s, protein: (e.protein || 0) / s, carbs: (e.carbs || 0) / s, fat: (e.fat || 0) / s, fiber: (e.fiber || 0) / s };
  }
  return null;
}

function setFoodEntryQty(id, rawVal) {
  const val = parseFloat(rawVal);
  if (!val || val <= 0) return;
  const _date = _foodEffectiveDate();
  const entries = S.foodLog?.[_date];
  if (!entries) return;
  const idx = entries.findIndex(e => String(e.id) === String(id));
  if (idx < 0) return;
  const e = entries[idx];
  if (e.per100g) {
    const r = e.per100g, ratio = val / 100;
    entries[idx] = { ...e, grams: val, kcal: r.kcal * ratio, protein: r.protein * ratio, carbs: r.carbs * ratio, fat: r.fat * ratio, fiber: (r.fiber || 0) * ratio };
  } else {
    const ps = _resolvePerServing(e);
    if (!ps) return;
    entries[idx] = { ...e, servings: val, kcal: ps.kcal * val, protein: ps.protein * val, carbs: ps.carbs * val, fat: ps.fat * val, fiber: (ps.fiber || 0) * val };
  }
  scheduleSave();
  renderFoodTab();
}

function adjustFoodEntry(id, delta) {
  const _date = _foodEffectiveDate();
  const entries = S.foodLog?.[_date];
  if (!entries) return;
  const idx = entries.findIndex(e => String(e.id) === String(id));
  if (idx < 0) return;
  const e = entries[idx];
  if (e.per100g) {
    const newGrams = Math.max(25, (e.grams || 100) + delta);
    const r = e.per100g, ratio = newGrams / 100;
    entries[idx] = { ...e, grams: newGrams, kcal: r.kcal * ratio, protein: r.protein * ratio, carbs: r.carbs * ratio, fat: r.fat * ratio, fiber: (r.fiber || 0) * ratio };
  } else {
    const ps = _resolvePerServing(e);
    if (!ps) return;
    const newServings = Math.max(0.5, (e.servings || 1) + delta);
    entries[idx] = { ...e, servings: newServings, kcal: ps.kcal * newServings, protein: ps.protein * newServings, carbs: ps.carbs * newServings, fat: ps.fat * newServings, fiber: (ps.fiber || 0) * newServings };
  }
  scheduleSave();
  renderFoodTab();
}

// ── Food targets modal ────────────────────────────────────────

function openFoodTargets() {
  const T = S.foodTargets || {};
  eid('ftKcal').value    = T.kcal    || 2000;
  eid('ftProtein').value = T.protein || 150;
  eid('ftCarbs').value   = T.carbs   || 200;
  eid('ftFat').value     = T.fat     || 65;
  const ftFiber = eid('ftFiber');
  if (ftFiber) ftFiber.value = T.fiber || 25;
  openModal('mFoodTargets');
}

function saveFoodTargets() {
  if (!S.foodTargets) S.foodTargets = {};
  S.foodTargets.kcal    = parseFloat(eid('ftKcal')?.value)    || 2000;
  S.foodTargets.protein = parseFloat(eid('ftProtein')?.value) || 150;
  S.foodTargets.carbs   = parseFloat(eid('ftCarbs')?.value)   || 200;
  S.foodTargets.fat     = parseFloat(eid('ftFat')?.value)     || 65;
  S.foodTargets.fiber   = parseFloat(eid('ftFiber')?.value)   || 25;
  scheduleSave();
  closeModal('mFoodTargets');
  renderFoodMacroBar();
  toast('Targets saved');
}

// ── Food sub-tab switching ────────────────────────────────────

let _foodSubTab = 'diary';

function setFoodTab(tab) {
  _foodSubTab = tab;
  ['diary','history','meals','myfoods'].forEach(t => {
    const btn  = eid(`ftab${t.charAt(0).toUpperCase()+t.slice(1)}`);
    const pane = eid(`foodPane${t.charAt(0).toUpperCase()+t.slice(1)}`);
    const active = t === tab;
    if (btn)  btn.classList.toggle('active', active);
    if (pane) pane.style.display = active ? '' : 'none';
  });
  if (tab === 'history') renderFoodHistory();
  if (tab === 'meals')   renderMealPlansList();
  if (tab === 'diary')   renderFoodTab();
  if (tab === 'myfoods') renderMyFoodsTab();
}

// ── Food History (diary log of past days) ────────────────────

let _foodHistLimit = 30;

function renderFoodHistory() {
  const el = eid('foodHistoryList');
  if (!el) return;
  const log = S.foodLog || {};
  // All days that have at least one entry, newest first
  const allDays = Object.keys(log)
    .filter(d => log[d] && log[d].length > 0)
    .sort()
    .reverse();
  const days = allDays.slice(0, _foodHistLimit);

  if (!days.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:24px;text-align:center">No food logged yet — start in the Diary tab</div>`;
    return;
  }

  function _foodHistDayHtml(d) {
    const entries = log[d];
    const totals  = _sumMacros(entries);
    const T       = S.foodTargets || {};
    const pct     = calcPercent(totals.kcal, T.kcal);
    const over    = T.kcal && totals.kcal >= T.kcal;
    const near    = T.kcal && !over && pct >= 80;
    const calColor = over ? 'var(--petal)' : near ? 'var(--gold)' : 'var(--gold-lt)';
    const barColor = over ? 'var(--petal)' : near ? 'var(--gold)' : 'var(--blush)';
    const dateLabel = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    const isToday  = d === today();
    return `
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px;cursor:pointer"
           onclick="setFoodDateAndDiary('${d}')"
           onmouseenter="this.style.borderColor='var(--blush)'" onmouseleave="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:0.82rem;color:var(--cream)">${dateLabel}${isToday ? ' <span style="font-size:0.6rem;color:var(--blush);margin-left:4px">Today</span>' : ''}</span>
          <span style="font-size:0.86rem;color:${calColor};font-family:'DM Mono',monospace">${Math.round(totals.kcal)} kcal</span>
        </div>
        <div style="height:4px;background:var(--mid);border-radius:3px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px"></div>
        </div>
        <div style="display:flex;gap:14px;font-size:0.66rem;font-family:'DM Mono',monospace;color:var(--muted)">
          <span>P <span style="color:var(--gold)">${Math.round(totals.protein)}g</span></span>
          <span>C <span style="color:var(--petal)">${Math.round(totals.carbs)}g</span></span>
          <span>F <span style="color:var(--muted-lt)">${Math.round(totals.fat)}g</span></span>
          <span style="margin-left:auto">${entries.length} item${entries.length!==1?'s':''}</span>
        </div>
      </div>`;
  }

  el.innerHTML = days.map(_foodHistDayHtml).join('');

  if (allDays.length > _foodHistLimit) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-g';
    btn.style.cssText = 'width:100%;margin-top:4px;font-size:0.68rem';
    btn.textContent = `Load more (${allDays.length - _foodHistLimit} remaining)`;
    btn.onclick = () => {
      const nextDays = allDays.slice(_foodHistLimit, _foodHistLimit + 30);
      _foodHistLimit += 30;
      btn.remove();
      nextDays.forEach(d => {
        el.insertAdjacentHTML('beforeend', _foodHistDayHtml(d));
      });
      if (allDays.length > _foodHistLimit) {
        const newBtn = btn.cloneNode(false);
        newBtn.textContent = `Load more (${allDays.length - _foodHistLimit} remaining)`;
        newBtn.onclick = btn.onclick;
        el.appendChild(newBtn);
      }
    };
    el.appendChild(btn);
  }
}

function setFoodDateAndDiary(d) {
  _foodDate = d;
  const dateEl = eid('foodDate');
  if (dateEl) dateEl.value = d;
  setFoodTab('diary');
}

// ── Meal Plans — workout-card style ──────────────────────────

const _expandedPlans = new Set();

function toggleMealPlan(id) {
  const key = String(id);
  if (_expandedPlans.has(key)) _expandedPlans.delete(key);
  else _expandedPlans.add(key);
  renderMealPlansList();
}

function renameMealPlan(id, val) {
  const plan = findById(S.mealPlans, id);
  if (plan) { plan.name = val.trim() || plan.name; scheduleSave(); renderMealPlansList(); }
}

function renderMealPlansList() {
  const el = eid('mealPlansList');
  if (!el) return;
  const plans = S.mealPlans || [];
  if (!plans.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:48px 24px">
        <div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div>
        <div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:8px">No meal plans yet</div>
        <div style="font-size:0.72rem;color:var(--muted-lt);max-width:220px;margin:0 auto;line-height:1.6">Log a full day of food, then click "Save Today as Plan"</div>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'progs-grid';

  plans.forEach((plan, i) => {
    const totals   = _sumMacros(plan.foods || []);
    const expanded = _expandedPlans.has(String(plan.id));
    const foodCount = (plan.foods || []).length;

    // Group foods by meal for expanded view
    const byMeal = {};
    (plan.foods || []).forEach(f => {
      const m = f.meal || 'snacks';
      if (!byMeal[m]) byMeal[m] = [];
      byMeal[m].push(f);
    });

    const expandedBody = expanded ? `
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        ${MEAL_TYPES.map(m => `
          <div style="margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:0.58rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace">
                ${MEAL_LABELS[m]}${(byMeal[m]||[]).length ? ` <span style="color:var(--gold-lt)">${Math.round(_sumMacros(byMeal[m]).kcal)} kcal</span>` : ''}
              </span>
              <button onclick="event.stopPropagation();openFoodSearchForPlan('${plan.id}','${m}')" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted-lt);cursor:pointer;font-size:0.6rem;padding:2px 7px">+ Add</button>
            </div>
            ${(byMeal[m]||[]).length ? byMeal[m].map(f => `
              <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);font-size:0.74rem">
                <span style="color:var(--mist);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(f.name)}</span>
                <span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:0.64rem;flex-shrink:0">${Math.round(f.kcal)} kcal</span>
                <button onclick="event.stopPropagation();removeMealPlanFood('${plan.id}','${f.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.62rem;padding:0 2px;flex-shrink:0">\u2715</button>
              </div>`).join('') : `<div style="font-size:0.66rem;color:var(--muted);padding:4px 0;font-style:italic">Empty</div>`}
          </div>`).join('')}
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
          <button class="btn btn-d" style="font-size:0.66rem;padding:4px 9px" onclick="deleteMealPlan('${plan.id}')">Remove</button>
          <div style="display:flex;gap:6px">
            <button class="btn btn-g" style="font-size:0.66rem;padding:4px 10px" onclick="openGroceryList('${plan.id}')">🛒 Grocery</button>
            <button class="btn btn-p" style="font-size:0.68rem;padding:5px 12px" onclick="applyMealPlan('${plan.id}')">Apply to Today</button>
          </div>
        </div>
      </div>` : '';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <!-- Header — always visible, click to expand -->
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="toggleMealPlan('${plan.id}')">
        <input
          class="editable wk-title-inp"
          value="${escapeAttr(plan.name || '')}"
          onchange="renameMealPlan('${plan.id}', this.value)"
          onclick="event.stopPropagation()"
          title="Rename plan"
          style="flex:1;background:none;border:none;color:var(--mist);font-size:0.88rem"
        >
        <span style="font-size:0.55rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${foodCount} item${foodCount!==1?'s':''}</span>
        <span style="font-size:0.75rem;color:var(--blush);flex-shrink:0">${expanded ? '▾' : '▸'}</span>
      </div>
      <!-- Macro summary — always visible -->
      <div style="display:flex;gap:12px;margin-top:8px;font-size:0.66rem;font-family:'DM Mono',monospace">
        <span style="color:var(--gold-lt)">${Math.round(totals.kcal)} kcal</span>
        <span style="color:var(--gold)">P ${Math.round(totals.protein)}g</span>
        <span style="color:var(--petal)">C ${Math.round(totals.carbs)}g</span>
        <span style="color:var(--muted-lt)">F ${Math.round(totals.fat)}g</span>
      </div>
      ${expandedBody}`;

    grid.appendChild(card);
  });

  el.innerHTML = '';
  el.appendChild(grid);
}

function openSaveMealPlan() {
  const entries = S.foodLog?.[_foodEffectiveDate()] || [];
  if (!entries.length) { toast('No food logged today to save'); return; }
  eid('mealPlanName').value = '';
  const totals = _sumMacros(entries);
  const prev = eid('mealPlanPreview');
  if (prev) prev.innerHTML = `${entries.length} items · ${Math.round(totals.kcal)} kcal · P ${Math.round(totals.protein)}g · C ${Math.round(totals.carbs)}g · F ${Math.round(totals.fat)}g`;
  eid('mSaveMealPlan').classList.add('open');
  setTimeout(() => eid('mealPlanName')?.focus(), 80);
}

function saveMealPlan() {
  const name = eid('mealPlanName')?.value.trim();
  if (!name) { toast('Enter a plan name'); return; }
  const entries = (S.foodLog?.[_foodEffectiveDate()] || []).map(e => ({...e}));
  if (!entries.length) { toast('No food to save'); return; }
  if (!S.mealPlans) S.mealPlans = [];
  S.mealPlans.push({ id: uid(), name, foods: entries, createdOn: today() });
  scheduleSave();
  eid('mSaveMealPlan').classList.remove('open');
  renderMealPlansList();
  toast(`"${name}" saved`);
}

function applyMealPlan(id) {
  const plan = findById(S.mealPlans, id);
  if (!plan || !Array.isArray(plan.foods) || !plan.foods.length) return;
  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];
  plan.foods.forEach(f => S.foodLog[_date].push({ ...f, id: uid() }));
  scheduleSave();
  setFoodTab('diary');
  renderFoodTab();
  toast(`"${plan.name}" applied to ${_date === today() ? 'today' : _date}`);
}

function deleteMealPlan(id) {
  if (!S.mealPlans) return;
  const idx = S.mealPlans.findIndex(p => String(p.id) === String(id));
  if (idx < 0) return;
  const plan = S.mealPlans[idx];
  if (!confirm(`Remove meal plan "${plan.name}"?`)) return;
  const backup = JSON.parse(JSON.stringify(plan));
  S.mealPlans.splice(idx, 1);
  scheduleSave();
  renderMealPlansList();
  toastUndo(`"${plan.name}" removed`, () => {
    if (!S.mealPlans) S.mealPlans = [];
    S.mealPlans.splice(idx, 0, backup);
    scheduleSave();
    renderMealPlansList();
  });
}

function removeMealPlanFood(planId, foodId) {
  const plan = findById(S.mealPlans, planId);
  if (!plan) return;
  const removed = findById(plan.foods, foodId);
  plan.foods = (plan.foods || []).filter(f => String(f.id) !== String(foodId));
  scheduleSave();
  renderMealPlansList();
  if (removed) toast(`"${removed.name}" removed`);
}

function createBlankMealPlan() {
  const name = prompt('Plan name (e.g. Bulk Day, Cut Day):');
  if (!name?.trim()) return;
  if (!S.mealPlans) S.mealPlans = [];
  const plan = { id: uid(), name: name.trim(), foods: [], createdOn: today() };
  S.mealPlans.push(plan);
  _expandedPlans.add(plan.id);
  scheduleSave();
  renderMealPlansList();
  toast(`"${plan.name}" created`);
}

// ── My Foods library management ───────────────────────────────

let _myFoodEditId = null;

function renderMyFoodsTab() {
  const el = eid('myFoodsList');
  if (!el) return;
  const q = (eid('myFoodsSearch')?.value || '').toLowerCase().trim();
  const foods = (S.customFoods || []).filter(cf => !q || cf.name.toLowerCase().includes(q));

  if (!foods.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:24px;text-align:center;line-height:1.7">
      ${q ? `No foods matching "${escapeHtml(q)}"` : 'No saved foods yet'}<br>
      <span style="font-size:0.68rem">Tap <b style="color:var(--cream)">+ Add</b> to save a food, or use <b style="color:var(--cream)">Quick Add</b> in the diary<br>and check "Save to My Foods"</span>
    </div>`;
    return;
  }

  const isLoggedIn = typeof currentUser !== 'undefined' && currentUser;

  el.innerHTML = foods.map(cf => `
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:11px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
      <div style="flex:1;min-width:0">
        <div style="font-size:0.82rem;color:var(--cream)">${escapeHtml(cf.name)}</div>
        <div style="font-size:0.62rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">
          ${Math.round(cf.kcal||0)} kcal \u00b7 P${Math.round(cf.protein||0)}g \u00b7 C${Math.round(cf.carbs||0)}g \u00b7 F${Math.round(cf.fat||0)}g${cf.fiber ? ` \u00b7 Fiber ${Math.round(cf.fiber)}g` : ''}
        </div>
        ${cf._shared ? `<div style="font-size:0.56rem;color:var(--blush);margin-top:2px">\u2713 Shared with community</div>` : ''}
      </div>
      ${isLoggedIn ? `<button onclick="${cf._shared ? `unshareCommunityFood('${cf.id}')` : `shareToCommunity('${cf.id}')`}" style="background:none;border:none;color:${cf._shared ? 'var(--blush)' : 'var(--muted)'};cursor:pointer;font-size:0.7rem;padding:4px 6px;flex-shrink:0" title="${cf._shared ? 'Unshare from community' : 'Share with community'}">${cf._shared ? '\u2193' : '\u2191'}</button>` : ''}
      <button onclick="editCustomFood('${cf.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.72rem;padding:4px 6px;flex-shrink:0" title="Edit">\u270e</button>
      <button onclick="deleteCustomFood('${cf.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.76rem;padding:4px 6px;flex-shrink:0">\u2715</button>
    </div>`).join('');
}

async function unshareCommunityFood(id) {
  if (typeof sb === 'undefined' || !sb || !currentUser) { toast('Sign in to manage shared foods'); return; }
  const cf = findById(S.customFoods, id);
  if (!cf || !cf._shared) return;
  if (!confirm(`Remove "${cf.name}" from the community database?`)) return;
  // Delete by matching name + user_id (community_foods has no app_id)
  const { error } = await sb.from('community_foods')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('name', cf.name);
  if (error) { toast('Unshare failed — ' + (error.message || 'try again')); return; }
  cf._shared = false;
  scheduleSave();
  renderMyFoodsTab();
  toast(`"${cf.name}" removed from community`);
}

async function shareToCommunity(id) {
  if (typeof sb === 'undefined' || !sb || !currentUser) { toast('Sign in to share foods'); return; }
  const cf = findById(S.customFoods, id);
  if (!cf) return;
  if (cf._shared) { toast('Already shared'); return; }

  const region = (currentProfile?.country || '').toLowerCase().includes('kw') ||
                 (currentProfile?.country || '').toLowerCase().includes('kuwait') ? 'kuwait' : 'global';

  const { error } = await sb.from('community_foods').insert({
    user_id: currentUser.id,
    name:    cf.name,
    kcal:    cf.kcal    || 0,
    protein: cf.protein || 0,
    carbs:   cf.carbs   || 0,
    fat:     cf.fat     || 0,
    fiber:   cf.fiber   || 0,
    region
  });

  if (error) { toast('Share failed — ' + (error.message || 'try again')); return; }

  // Mark as shared in local state
  cf._shared = true;
  scheduleSave();
  renderMyFoodsTab();
  toast(`"${cf.name}" shared with the community`);
}

function openAddToMyFoods() {
  _myFoodEditId = null;
  const title = eid('myFoodEditTitle');
  if (title) title.textContent = 'Add to My Foods';
  ['mfeeName','mfeeKcal','mfeeProtein','mfeeCarbs','mfeeFat','mfeeFiber'].forEach(id => {
    const el = eid(id); if (el) el.value = '';
  });
  eid('mMyFoodEdit').classList.add('open');
  setTimeout(() => eid('mfeeName')?.focus(), 80);
}

function editCustomFood(id) {
  const cf = findById(S.customFoods, id);
  if (!cf) return;
  _myFoodEditId = id;
  const title = eid('myFoodEditTitle');
  if (title) title.textContent = 'Edit Food';
  const set = (elId, val) => { const el = eid(elId); if (el) el.value = val || ''; };
  set('mfeeName',    cf.name);
  set('mfeeKcal',    cf.kcal    || '');
  set('mfeeProtein', cf.protein || '');
  set('mfeeCarbs',   cf.carbs   || '');
  set('mfeeFat',     cf.fat     || '');
  set('mfeeFiber',   cf.fiber   || '');
  eid('mMyFoodEdit').classList.add('open');
  setTimeout(() => eid('mfeeName')?.focus(), 80);
}

function saveMyFoodEdit() {
  const name    = eid('mfeeName')?.value.trim();
  const kcal    = parseFloat(eid('mfeeKcal')?.value)    || 0;
  const protein = parseFloat(eid('mfeeProtein')?.value) || 0;
  const carbs   = parseFloat(eid('mfeeCarbs')?.value)   || 0;
  const fat     = parseFloat(eid('mfeeFat')?.value)     || 0;
  const fiber   = parseFloat(eid('mfeeFiber')?.value)   || 0;
  if (!name) { toast('Enter a name'); return; }
  if (!kcal && !protein && !carbs && !fat) { toast('Enter at least calories or macros'); return; }

  if (!Array.isArray(S.customFoods)) S.customFoods = [];

  if (_myFoodEditId !== null) {
    const idx = S.customFoods.findIndex(cf => String(cf.id) === String(_myFoodEditId));
    if (idx >= 0) S.customFoods[idx] = { ...S.customFoods[idx], name, kcal, protein, carbs, fat, fiber };
  } else {
    const exists = S.customFoods.some(cf => cf.name.toLowerCase() === name.toLowerCase());
    if (exists) { toast('A food with that name already exists'); return; }
    S.customFoods.push({ id: uid(), name, kcal, protein, carbs, fat, fiber });
  }

  _myFoodEditId = null;
  scheduleSave();
  eid('mMyFoodEdit').classList.remove('open');
  renderMyFoodsTab();
  toast(`${name} saved to My Foods`);
}

function deleteCustomFood(id) {
  if (!Array.isArray(S.customFoods)) return;
  const idx = S.customFoods.findIndex(cf => String(cf.id) === String(id));
  if (idx < 0) return;
  const removed = { ...S.customFoods[idx] };
  S.customFoods.splice(idx, 1);
  scheduleSave();
  renderMyFoodsTab();
  toastUndo(`"${removed.name}" removed`, () => {
    if (!Array.isArray(S.customFoods)) S.customFoods = [];
    S.customFoods.splice(idx, 0, removed);
    scheduleSave();
    renderMyFoodsTab();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GROCERY LIST
// ─────────────────────────────────────────────────────────────────────────────

function openGroceryList(planId) {
  const plan = findById(S.mealPlans, planId);
  if (!plan) return;

  // Merge plan foods into saved grocery list (S.groceryList)
  if (!Array.isArray(S.groceryList)) S.groceryList = [];

  // Deduplicate by name (case-insensitive) — add new items unchecked
  (plan.foods || []).forEach(f => {
    const name = (f.name || '').trim();
    if (!name) return;
    const exists = S.groceryList.some(g => g.name.toLowerCase() === name.toLowerCase());
    if (!exists) S.groceryList.push({ id: uid(), name, checked: false, planId });
  });

  scheduleSave();
  renderGroceryModal();
  openModal('mGroceryList');
}

function renderGroceryModal() {
  const el = eid('groceryItems');
  if (!el) return;
  const list = S.groceryList || [];

  if (!list.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px 0;font-size:0.72rem;color:var(--muted)">No items — open a meal plan and tap 🛒 Grocery to populate.</div>`;
    return;
  }

  const unchecked = list.filter(g => !g.checked);
  const checked   = list.filter(g => g.checked);

  function itemHtml(g) {
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-lt)">
      <div onclick="groceryToggle('${g.id}')" style="width:20px;height:20px;border-radius:50%;border:2px solid ${g.checked ? 'var(--blush)' : 'var(--border)'};background:${g.checked ? 'var(--blush)' : 'transparent'};flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center">
        ${g.checked ? `<svg width="10" height="8" viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1" fill="none" stroke="var(--cream)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
      </div>
      <span style="flex:1;font-size:0.8rem;color:${g.checked ? 'var(--muted)' : 'var(--mist)'};text-decoration:${g.checked ? 'line-through' : 'none'}">${escapeHtml(g.name)}</span>
      <button onclick="groceryRemove('${g.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.7rem;padding:2px 4px">✕</button>
    </div>`;
  }

  el.innerHTML = unchecked.map(itemHtml).join('') +
    (checked.length ? `<div style="font-size:0.58rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin:10px 0 4px;font-family:'DM Mono',monospace">In basket</div>` + checked.map(itemHtml).join('') : '');
}

function groceryToggle(id) {
  const item = (S.groceryList || []).find(g => g.id === id);
  if (!item) return;
  item.checked = !item.checked;
  scheduleSave();
  renderGroceryModal();
}

function groceryRemove(id) {
  if (!Array.isArray(S.groceryList)) return;
  S.groceryList = S.groceryList.filter(g => g.id !== id);
  scheduleSave();
  renderGroceryModal();
}

function groceryAddManual() {
  const inp = eid('groceryManualInput');
  if (!inp) return;
  const name = inp.value.trim();
  if (!name) return;
  if (!Array.isArray(S.groceryList)) S.groceryList = [];
  const exists = S.groceryList.some(g => g.name.toLowerCase() === name.toLowerCase());
  if (!exists) S.groceryList.push({ id: uid(), name, checked: false });
  inp.value = '';
  scheduleSave();
  renderGroceryModal();
}

function groceryClearChecked() {
  if (!Array.isArray(S.groceryList)) return;
  S.groceryList = S.groceryList.filter(g => !g.checked);
  scheduleSave();
  renderGroceryModal();
}
