'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// exercises.js — Master exercise database
// Each entry: { id, name, muscles (primary), secondaryMuscles, equipment, pattern, category }
// muscles / secondaryMuscles use canonical group keys for heatmap:
//   chest | back | shoulders | biceps | triceps | forearms |
//   core | glutes | quads | hamstrings | calves | traps | lats | neck
// pattern: push | pull | hinge | squat | carry | core | cardio | stretch | other
// category: barbell | dumbbell | machine | cable | bodyweight | kettlebell |
//            band | cardio | stretch | olympic | calisthenics
// ─────────────────────────────────────────────────────────────────────────────

const EXERCISE_DB = [

  // ══════════════════════════════════════════
  // CHEST
  // ══════════════════════════════════════════
  { id:'e-bench-press',            name:'Barbell Bench Press',              muscles:['chest'],          secondary:['shoulders','triceps'],          equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-incline-bench',          name:'Incline Barbell Bench Press',      muscles:['chest'],          secondary:['shoulders','triceps'],          equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-decline-bench',          name:'Decline Barbell Bench Press',      muscles:['chest'],          secondary:['triceps'],                     equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-close-grip-bench',       name:'Close Grip Bench Press',           muscles:['triceps'],        secondary:['chest','shoulders'],           equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-db-bench',               name:'Dumbbell Bench Press',             muscles:['chest'],          secondary:['shoulders','triceps'],          equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-db-incline',             name:'Incline Dumbbell Press',           muscles:['chest'],          secondary:['shoulders','triceps'],          equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-db-decline',             name:'Decline Dumbbell Press',           muscles:['chest'],          secondary:['triceps'],                     equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-db-fly',                 name:'Dumbbell Fly',                     muscles:['chest'],          secondary:['shoulders'],                   equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-incline-fly',            name:'Incline Dumbbell Fly',             muscles:['chest'],          secondary:['shoulders'],                   equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-cable-fly',              name:'Cable Fly (High to Low)',          muscles:['chest'],          secondary:['shoulders'],                   equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-cable-fly-low',          name:'Cable Fly (Low to High)',          muscles:['chest'],          secondary:['shoulders'],                   equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-cable-crossover',        name:'Cable Crossover',                  muscles:['chest'],          secondary:['shoulders'],                   equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-pec-deck',               name:'Pec Deck / Machine Fly',           muscles:['chest'],          secondary:[],                              equipment:'machine',     pattern:'push',   category:'machine' },
  { id:'e-chest-press-machine',    name:'Chest Press Machine',              muscles:['chest'],          secondary:['shoulders','triceps'],          equipment:'machine',     pattern:'push',   category:'machine' },
  { id:'e-smith-bench',            name:'Smith Machine Bench Press',        muscles:['chest'],          secondary:['shoulders','triceps'],          equipment:'machine',     pattern:'push',   category:'machine' },
  { id:'e-pushup',                 name:'Push-Up',                          muscles:['chest'],          secondary:['shoulders','triceps'],          equipment:'bodyweight',  pattern:'push',   category:'bodyweight' },
  { id:'e-wide-pushup',            name:'Wide Grip Push-Up',                muscles:['chest'],          secondary:['shoulders','triceps'],          equipment:'bodyweight',  pattern:'push',   category:'bodyweight' },
  { id:'e-diamond-pushup',         name:'Diamond Push-Up',                  muscles:['triceps'],        secondary:['chest'],                       equipment:'bodyweight',  pattern:'push',   category:'bodyweight' },
  { id:'e-archer-pushup',          name:'Archer Push-Up',                   muscles:['chest'],          secondary:['triceps','shoulders'],          equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },
  { id:'e-dips-chest',             name:'Chest Dips',                       muscles:['chest'],          secondary:['triceps','shoulders'],          equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },

  // ══════════════════════════════════════════
  // BACK — LATS
  // ══════════════════════════════════════════
  { id:'e-pullup',                 name:'Pull-Up',                          muscles:['lats'],           secondary:['biceps','traps'],               equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-chinup',                 name:'Chin-Up',                          muscles:['lats'],           secondary:['biceps'],                      equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-assisted-pullup',        name:'Assisted Pull-Up',                 muscles:['lats'],           secondary:['biceps'],                      equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-lat-pulldown',           name:'Lat Pulldown',                     muscles:['lats'],           secondary:['biceps','traps'],               equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-lat-pulldown-wide',      name:'Wide Grip Lat Pulldown',           muscles:['lats'],           secondary:['biceps'],                      equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-lat-pulldown-close',     name:'Close Grip Lat Pulldown',          muscles:['lats'],           secondary:['biceps'],                      equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-lat-pulldown-reverse',   name:'Reverse Grip Lat Pulldown',        muscles:['lats'],           secondary:['biceps'],                      equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-straight-arm-pulldown',  name:'Straight Arm Pulldown',            muscles:['lats'],           secondary:['core'],                        equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-single-arm-pulldown',    name:'Single Arm Lat Pulldown',          muscles:['lats'],           secondary:['biceps'],                      equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-db-pullover',            name:'Dumbbell Pullover',                muscles:['lats'],           secondary:['chest','traps'],                equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-bb-pullover',            name:'Barbell Pullover',                 muscles:['lats'],           secondary:['chest'],                       equipment:'barbell',     pattern:'pull',   category:'barbell' },

  // ══════════════════════════════════════════
  // BACK — ROWS
  // ══════════════════════════════════════════
  { id:'e-bb-row',                 name:'Barbell Bent-Over Row',            muscles:['back'],           secondary:['lats','biceps','traps'],        equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-bb-row-overhand',        name:'Barbell Row (Overhand)',           muscles:['back'],           secondary:['lats','traps','biceps'],        equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-bb-row-underhand',       name:'Barbell Row (Underhand)',          muscles:['back'],           secondary:['biceps','lats'],                equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-pendlay-row',            name:'Pendlay Row',                      muscles:['back'],           secondary:['lats','traps'],                 equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-tbar-row',               name:'T-Bar Row',                        muscles:['back'],           secondary:['lats','biceps'],                equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-db-row',                 name:'Dumbbell Bent-Over Row',           muscles:['back'],           secondary:['lats','biceps'],                equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-db-row-single',          name:'Single Arm Dumbbell Row',          muscles:['back'],           secondary:['lats','biceps'],                equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-seated-cable-row',       name:'Seated Cable Row',                 muscles:['back'],           secondary:['lats','biceps'],                equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-seated-row-wide',        name:'Seated Cable Row (Wide Grip)',     muscles:['back'],           secondary:['lats'],                        equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-cable-row-single',       name:'Single Arm Cable Row',             muscles:['back'],           secondary:['lats','biceps'],                equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-machine-row',            name:'Machine Row',                      muscles:['back'],           secondary:['lats','biceps'],                equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-chest-supported-row',    name:'Chest Supported Row',              muscles:['back'],           secondary:['lats'],                        equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-inverted-row',           name:'Inverted Row',                     muscles:['back'],           secondary:['biceps'],                      equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-face-pull',              name:'Face Pull',                        muscles:['traps'],          secondary:['shoulders','back'],             equipment:'cable',       pattern:'pull',   category:'cable' },

  // ══════════════════════════════════════════
  // BACK — TRAPS / UPPER BACK
  // ══════════════════════════════════════════
  { id:'e-shrug-bb',               name:'Barbell Shrug',                    muscles:['traps'],          secondary:[],                              equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-shrug-db',               name:'Dumbbell Shrug',                   muscles:['traps'],          secondary:[],                              equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-shrug-cable',            name:'Cable Shrug',                      muscles:['traps'],          secondary:[],                              equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-shrug-machine',          name:'Machine Shrug',                    muscles:['traps'],          secondary:[],                              equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-upright-row-bb',         name:'Barbell Upright Row',              muscles:['traps'],          secondary:['shoulders'],                   equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-upright-row-db',         name:'Dumbbell Upright Row',             muscles:['traps'],          secondary:['shoulders'],                   equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-deadrow',                name:'Meadows Row',                      muscles:['back'],           secondary:['lats','biceps'],                equipment:'barbell',     pattern:'pull',   category:'barbell' },

  // ══════════════════════════════════════════
  // SHOULDERS
  // ══════════════════════════════════════════
  { id:'e-ohp',                    name:'Overhead Press (Barbell)',         muscles:['shoulders'],      secondary:['triceps','traps'],               equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-push-press',             name:'Push Press',                       muscles:['shoulders'],      secondary:['triceps','quads'],               equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-db-ohp',                 name:'Dumbbell Overhead Press',          muscles:['shoulders'],      secondary:['triceps'],                      equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-arnold-press',           name:'Arnold Press',                     muscles:['shoulders'],      secondary:['triceps'],                      equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-seated-db-press',        name:'Seated Dumbbell Press',            muscles:['shoulders'],      secondary:['triceps'],                      equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-machine-press-shoulder', name:'Machine Shoulder Press',           muscles:['shoulders'],      secondary:['triceps'],                      equipment:'machine',     pattern:'push',   category:'machine' },
  { id:'e-smith-ohp',              name:'Smith Machine Overhead Press',     muscles:['shoulders'],      secondary:['triceps'],                      equipment:'machine',     pattern:'push',   category:'machine' },
  { id:'e-lateral-raise-db',       name:'Lateral Raise (Dumbbell)',         muscles:['shoulders'],      secondary:[],                              equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-lateral-raise-cable',    name:'Lateral Raise (Cable)',            muscles:['shoulders'],      secondary:[],                              equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-lateral-raise-machine',  name:'Lateral Raise (Machine)',          muscles:['shoulders'],      secondary:[],                              equipment:'machine',     pattern:'push',   category:'machine' },
  { id:'e-front-raise-db',         name:'Front Raise (Dumbbell)',           muscles:['shoulders'],      secondary:[],                              equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-front-raise-bb',         name:'Front Raise (Barbell)',            muscles:['shoulders'],      secondary:[],                              equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-front-raise-cable',      name:'Front Raise (Cable)',              muscles:['shoulders'],      secondary:[],                              equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-rear-delt-fly-db',       name:'Rear Delt Fly (Dumbbell)',         muscles:['shoulders'],      secondary:['traps','back'],                 equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-rear-delt-fly-cable',    name:'Rear Delt Fly (Cable)',            muscles:['shoulders'],      secondary:['traps'],                       equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-rear-delt-machine',      name:'Rear Delt Machine',                muscles:['shoulders'],      secondary:['traps'],                       equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-pec-deck-reverse',       name:'Reverse Pec Deck',                 muscles:['shoulders'],      secondary:['traps','back'],                 equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-pike-pushup',            name:'Pike Push-Up',                     muscles:['shoulders'],      secondary:['triceps'],                     equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },
  { id:'e-hspu',                   name:'Handstand Push-Up',                muscles:['shoulders'],      secondary:['triceps','traps'],               equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },
  { id:'e-cuban-press',            name:'Cuban Press',                      muscles:['shoulders'],      secondary:['traps'],                       equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },

  // ══════════════════════════════════════════
  // BICEPS
  // ══════════════════════════════════════════
  { id:'e-curl-bb',                name:'Barbell Curl',                     muscles:['biceps'],         secondary:['forearms'],                    equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-curl-ez',                name:'EZ Bar Curl',                      muscles:['biceps'],         secondary:['forearms'],                    equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-curl-db',                name:'Dumbbell Curl',                    muscles:['biceps'],         secondary:['forearms'],                    equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-curl-db-alt',            name:'Alternating Dumbbell Curl',        muscles:['biceps'],         secondary:['forearms'],                    equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-hammer-curl',            name:'Hammer Curl',                      muscles:['biceps'],         secondary:['forearms'],                    equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-incline-curl',           name:'Incline Dumbbell Curl',            muscles:['biceps'],         secondary:[],                              equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-concentration-curl',     name:'Concentration Curl',               muscles:['biceps'],         secondary:[],                              equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-preacher-curl-bb',       name:'Preacher Curl (Barbell)',          muscles:['biceps'],         secondary:[],                              equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-preacher-curl-db',       name:'Preacher Curl (Dumbbell)',         muscles:['biceps'],         secondary:[],                              equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-cable-curl',             name:'Cable Curl',                       muscles:['biceps'],         secondary:['forearms'],                    equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-cable-curl-single',      name:'Single Arm Cable Curl',            muscles:['biceps'],         secondary:[],                              equipment:'cable',       pattern:'pull',   category:'cable' },
  { id:'e-machine-curl',           name:'Machine Curl',                     muscles:['biceps'],         secondary:[],                              equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-reverse-curl',           name:'Reverse Curl',                     muscles:['forearms'],       secondary:['biceps'],                      equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-spider-curl',            name:'Spider Curl',                      muscles:['biceps'],         secondary:[],                              equipment:'barbell',     pattern:'pull',   category:'barbell' },
  { id:'e-cross-body-curl',        name:'Cross Body Hammer Curl',           muscles:['biceps'],         secondary:['forearms'],                    equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },
  { id:'e-zottman-curl',           name:'Zottman Curl',                     muscles:['biceps'],         secondary:['forearms'],                    equipment:'dumbbell',    pattern:'pull',   category:'dumbbell' },

  // ══════════════════════════════════════════
  // TRICEPS
  // ══════════════════════════════════════════
  { id:'e-skullcrusher',           name:'Skull Crusher (EZ Bar)',           muscles:['triceps'],        secondary:[],                              equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-skullcrusher-db',        name:'Skull Crusher (Dumbbell)',         muscles:['triceps'],        secondary:[],                              equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-tricep-pushdown',        name:'Tricep Pushdown (Bar)',            muscles:['triceps'],        secondary:[],                              equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-tricep-pushdown-rope',   name:'Tricep Pushdown (Rope)',           muscles:['triceps'],        secondary:[],                              equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-tricep-pushdown-single', name:'Single Arm Tricep Pushdown',      muscles:['triceps'],        secondary:[],                              equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-overhead-tricep-cable',  name:'Overhead Tricep Extension (Cable)',muscles:['triceps'],        secondary:[],                              equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-overhead-tricep-db',     name:'Overhead Tricep Extension (DB)',   muscles:['triceps'],        secondary:[],                              equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-overhead-tricep-bb',     name:'Overhead Tricep Extension (BB)',   muscles:['triceps'],        secondary:[],                              equipment:'barbell',     pattern:'push',   category:'barbell' },
  { id:'e-dips-tricep',            name:'Tricep Dips',                      muscles:['triceps'],        secondary:['chest','shoulders'],           equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },
  { id:'e-bench-dip',              name:'Bench Dip',                        muscles:['triceps'],        secondary:['shoulders'],                   equipment:'bodyweight',  pattern:'push',   category:'bodyweight' },
  { id:'e-machine-tricep',         name:'Tricep Machine',                   muscles:['triceps'],        secondary:[],                              equipment:'machine',     pattern:'push',   category:'machine' },
  { id:'e-kickback-db',            name:'Tricep Kickback (Dumbbell)',       muscles:['triceps'],        secondary:[],                              equipment:'dumbbell',    pattern:'push',   category:'dumbbell' },
  { id:'e-kickback-cable',         name:'Tricep Kickback (Cable)',          muscles:['triceps'],        secondary:[],                              equipment:'cable',       pattern:'push',   category:'cable' },
  { id:'e-jm-press',               name:'JM Press',                         muscles:['triceps'],        secondary:['chest'],                       equipment:'barbell',     pattern:'push',   category:'barbell' },

  // ══════════════════════════════════════════
  // FOREARMS / WRISTS
  // ══════════════════════════════════════════
  { id:'e-wrist-curl',             name:'Wrist Curl',                       muscles:['forearms'],       secondary:[],                              equipment:'barbell',     pattern:'other',  category:'barbell' },
  { id:'e-wrist-curl-reverse',     name:'Reverse Wrist Curl',               muscles:['forearms'],       secondary:[],                              equipment:'barbell',     pattern:'other',  category:'barbell' },
  { id:'e-wrist-roller',           name:'Wrist Roller',                     muscles:['forearms'],       secondary:[],                              equipment:'other',       pattern:'other',  category:'other' },
  { id:'e-plate-pinch',            name:'Plate Pinch',                      muscles:['forearms'],       secondary:[],                              equipment:'barbell',     pattern:'carry',  category:'other' },
  { id:'e-farmers-carry',          name:'Farmer\'s Carry',                  muscles:['forearms'],       secondary:['traps','core','glutes'],        equipment:'dumbbell',    pattern:'carry',  category:'dumbbell' },
  { id:'e-farmers-carry-bb',       name:'Farmer\'s Carry (Barbell)',        muscles:['forearms'],       secondary:['traps','core'],                 equipment:'barbell',     pattern:'carry',  category:'barbell' },
  { id:'e-dead-hang',              name:'Dead Hang',                        muscles:['forearms'],       secondary:['lats','shoulders'],             equipment:'bodyweight',  pattern:'other',  category:'calisthenics' },

  // ══════════════════════════════════════════
  // LEGS — QUADS
  // ══════════════════════════════════════════
  { id:'e-squat',                  name:'Barbell Back Squat',               muscles:['quads'],          secondary:['glutes','hamstrings','core'],   equipment:'barbell',     pattern:'squat',  category:'barbell' },
  { id:'e-front-squat',            name:'Barbell Front Squat',              muscles:['quads'],          secondary:['glutes','core'],                equipment:'barbell',     pattern:'squat',  category:'barbell' },
  { id:'e-high-bar-squat',         name:'High Bar Squat',                   muscles:['quads'],          secondary:['glutes'],                      equipment:'barbell',     pattern:'squat',  category:'barbell' },
  { id:'e-low-bar-squat',          name:'Low Bar Squat',                    muscles:['quads'],          secondary:['glutes','hamstrings'],          equipment:'barbell',     pattern:'squat',  category:'barbell' },
  { id:'e-paused-squat',           name:'Paused Squat',                     muscles:['quads'],          secondary:['glutes'],                      equipment:'barbell',     pattern:'squat',  category:'barbell' },
  { id:'e-box-squat',              name:'Box Squat',                        muscles:['quads'],          secondary:['glutes','hamstrings'],          equipment:'barbell',     pattern:'squat',  category:'barbell' },
  { id:'e-goblet-squat',           name:'Goblet Squat',                     muscles:['quads'],          secondary:['glutes','core'],                equipment:'kettlebell',  pattern:'squat',  category:'kettlebell' },
  { id:'e-db-squat',               name:'Dumbbell Squat',                   muscles:['quads'],          secondary:['glutes'],                      equipment:'dumbbell',    pattern:'squat',  category:'dumbbell' },
  { id:'e-hack-squat',             name:'Hack Squat Machine',               muscles:['quads'],          secondary:['glutes'],                      equipment:'machine',     pattern:'squat',  category:'machine' },
  { id:'e-leg-press',              name:'Leg Press',                        muscles:['quads'],          secondary:['glutes','hamstrings'],          equipment:'machine',     pattern:'squat',  category:'machine' },
  { id:'e-leg-press-wide',         name:'Leg Press (Wide Stance)',          muscles:['quads'],          secondary:['glutes','hamstrings'],          equipment:'machine',     pattern:'squat',  category:'machine' },
  { id:'e-leg-ext',                name:'Leg Extension',                    muscles:['quads'],          secondary:[],                              equipment:'machine',     pattern:'squat',  category:'machine' },
  { id:'e-sissy-squat',            name:'Sissy Squat',                      muscles:['quads'],          secondary:[],                              equipment:'bodyweight',  pattern:'squat',  category:'bodyweight' },
  { id:'e-lunge-bb',               name:'Barbell Lunge',                    muscles:['quads'],          secondary:['glutes','hamstrings'],          equipment:'barbell',     pattern:'squat',  category:'barbell' },
  { id:'e-lunge-db',               name:'Dumbbell Lunge',                   muscles:['quads'],          secondary:['glutes','hamstrings'],          equipment:'dumbbell',    pattern:'squat',  category:'dumbbell' },
  { id:'e-lunge-walking',          name:'Walking Lunge',                    muscles:['quads'],          secondary:['glutes'],                      equipment:'dumbbell',    pattern:'squat',  category:'dumbbell' },
  { id:'e-lunge-reverse',          name:'Reverse Lunge',                    muscles:['quads'],          secondary:['glutes'],                      equipment:'bodyweight',  pattern:'squat',  category:'bodyweight' },
  { id:'e-split-squat',            name:'Bulgarian Split Squat',            muscles:['quads'],          secondary:['glutes'],                      equipment:'dumbbell',    pattern:'squat',  category:'dumbbell' },
  { id:'e-split-squat-bb',         name:'Bulgarian Split Squat (Barbell)',  muscles:['quads'],          secondary:['glutes'],                      equipment:'barbell',     pattern:'squat',  category:'barbell' },
  { id:'e-step-up',                name:'Step-Up',                          muscles:['quads'],          secondary:['glutes'],                      equipment:'dumbbell',    pattern:'squat',  category:'dumbbell' },
  { id:'e-pistol-squat',           name:'Pistol Squat',                     muscles:['quads'],          secondary:['glutes','core'],                equipment:'bodyweight',  pattern:'squat',  category:'calisthenics' },
  { id:'e-smith-squat',            name:'Smith Machine Squat',              muscles:['quads'],          secondary:['glutes'],                      equipment:'machine',     pattern:'squat',  category:'machine' },
  { id:'e-sumo-squat-db',          name:'Sumo Squat (Dumbbell)',            muscles:['quads'],          secondary:['glutes','hamstrings'],          equipment:'dumbbell',    pattern:'squat',  category:'dumbbell' },

  // ══════════════════════════════════════════
  // LEGS — HAMSTRINGS / GLUTES
  // ══════════════════════════════════════════
  { id:'e-rdl',                    name:'Romanian Deadlift (Barbell)',       muscles:['hamstrings'],     secondary:['glutes','back'],                equipment:'barbell',     pattern:'hinge',  category:'barbell' },
  { id:'e-rdl-db',                 name:'Romanian Deadlift (Dumbbell)',      muscles:['hamstrings'],     secondary:['glutes','back'],                equipment:'dumbbell',    pattern:'hinge',  category:'dumbbell' },
  { id:'e-rdl-single',             name:'Single Leg RDL',                   muscles:['hamstrings'],     secondary:['glutes'],                      equipment:'dumbbell',    pattern:'hinge',  category:'dumbbell' },
  { id:'e-leg-curl-lying',         name:'Lying Leg Curl',                   muscles:['hamstrings'],     secondary:[],                              equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-leg-curl-seated',        name:'Seated Leg Curl',                  muscles:['hamstrings'],     secondary:[],                              equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-leg-curl-standing',      name:'Standing Leg Curl',                muscles:['hamstrings'],     secondary:[],                              equipment:'machine',     pattern:'pull',   category:'machine' },
  { id:'e-nordic-curl',            name:'Nordic Hamstring Curl',            muscles:['hamstrings'],     secondary:[],                              equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-glute-bridge',           name:'Glute Bridge',                     muscles:['glutes'],         secondary:['hamstrings'],                  equipment:'bodyweight',  pattern:'hinge',  category:'bodyweight' },
  { id:'e-hip-thrust-bb',          name:'Barbell Hip Thrust',               muscles:['glutes'],         secondary:['hamstrings'],                  equipment:'barbell',     pattern:'hinge',  category:'barbell' },
  { id:'e-hip-thrust-db',          name:'Dumbbell Hip Thrust',              muscles:['glutes'],         secondary:['hamstrings'],                  equipment:'dumbbell',    pattern:'hinge',  category:'dumbbell' },
  { id:'e-hip-thrust-machine',     name:'Hip Thrust Machine',               muscles:['glutes'],         secondary:['hamstrings'],                  equipment:'machine',     pattern:'hinge',  category:'machine' },
  { id:'e-cable-kickback',         name:'Cable Glute Kickback',             muscles:['glutes'],         secondary:['hamstrings'],                  equipment:'cable',       pattern:'hinge',  category:'cable' },
  { id:'e-donkey-kick',            name:'Donkey Kick',                      muscles:['glutes'],         secondary:[],                              equipment:'bodyweight',  pattern:'hinge',  category:'bodyweight' },
  { id:'e-sumo-deadlift',          name:'Sumo Deadlift',                    muscles:['glutes'],         secondary:['hamstrings','quads','back'],    equipment:'barbell',     pattern:'hinge',  category:'barbell' },
  { id:'e-hip-abduction',          name:'Hip Abduction Machine',            muscles:['glutes'],         secondary:[],                              equipment:'machine',     pattern:'other',  category:'machine' },
  { id:'e-hip-adduction',          name:'Hip Adduction Machine',            muscles:['glutes'],         secondary:[],                              equipment:'machine',     pattern:'other',  category:'machine' },
  { id:'e-lateral-band-walk',      name:'Lateral Band Walk',                muscles:['glutes'],         secondary:[],                              equipment:'band',        pattern:'other',  category:'band' },
  { id:'e-fire-hydrant',           name:'Fire Hydrant',                     muscles:['glutes'],         secondary:[],                              equipment:'bodyweight',  pattern:'other',  category:'bodyweight' },

  // ══════════════════════════════════════════
  // DEADLIFTS (compound — spans multiple muscles)
  // ══════════════════════════════════════════
  { id:'e-deadlift',               name:'Conventional Deadlift',            muscles:['back'],           secondary:['glutes','hamstrings','traps'],   equipment:'barbell',     pattern:'hinge',  category:'barbell' },
  { id:'e-trap-bar-deadlift',      name:'Trap Bar Deadlift',                muscles:['quads'],          secondary:['glutes','hamstrings','back'],   equipment:'barbell',     pattern:'hinge',  category:'barbell' },
  { id:'e-deficit-deadlift',       name:'Deficit Deadlift',                 muscles:['back'],           secondary:['glutes','hamstrings'],          equipment:'barbell',     pattern:'hinge',  category:'barbell' },
  { id:'e-rack-pull',              name:'Rack Pull',                        muscles:['back'],           secondary:['traps','glutes'],               equipment:'barbell',     pattern:'hinge',  category:'barbell' },
  { id:'e-stiff-leg-deadlift',     name:'Stiff Leg Deadlift',               muscles:['hamstrings'],     secondary:['glutes','back'],                equipment:'barbell',     pattern:'hinge',  category:'barbell' },
  { id:'e-snatch-grip-deadlift',   name:'Snatch Grip Deadlift',             muscles:['back'],           secondary:['traps','glutes','hamstrings'],   equipment:'barbell',     pattern:'hinge',  category:'barbell' },

  // ══════════════════════════════════════════
  // CALVES
  // ══════════════════════════════════════════
  { id:'e-calf-raise-standing',    name:'Standing Calf Raise',              muscles:['calves'],         secondary:[],                              equipment:'machine',     pattern:'other',  category:'machine' },
  { id:'e-calf-raise-seated',      name:'Seated Calf Raise',                muscles:['calves'],         secondary:[],                              equipment:'machine',     pattern:'other',  category:'machine' },
  { id:'e-calf-raise-leg-press',   name:'Leg Press Calf Raise',             muscles:['calves'],         secondary:[],                              equipment:'machine',     pattern:'other',  category:'machine' },
  { id:'e-calf-raise-bb',          name:'Barbell Calf Raise',               muscles:['calves'],         secondary:[],                              equipment:'barbell',     pattern:'other',  category:'barbell' },
  { id:'e-calf-raise-db',          name:'Single Leg Calf Raise (DB)',       muscles:['calves'],         secondary:[],                              equipment:'dumbbell',    pattern:'other',  category:'dumbbell' },
  { id:'e-calf-raise-bw',          name:'Bodyweight Calf Raise',            muscles:['calves'],         secondary:[],                              equipment:'bodyweight',  pattern:'other',  category:'bodyweight' },
  { id:'e-jump-rope',              name:'Jump Rope',                        muscles:['calves'],         secondary:['core','shoulders'],             equipment:'other',       pattern:'cardio', category:'cardio' },

  // ══════════════════════════════════════════
  // CORE — ABS / OBLIQUES
  // ══════════════════════════════════════════
  { id:'e-crunch',                 name:'Crunch',                           muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-cable-crunch',           name:'Cable Crunch',                     muscles:['core'],           secondary:[],                              equipment:'cable',       pattern:'core',   category:'cable' },
  { id:'e-sit-up',                 name:'Sit-Up',                           muscles:['core'],           secondary:['hip flexors'],                  equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-decline-crunch',         name:'Decline Sit-Up',                   muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-leg-raise',              name:'Hanging Leg Raise',                muscles:['core'],           secondary:['hip flexors'],                  equipment:'bodyweight',  pattern:'core',   category:'calisthenics' },
  { id:'e-knee-raise',             name:'Hanging Knee Raise',               muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'calisthenics' },
  { id:'e-leg-raise-lying',        name:'Lying Leg Raise',                  muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-plank',                  name:'Plank',                            muscles:['core'],           secondary:['shoulders'],                   equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-side-plank',             name:'Side Plank',                       muscles:['core'],           secondary:['shoulders'],                   equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-ab-wheel',               name:'Ab Wheel Rollout',                 muscles:['core'],           secondary:['lats','shoulders'],             equipment:'other',       pattern:'core',   category:'other' },
  { id:'e-dragon-flag',            name:'Dragon Flag',                      muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'calisthenics' },
  { id:'e-l-sit',                  name:'L-Sit',                            muscles:['core'],           secondary:['triceps','shoulders'],          equipment:'bodyweight',  pattern:'core',   category:'calisthenics' },
  { id:'e-oblique-crunch',         name:'Oblique Crunch',                   muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-russian-twist',          name:'Russian Twist',                    muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-wood-chop',              name:'Cable Wood Chop',                  muscles:['core'],           secondary:['shoulders'],                   equipment:'cable',       pattern:'core',   category:'cable' },
  { id:'e-pallof-press',           name:'Pallof Press',                     muscles:['core'],           secondary:[],                              equipment:'cable',       pattern:'core',   category:'cable' },
  { id:'e-toes-to-bar',            name:'Toes to Bar',                      muscles:['core'],           secondary:['lats'],                        equipment:'bodyweight',  pattern:'core',   category:'calisthenics' },
  { id:'e-bicycle-crunch',         name:'Bicycle Crunch',                   muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-hollow-hold',            name:'Hollow Body Hold',                 muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'calisthenics' },
  { id:'e-flutter-kick',           name:'Flutter Kick',                     muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-dead-bug',               name:'Dead Bug',                         muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-v-up',                   name:'V-Up',                             muscles:['core'],           secondary:[],                              equipment:'bodyweight',  pattern:'core',   category:'bodyweight' },
  { id:'e-ghr',                    name:'Glute Ham Raise',                  muscles:['hamstrings'],     secondary:['glutes','core'],                equipment:'machine',     pattern:'hinge',  category:'machine' },

  // ══════════════════════════════════════════
  // OLYMPIC LIFTS
  // ══════════════════════════════════════════
  { id:'e-clean',                  name:'Power Clean',                      muscles:['back'],           secondary:['glutes','quads','traps','shoulders'], equipment:'barbell', pattern:'hinge', category:'olympic' },
  { id:'e-hang-clean',             name:'Hang Clean',                       muscles:['back'],           secondary:['glutes','traps','shoulders'],   equipment:'barbell',     pattern:'hinge',  category:'olympic' },
  { id:'e-snatch',                 name:'Power Snatch',                     muscles:['back'],           secondary:['glutes','shoulders','traps'],   equipment:'barbell',     pattern:'hinge',  category:'olympic' },
  { id:'e-hang-snatch',            name:'Hang Snatch',                      muscles:['back'],           secondary:['shoulders','glutes'],           equipment:'barbell',     pattern:'hinge',  category:'olympic' },
  { id:'e-clean-jerk',             name:'Clean & Jerk',                     muscles:['back'],           secondary:['glutes','quads','shoulders'],   equipment:'barbell',     pattern:'hinge',  category:'olympic' },
  { id:'e-clean-pull',             name:'Clean Pull',                       muscles:['back'],           secondary:['glutes','traps'],               equipment:'barbell',     pattern:'hinge',  category:'olympic' },
  { id:'e-high-pull',              name:'High Pull',                        muscles:['traps'],          secondary:['shoulders','back'],             equipment:'barbell',     pattern:'pull',   category:'olympic' },
  { id:'e-muscle-snatch',          name:'Muscle Snatch',                    muscles:['shoulders'],      secondary:['traps','back'],                 equipment:'barbell',     pattern:'push',   category:'olympic' },

  // ══════════════════════════════════════════
  // KETTLEBELL
  // ══════════════════════════════════════════
  { id:'e-kb-swing',               name:'Kettlebell Swing',                 muscles:['glutes'],         secondary:['hamstrings','back','core'],     equipment:'kettlebell',  pattern:'hinge',  category:'kettlebell' },
  { id:'e-kb-swing-single',        name:'Single Arm Kettlebell Swing',      muscles:['glutes'],         secondary:['hamstrings','core'],            equipment:'kettlebell',  pattern:'hinge',  category:'kettlebell' },
  { id:'e-kb-clean',               name:'Kettlebell Clean',                 muscles:['back'],           secondary:['glutes','forearms'],            equipment:'kettlebell',  pattern:'hinge',  category:'kettlebell' },
  { id:'e-kb-press',               name:'Kettlebell Press',                 muscles:['shoulders'],      secondary:['triceps','core'],               equipment:'kettlebell',  pattern:'push',   category:'kettlebell' },
  { id:'e-kb-snatch',              name:'Kettlebell Snatch',                muscles:['shoulders'],      secondary:['glutes','back'],                equipment:'kettlebell',  pattern:'hinge',  category:'kettlebell' },
  { id:'e-kb-goblet-squat',        name:'Kettlebell Goblet Squat',          muscles:['quads'],          secondary:['glutes','core'],                equipment:'kettlebell',  pattern:'squat',  category:'kettlebell' },
  { id:'e-kb-turkish-getup',       name:'Turkish Get-Up',                   muscles:['core'],           secondary:['shoulders','glutes'],           equipment:'kettlebell',  pattern:'other',  category:'kettlebell' },
  { id:'e-kb-rdl',                 name:'Kettlebell RDL',                   muscles:['hamstrings'],     secondary:['glutes'],                      equipment:'kettlebell',  pattern:'hinge',  category:'kettlebell' },
  { id:'e-kb-row',                 name:'Kettlebell Row',                   muscles:['back'],           secondary:['biceps','lats'],                equipment:'kettlebell',  pattern:'pull',   category:'kettlebell' },
  { id:'e-kb-windmill',            name:'Kettlebell Windmill',              muscles:['core'],           secondary:['shoulders','hamstrings'],       equipment:'kettlebell',  pattern:'core',   category:'kettlebell' },
  { id:'e-kb-figure8',             name:'Kettlebell Figure 8',              muscles:['core'],           secondary:['glutes'],                      equipment:'kettlebell',  pattern:'core',   category:'kettlebell' },

  // ══════════════════════════════════════════
  // CALISTHENICS / SKILL
  // ══════════════════════════════════════════
  { id:'e-muscle-up',              name:'Muscle-Up',                        muscles:['lats'],           secondary:['chest','triceps'],              equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-front-lever',            name:'Front Lever',                      muscles:['lats'],           secondary:['core','back'],                  equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-back-lever',             name:'Back Lever',                       muscles:['lats'],           secondary:['chest','core'],                 equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },
  { id:'e-planche',                name:'Planche',                          muscles:['chest'],          secondary:['shoulders','core'],             equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },
  { id:'e-ring-dip',               name:'Ring Dip',                         muscles:['chest'],          secondary:['triceps','shoulders'],          equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },
  { id:'e-ring-row',               name:'Ring Row',                         muscles:['back'],           secondary:['biceps'],                      equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-ring-pushup',            name:'Ring Push-Up',                     muscles:['chest'],          secondary:['triceps','core'],               equipment:'bodyweight',  pattern:'push',   category:'calisthenics' },
  { id:'e-typewriter-pullup',      name:'Typewriter Pull-Up',               muscles:['lats'],           secondary:['biceps'],                      equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-commando-pullup',        name:'Commando Pull-Up',                 muscles:['lats'],           secondary:['biceps','traps'],               equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },
  { id:'e-human-flag',             name:'Human Flag',                       muscles:['lats'],           secondary:['core','shoulders'],             equipment:'bodyweight',  pattern:'other',  category:'calisthenics' },
  { id:'e-dip-bar-lrow',           name:'Dip Bar L-Sit Row',                muscles:['back'],           secondary:['core'],                        equipment:'bodyweight',  pattern:'pull',   category:'calisthenics' },

  // ══════════════════════════════════════════
  // CARDIO / CONDITIONING
  // ══════════════════════════════════════════
  { id:'e-run',                    name:'Running',                          muscles:['quads'],          secondary:['hamstrings','calves','core'],   equipment:'none',        pattern:'cardio', category:'cardio' },
  { id:'e-sprint',                 name:'Sprint',                           muscles:['quads'],          secondary:['hamstrings','glutes','calves'], equipment:'none',        pattern:'cardio', category:'cardio' },
  { id:'e-stair-climb',            name:'Stair Climber',                    muscles:['quads'],          secondary:['glutes','calves'],              equipment:'machine',     pattern:'cardio', category:'cardio' },
  { id:'e-rowing-machine',         name:'Rowing Machine',                   muscles:['back'],           secondary:['lats','core','legs'],           equipment:'machine',     pattern:'cardio', category:'cardio' },
  { id:'e-assault-bike',           name:'Assault Bike',                     muscles:['quads'],          secondary:['shoulders','core'],             equipment:'machine',     pattern:'cardio', category:'cardio' },
  { id:'e-elliptical',             name:'Elliptical',                       muscles:['quads'],          secondary:['hamstrings','glutes'],          equipment:'machine',     pattern:'cardio', category:'cardio' },
  { id:'e-cycling',                name:'Cycling',                          muscles:['quads'],          secondary:['hamstrings','glutes','calves'], equipment:'machine',     pattern:'cardio', category:'cardio' },
  { id:'e-swimming',               name:'Swimming',                         muscles:['lats'],           secondary:['shoulders','core'],             equipment:'none',        pattern:'cardio', category:'cardio' },
  { id:'e-burpee',                 name:'Burpee',                           muscles:['core'],           secondary:['chest','shoulders','quads'],   equipment:'bodyweight',  pattern:'cardio', category:'bodyweight' },
  { id:'e-box-jump',               name:'Box Jump',                         muscles:['quads'],          secondary:['glutes','calves'],              equipment:'other',       pattern:'cardio', category:'other' },
  { id:'e-broad-jump',             name:'Broad Jump',                       muscles:['quads'],          secondary:['glutes','hamstrings'],          equipment:'bodyweight',  pattern:'cardio', category:'bodyweight' },
  { id:'e-mountain-climber',       name:'Mountain Climber',                 muscles:['core'],           secondary:['shoulders','quads'],            equipment:'bodyweight',  pattern:'cardio', category:'bodyweight' },
  { id:'e-battle-ropes',           name:'Battle Ropes',                     muscles:['shoulders'],      secondary:['core','back'],                  equipment:'other',       pattern:'cardio', category:'other' },
  { id:'e-sled-push',              name:'Sled Push',                        muscles:['quads'],          secondary:['glutes','shoulders'],           equipment:'other',       pattern:'cardio', category:'other' },
  { id:'e-sled-pull',              name:'Sled Pull',                        muscles:['back'],           secondary:['glutes','hamstrings'],          equipment:'other',       pattern:'cardio', category:'other' },
  { id:'e-tire-flip',              name:'Tire Flip',                        muscles:['back'],           secondary:['glutes','shoulders'],           equipment:'other',       pattern:'cardio', category:'other' },

  // ══════════════════════════════════════════
  // NECK
  // ══════════════════════════════════════════
  { id:'e-neck-curl',              name:'Neck Curl',                        muscles:['neck'],           secondary:[],                              equipment:'other',       pattern:'other',  category:'other' },
  { id:'e-neck-extension',         name:'Neck Extension',                   muscles:['neck'],           secondary:[],                              equipment:'other',       pattern:'other',  category:'other' },
  { id:'e-neck-lateral',           name:'Neck Lateral Flexion',             muscles:['neck'],           secondary:[],                              equipment:'other',       pattern:'other',  category:'other' },
  { id:'e-neck-harness',           name:'Neck Harness',                     muscles:['neck'],           secondary:['traps'],                       equipment:'other',       pattern:'other',  category:'other' },

  // ══════════════════════════════════════════
  // STRETCHES / MOBILITY
  // ══════════════════════════════════════════
  { id:'e-hip-flexor-stretch',     name:'Hip Flexor Stretch',               muscles:['glutes'],         secondary:[],                              equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-pigeon-pose',            name:'Pigeon Pose',                      muscles:['glutes'],         secondary:['hamstrings'],                  equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-hamstring-stretch',      name:'Hamstring Stretch',                muscles:['hamstrings'],     secondary:[],                              equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-quad-stretch',           name:'Quad Stretch',                     muscles:['quads'],          secondary:[],                              equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-calf-stretch',           name:'Calf Stretch',                     muscles:['calves'],         secondary:[],                              equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-chest-stretch',          name:'Chest Stretch',                    muscles:['chest'],          secondary:['shoulders'],                   equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-lats-stretch',           name:'Lat Stretch',                      muscles:['lats'],           secondary:[],                              equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-shoulder-stretch',       name:'Cross-Body Shoulder Stretch',      muscles:['shoulders'],      secondary:[],                              equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-thoracic-rotation',      name:'Thoracic Rotation',                muscles:['back'],           secondary:[],                              equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-spinal-twist',           name:'Spinal Twist Stretch',             muscles:['back'],           secondary:['core'],                        equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-childs-pose',            name:'Child\'s Pose',                    muscles:['back'],           secondary:['lats','shoulders'],             equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-cobra-stretch',          name:'Cobra Stretch',                    muscles:['core'],           secondary:['back'],                        equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-world-greatest',         name:'World\'s Greatest Stretch',        muscles:['glutes'],         secondary:['hamstrings','core','shoulders'],equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-ankle-mobility',         name:'Ankle Circles / Mobility',         muscles:['calves'],         secondary:[],                              equipment:'bodyweight',  pattern:'stretch',category:'stretch' },
  { id:'e-foam-roll-quads',        name:'Foam Roll — Quads',                muscles:['quads'],          secondary:[],                              equipment:'other',       pattern:'stretch',category:'stretch' },
  { id:'e-foam-roll-it-band',      name:'Foam Roll — IT Band',              muscles:['quads'],          secondary:[],                              equipment:'other',       pattern:'stretch',category:'stretch' },
  { id:'e-foam-roll-back',         name:'Foam Roll — Upper Back',           muscles:['back'],           secondary:[],                              equipment:'other',       pattern:'stretch',category:'stretch' },
  { id:'e-band-pull-apart',        name:'Band Pull Apart',                  muscles:['traps'],          secondary:['shoulders','back'],             equipment:'band',        pattern:'pull',   category:'band' },
  { id:'e-face-pull-band',         name:'Band Face Pull',                   muscles:['traps'],          secondary:['shoulders'],                   equipment:'band',        pattern:'pull',   category:'band' },

];

// Fast lookup by id
const EXERCISE_MAP = Object.fromEntries(EXERCISE_DB.map(e => [e.id, e]));

// Normalize name → find matching DB entry (used during migration)
function findExerciseByName(name) {
  const norm = String(name || '').trim().toLowerCase();
  return EXERCISE_DB.find(e => e.name.toLowerCase() === norm) || null;
}

// Get all muscle groups touched by an exercise id
function exerciseMuscles(id) {
  const ex = EXERCISE_MAP[id];
  if (!ex) return [];
  return [...new Set([...ex.muscles, ...(ex.secondary || [])])];
}

// All unique muscle group keys used in the DB
const ALL_MUSCLE_GROUPS = [
  'chest','back','lats','traps','shoulders','biceps','triceps',
  'forearms','core','glutes','quads','hamstrings','calves','neck'
];

const MUSCLE_LABELS = {
  chest:'Chest', back:'Back', lats:'Lats', traps:'Traps',
  shoulders:'Shoulders', biceps:'Biceps', triceps:'Triceps',
  forearms:'Forearms', core:'Core', glutes:'Glutes',
  quads:'Quads', hamstrings:'Hamstrings', calves:'Calves', neck:'Neck'
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKOUT PRESETS — categorized preset list for naming workout cards.
// focus: muscle group keys this session primarily targets (for future heatmap use).
// ─────────────────────────────────────────────────────────────────────────────
const WORKOUT_PRESETS = [
  {
    category: 'Push / Pull / Legs',
    workouts: [
      { name: 'Push Day',   focus: ['chest','shoulders','triceps'] },
      { name: 'Push A',     focus: ['chest','shoulders','triceps'] },
      { name: 'Push B',     focus: ['chest','triceps'] },
      { name: 'Pull Day',   focus: ['back','lats','biceps'] },
      { name: 'Pull A',     focus: ['back','lats','biceps'] },
      { name: 'Pull B',     focus: ['lats','biceps','traps'] },
      { name: 'Leg Day',    focus: ['quads','hamstrings','glutes','calves'] },
      { name: 'Leg A',      focus: ['quads','glutes'] },
      { name: 'Leg B',      focus: ['hamstrings','glutes','calves'] },
    ]
  },
  {
    category: 'Upper / Lower',
    workouts: [
      { name: 'Upper Body A', focus: ['chest','back','shoulders','biceps','triceps'] },
      { name: 'Upper Body B', focus: ['chest','back','shoulders','biceps','triceps'] },
      { name: 'Lower Body A', focus: ['quads','hamstrings','glutes','calves'] },
      { name: 'Lower Body B', focus: ['quads','hamstrings','glutes','calves'] },
    ]
  },
  {
    category: 'Body Part Split',
    workouts: [
      { name: 'Chest Day',        focus: ['chest','triceps'] },
      { name: 'Back Day',         focus: ['back','lats','biceps'] },
      { name: 'Shoulder Day',     focus: ['shoulders','traps'] },
      { name: 'Arm Day',          focus: ['biceps','triceps','forearms'] },
      { name: 'Leg Day',          focus: ['quads','hamstrings','glutes','calves'] },
      { name: 'Core Day',         focus: ['core'] },
      { name: 'Chest & Triceps',  focus: ['chest','triceps'] },
      { name: 'Back & Biceps',    focus: ['back','lats','biceps'] },
      { name: 'Shoulders & Traps',focus: ['shoulders','traps'] },
    ]
  },
  {
    category: 'Full Body',
    workouts: [
      { name: 'Full Body A',           focus: ['chest','back','quads','hamstrings'] },
      { name: 'Full Body B',           focus: ['chest','back','quads','hamstrings'] },
      { name: 'Full Body C',           focus: ['shoulders','lats','glutes','core'] },
      { name: 'Full Body Strength',    focus: ['chest','back','quads','hamstrings'] },
      { name: 'Full Body Hypertrophy', focus: ['chest','back','legs','shoulders'] },
    ]
  },
  {
    category: 'Strength / Powerlifting',
    workouts: [
      { name: 'Squat Day',          focus: ['quads','glutes','core'] },
      { name: 'Bench Day',          focus: ['chest','triceps','shoulders'] },
      { name: 'Deadlift Day',       focus: ['back','hamstrings','glutes'] },
      { name: 'Overhead Press Day', focus: ['shoulders','triceps'] },
      { name: 'Power Day',          focus: ['back','legs','shoulders'] },
      { name: 'Strength A',         focus: ['chest','back','quads'] },
      { name: 'Strength B',         focus: ['chest','back','quads'] },
    ]
  },
  {
    category: 'Olympic Lifting',
    workouts: [
      { name: 'Clean & Jerk Day',  focus: ['back','quads','shoulders','traps'] },
      { name: 'Snatch Day',        focus: ['back','quads','shoulders'] },
      { name: 'Olympic Technique', focus: ['back','quads','shoulders'] },
      { name: 'Clean Pulls',       focus: ['back','hamstrings','traps'] },
    ]
  },
  {
    category: 'Calisthenics',
    workouts: [
      { name: 'Push Calisthenics',      focus: ['chest','shoulders','triceps'] },
      { name: 'Pull Calisthenics',      focus: ['back','lats','biceps'] },
      { name: 'Leg Calisthenics',       focus: ['quads','hamstrings','glutes'] },
      { name: 'Core Calisthenics',      focus: ['core'] },
      { name: 'Skill Work',             focus: [] },
      { name: 'Planche / Front Lever',  focus: ['chest','shoulders','core'] },
    ]
  },
  {
    category: 'Cardio & Conditioning',
    workouts: [
      { name: 'Cardio Session',      focus: [] },
      { name: 'HIIT',                focus: [] },
      { name: 'Steady State Cardio', focus: [] },
      { name: 'Conditioning',        focus: [] },
      { name: 'Running',             focus: ['quads','calves'] },
      { name: 'Cycling',             focus: ['quads','hamstrings'] },
      { name: 'Swimming',            focus: ['lats','shoulders'] },
      { name: 'Boxing',              focus: ['shoulders','core'] },
      { name: 'MMA / Combat',        focus: [] },
    ]
  },
  {
    category: 'Recovery & Mobility',
    workouts: [
      { name: 'Active Recovery', focus: [] },
      { name: 'Mobility',        focus: [] },
      { name: 'Deload Day',      focus: [] },
      { name: 'Stretching',      focus: [] },
      { name: 'Yoga',            focus: [] },
      { name: 'Foam Rolling',    focus: [] },
    ]
  },
  {
    category: 'Sport Specific',
    workouts: [
      { name: 'Basketball Conditioning', focus: [] },
      { name: 'Football Training',       focus: [] },
      { name: 'Athletic Speed Work',     focus: ['quads','glutes','calves'] },
      { name: 'Jump Training',           focus: ['quads','glutes','calves'] },
      { name: 'Agility',                 focus: [] },
    ]
  },
];
