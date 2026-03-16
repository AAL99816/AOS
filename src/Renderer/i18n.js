'use strict';

/* ══ AOS i18n ══ */

const LANG = {
  en: {
    /* Navigation */
    nav_today:    'Today',
    nav_fitness:  'Fitness',
    nav_goals:    'Goals',
    nav_projects: 'Projects',
    nav_media:    'Media',
    nav_review:   'Review',

    /* Prayer */
    prayer:       'Prayer',
    fajr:         'Fajr',
    dhuhr:        'Dhuhr',
    asr:          'Asr',
    maghrib:      'Maghrib',
    isha:         'Isha',
    all_five_complete: 'All five — complete.',

    /* Habits */
    habits:            'Habits',
    daily_habits:      'Daily Habits',
    add_habit:         'Add habit',
    habit_name_ph:     'Add a habit…',
    remove_habit:      'Remove habit?',
    streaks:           'Streaks',
    this_week:         'This Week',

    /* Fitness */
    gym:               'Gym',
    cardio:            'Cardio',
    training_log:      'Training Log',
    log_session:       'Log Session',
    sessions_plural:   'session',
    sessions_plural_s: 'sessions',
    no_sessions:       'No sessions logged yet',
    exercise:          'Exercise',
    add:               'Add',
    log:               'Log',
    last_colon:        'Last:',
    no_log_yet:        'No log yet',
    rest:              'Rest',
    workout:           'Workout',
    remove:            'Remove',
    training_week:     'Training Week',
    daily_cardio:      'Daily Cardio',
    min:               'min',

    /* Goals */
    goals:             'Goals',
    no_goals:          'No goals yet',
    notes:             'Notes',
    deadline:          'Deadline',
    add_goal:          'Add Goal',
    goal_title_ph:     'Goal title',
    no_project:        '— No project —',
    goals_linked:      'goals linked',
    goal_linked:       'goal linked',
    new_goal:          'New Goal',
    goal_added:        'Goal added',

    /* Projects */
    projects:          'Projects',
    no_projects:       'No projects here yet',
    project_title_ph:  'Project title',
    type:              'Type',
    context:           'Context',
    notes_next_steps:  'Notes, next steps...',
    active:            'Active',
    planning:          'Planning',
    paused:            'Paused',
    complete:          'Complete',
    dropped:           'Dropped',
    status_updated:    'Status updated',
    add_project:       'Add Project',
    remove_project:    'Remove this project?',
    project_added:     'Project added',

    /* Library / Media */
    library:           'Library',
    book:              'Book',
    show:              'Show',
    anime:             'Anime',
    film:              'Film',
    other:             'Other',
    to_read:           'To Read',
    reading:           'Reading',
    finished:          'Finished',
    queued:            'Queued',
    watching:          'Watching',
    watched:           'Watched',
    author:            'Author',
    director:          'Director',
    creator:           'Creator',
    page:              'Page',
    episode:           'Episode',
    chapter_notes:     'Chapter Notes',
    episode_notes:     'Episode Notes',
    add_cover:         'Add Cover',
    nothing_here:      'Nothing here yet',
    remove_item:       'Remove this item?',

    /* Weekly Review */
    review:            'Review',
    complete_days:     'complete days',
    no_sessions_logged:'No sessions logged',
    no_habits_set:     'No habits set',
    in_progress:       'In Progress',
    finished_this_week:'Finished This Week',
    reflection:        'Reflection',
    weekly_review:     'Weekly Review',

    /* Auth Screen */
    personal_life_os:  'Personal Life OS',
    sign_in:           'Sign In',
    create_account:    'Create Account',
    email:             'Email',
    password:          'Password',
    fill_both_fields:  'Please fill in both fields.',
    check_email:       'Check your email to confirm your account, then sign in.',

    /* Today */
    today_glance:      'Today at a Glance',
    done:              'done',
    not_logged:        'not logged',
    morning_msg:       'Morning. The day is open.',
    afternoon_msg:     'Afternoon. Build on what you started.',
    evening_msg:       'Evening. Reflect, rest, reset.',

    /* Onboarding */
    welcome_aos:       'Welcome to AOS',
    what_call_you:     'What should we call you?',
    choose_habits:     'Choose your habits',
    first_goal:        'Your first goal',
    get_started:       'Get Started',
    next:              'Next',

    /* Misc */
    export:            'Export',
    import:            'Import',
    save:              'Save',
    close:             'Close',
    sign_out:          'Sign Out',
    day_s:             'day(s)',
    cancel:            'Cancel',
    study:             'Study',
    reading_streak:    'Reading',
  },

  ar: {
    /* Navigation */
    nav_today:    'اليوم',
    nav_fitness:  'التدريب',
    nav_goals:    'الأهداف',
    nav_projects: 'المشاريع',
    nav_media:    'المكتبة',
    nav_review:   'المراجعة',

    /* Prayer */
    prayer:       'الصلاة',
    fajr:         'الفجر',
    dhuhr:        'الظهر',
    asr:          'العصر',
    maghrib:      'المغرب',
    isha:         'العشاء',
    all_five_complete: 'اكتملت الصلوات الخمس.',

    /* Habits */
    habits:            'العادات',
    daily_habits:      'العادات اليومية',
    add_habit:         'إضافة عادة',
    habit_name_ph:     'أضف عادة...',
    remove_habit:      'حذف العادة؟',
    streaks:           'السلاسل',
    this_week:         'هذا الأسبوع',

    /* Fitness */
    gym:               'الجيم',
    cardio:            'الكارديو',
    training_log:      'سجل التدريب',
    log_session:       'تسجيل جلسة',
    sessions_plural:   'جلسة',
    sessions_plural_s: 'جلسات',
    no_sessions:       'لا توجد جلسات مسجلة',
    exercise:          'التمرين',
    add:               'إضافة',
    log:               'تسجيل',
    last_colon:        'آخر:',
    no_log_yet:        'لا يوجد سجل',
    rest:              'راحة',
    workout:           'تمرين',
    remove:            'حذف',
    training_week:     'أسبوع التدريب',
    daily_cardio:      'كارديو يومي',
    min:               'دقيقة',

    /* Goals */
    goals:             'الأهداف',
    no_goals:          'لا توجد أهداف بعد',
    notes:             'ملاحظات',
    deadline:          'الموعد النهائي',
    add_goal:          'إضافة هدف',
    goal_title_ph:     'عنوان الهدف',
    no_project:        '— بدون مشروع —',
    goals_linked:      'أهداف مرتبطة',
    goal_linked:       'هدف مرتبط',
    new_goal:          'هدف جديد',
    goal_added:        'تمت إضافة الهدف',

    /* Projects */
    projects:          'المشاريع',
    no_projects:       'لا توجد مشاريع بعد',
    project_title_ph:  'عنوان المشروع',
    type:              'النوع',
    context:           'السياق',
    notes_next_steps:  'ملاحظات، خطوات قادمة...',
    active:            'نشط',
    planning:          'تخطيط',
    paused:            'متوقف',
    complete:          'مكتمل',
    dropped:           'ملغى',
    status_updated:    'تم تحديث الحالة',
    add_project:       'إضافة مشروع',
    remove_project:    'حذف المشروع؟',
    project_added:     'تمت إضافة المشروع',

    /* Library / Media */
    library:           'المكتبة',
    book:              'كتاب',
    show:              'مسلسل',
    anime:             'أنيمي',
    film:              'فيلم',
    other:             'أخرى',
    to_read:           'للقراءة',
    reading:           'يُقرأ الآن',
    finished:          'منتهٍ',
    queued:            'في القائمة',
    watching:          'يُشاهد الآن',
    watched:           'تمت المشاهدة',
    author:            'المؤلف',
    director:          'المخرج',
    creator:           'المبدع',
    page:              'صفحة',
    episode:           'حلقة',
    chapter_notes:     'ملاحظات الفصول',
    episode_notes:     'ملاحظات الحلقات',
    add_cover:         'إضافة غلاف',
    nothing_here:      'لا يوجد شيء هنا بعد',
    remove_item:       'حذف هذا العنصر؟',

    /* Weekly Review */
    review:            'المراجعة',
    complete_days:     'أيام مكتملة',
    no_sessions_logged:'لا توجد جلسات مسجلة',
    no_habits_set:     'لا توجد عادات',
    in_progress:       'قيد التقدم',
    finished_this_week:'أُنجز هذا الأسبوع',
    reflection:        'التأمل',
    weekly_review:     'المراجعة الأسبوعية',

    /* Auth Screen */
    personal_life_os:  'نظام الحياة الشخصي',
    sign_in:           'تسجيل الدخول',
    create_account:    'إنشاء حساب',
    email:             'البريد الإلكتروني',
    password:          'كلمة المرور',
    fill_both_fields:  'يرجى ملء الحقلين.',
    check_email:       'تحقق من بريدك الإلكتروني للتأكيد...',

    /* Today */
    today_glance:      'لمحة عن اليوم',
    done:              'منجز',
    not_logged:        'غير مسجل',
    morning_msg:       'الصباح. اليوم مفتوح.',
    afternoon_msg:     'بعد الظهر. ابنِ على ما بدأت.',
    evening_msg:       'المساء. تأمل، استرح، ابدأ من جديد.',

    /* Onboarding */
    welcome_aos:       'مرحباً بك في AOS',
    what_call_you:     'ماذا نُسمِّيك؟',
    choose_habits:     'اختر عاداتك',
    first_goal:        'هدفك الأول',
    get_started:       'ابدأ الآن',
    next:              'التالي',

    /* Misc */
    export:            'تصدير',
    import:            'استيراد',
    save:              'حفظ',
    close:             'إغلاق',
    sign_out:          'تسجيل الخروج',
    day_s:             'يوم',
    cancel:            'إلغاء',
    study:             'الدراسة',
    reading_streak:    'القراءة',
  }
};

let currentLang = localStorage.getItem('aos_lang') || 'en';

function t(key) {
  return (LANG[currentLang] || LANG.en)[key] || LANG.en[key] || key;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('aos_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  applyStaticI18n();
  if (typeof renderAll === 'function') renderAll();
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    el.placeholder = t(key);
  });
  /* update lang toggle label */
  const langToggle = document.getElementById('langToggle');
  if (langToggle) langToggle.textContent = currentLang === 'en' ? 'AR' : 'EN';
}

/* Apply language on initial load */
document.documentElement.lang = currentLang;
document.documentElement.dir  = currentLang === 'ar' ? 'rtl' : 'ltr';
document.addEventListener('DOMContentLoaded', applyStaticI18n);
