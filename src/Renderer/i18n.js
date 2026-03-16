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
    album:             'Albums',
    to_read:           'To Read',
    reading:           'Reading',
    finished:          'Finished',
    queued:            'Queued',
    watching:          'Watching',
    watched:           'Watched',
    not_started:       'Not Started',
    listening:         'Listening',
    author:            'Author',
    director:          'Director',
    creator:           'Creator',
    artist:            'Artist',
    page:              'Page',
    episode:           'Episode',
    season:            'Season',
    total_seasons:     'Total Seasons',
    total_episodes:    'Total Episodes',
    chapter_notes:     'Chapter Notes',
    episode_notes:     'Episode Notes',
    add_cover:         'Add Cover',
    nothing_here:      'Nothing here yet',
    remove_item:       'Remove this item?',
    tracks:            'tracks',
    tracklist:         'Tracklist',
    add_track:         '+ Add Track',
    track_title_ph:    'Track title',
    track_review_ph:   'Short review…',
    no_tracks_yet:     'No tracks yet.',
    album_details:     'Album Details',
    runtime:           'Runtime',
    watch_count:       'Times Watched',
    title_lbl:         'Title',
    status_label:      'Status',
    rating_lbl:        'Rating (1–5)',
    media_details:     'Media Details',
    details_section:   'Details',
    progress_section:  'Progress',

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

    /* Toasts & feedback */
    avatar_updated:       'Avatar updated',
    avatar_upload_error:  'Could not upload avatar',
    username_saved:       'Username saved',
    backup_exported:      'Backup exported!',
    data_imported:        'Data imported!',
    file_read_error:      'Could not read file.',
    welcome_toast:        'Welcome to AOS',
    signin_success:       'Signed in successfully',
    email_confirmed:      'Email confirmed and signed in',
    signin_link_error:    'Could not finish sign-in from email link.',
    email_verify_error:   'Could not verify email link.',
    added:                'added',
    workout_saved:        'saved to history',
    exercise_logged:      'logged',
    from_last_log:        'from last log',
    enter_weight:         'Enter a weight first',
    cardio_logged:        'min logged — total today:',
    min_today:            'min today',
    remove_workout_card:  'Remove this workout card?',
    no_exercise_data:     'No exercise data',
    new_block:            'New Block',
    remove_goal_confirm:  'Delete this goal?',
    remove_item_confirm:  'Remove this item?',
    click_rename:         'Click to rename',
    mark_training:        'Mark as training day',
    mark_rest:            'Mark as rest day',
    no_notes_yet:         'No notes yet.',
    set_total_pages:      'Set total pages to track progress',
    general_notes:        'General Notes',
    add_note:             '+ Add Note',
    done_btn:             'Done',
    reflection_ph:        'How was this week? What worked, what didn\'t, what carries forward… (supports **bold**, *italic*, # headings, - lists)',
    filter_all:           'All',
    target_label:         'Target:',
    notes_ph:             'Notes…',
    type_ph:              'type',
    context_ph:           'context',
    exercise_ph:          'Exercise…',
    sets_ph:              '3×10',
    weight_ph:            'kg',
    reps_ph:              'reps',
    unsorted:             'Unsorted',
    auth_modules:         'Prayer · Habits · Fitness · Goals · Projects · Media · Notes',
    auth_sub:             'Sign in to sync across devices',
    daily_notes_lbl:      'Daily Notes',
    daily_notes_ph:       'Write anything…',
    your_name_ph:         'Your name',
    username_ph:          '@handle — letters, numbers, _',

    /* Calm insight lines */
    insight_all:          'All prayers and all habits. A rare kind of day.',
    insight_all_prayers:  'All prayers complete. A good foundation.',
    insight_all_habits:   'Every habit done. Hold the standard.',
    insight_gym_cardio:   'Gym and cardio both done. Rest well tonight.',
    insight_gym:          'Gym done. The work is in.',
    insight_nothing:      'Nothing logged yet — the day still has room.',

    /* Calm insight dynamic parts */
    of:                   'of',
    prayers_done:         'prayers done',
    remaining:            'remaining',
    habits_momentum:      'habits — momentum is there.',
    cardio_goal_met:      'min of cardio — goal met.',
    day_reading_streak:   '-day reading streak. Protect it.',
    days_reading_row:     'days of reading in a row.',

    /* Season / subtitle */
    spring:        'Spring',
    summer:        'Summer',
    fall:          'Fall',

    /* Country */
    country:       'Country',

    /* Settings */
    settings:      'Settings',
    profile:       'Profile',
    appearance:    'Appearance',
    language:      'Language',
    theme:         'Theme',
    font:          'Font',
    display_name:  'Display Name',
    username_lbl:  'Username',
    save_settings: 'Save',
    settings_saved:'Settings saved',

    /* Past Notes */
    past_notes:         'Past Notes',
    past_notes_btn:     'Past',
    no_past_notes:      'No past notes',

    /* Project detail */
    open_detail:        'Open →',
    tasks_label:        'Tasks',
    linked_goals:       'Linked Goals',
    no_tasks:           'No tasks yet',
    no_linked_goals:    'No linked goals',

    /* Training log full view */
    view_all:           'View all →',

    /* Gym streak */
    gym_schedule:       'Gym Schedule',
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
    album:             'الألبومات',
    to_read:           'للقراءة',
    reading:           'يُقرأ الآن',
    finished:          'منتهٍ',
    queued:            'في القائمة',
    watching:          'يُشاهد الآن',
    watched:           'تمت المشاهدة',
    not_started:       'لم يبدأ',
    listening:         'يُسمع الآن',
    author:            'المؤلف',
    director:          'المخرج',
    creator:           'المبدع',
    artist:            'الفنان',
    page:              'صفحة',
    episode:           'حلقة',
    season:            'الموسم',
    total_seasons:     'إجمالي المواسم',
    total_episodes:    'إجمالي الحلقات',
    chapter_notes:     'ملاحظات الفصول',
    episode_notes:     'ملاحظات الحلقات',
    add_cover:         'إضافة غلاف',
    nothing_here:      'لا يوجد شيء هنا بعد',
    remove_item:       'حذف هذا العنصر؟',
    tracks:            'مقاطع',
    tracklist:         'قائمة المقاطع',
    add_track:         '+ إضافة مقطع',
    track_title_ph:    'عنوان المقطع',
    track_review_ph:   'مراجعة قصيرة...',
    no_tracks_yet:     'لا توجد مقاطع بعد.',
    album_details:     'تفاصيل الألبوم',
    runtime:           'مدة العرض',
    watch_count:       'عدد المشاهدات',
    title_lbl:         'العنوان',
    status_label:      'الحالة',
    rating_lbl:        'التقييم (1-5)',
    media_details:     'تفاصيل المحتوى',
    details_section:   'التفاصيل',
    progress_section:  'التقدم',

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

    /* Toasts & feedback */
    avatar_updated:       'تم تحديث الصورة الرمزية',
    avatar_upload_error:  'تعذر تحميل الصورة الرمزية',
    username_saved:       'تم حفظ اسم المستخدم',
    backup_exported:      'تم تصدير النسخة الاحتياطية!',
    data_imported:        'تم استيراد البيانات!',
    file_read_error:      'تعذر قراءة الملف.',
    welcome_toast:        'مرحباً بك في AOS',
    signin_success:       'تم تسجيل الدخول بنجاح',
    email_confirmed:      'تم تأكيد البريد وتسجيل الدخول',
    signin_link_error:    'تعذر إكمال تسجيل الدخول من رابط البريد.',
    email_verify_error:   'تعذر التحقق من رابط البريد.',
    added:                'تمت الإضافة',
    workout_saved:        'تم الحفظ في السجل',
    exercise_logged:      'تم التسجيل',
    from_last_log:        'من آخر تسجيل',
    enter_weight:         'أدخل الوزن أولاً',
    cardio_logged:        'دقيقة مسجلة — الإجمالي اليوم:',
    min_today:            'دقيقة اليوم',
    remove_workout_card:  'إزالة كتلة التمرين؟',
    no_exercise_data:     'لا توجد بيانات تمرين',
    new_block:            'كتلة جديدة',
    remove_goal_confirm:  'حذف هذا الهدف؟',
    remove_item_confirm:  'حذف هذا العنصر؟',
    click_rename:         'انقر للتسمية',
    mark_training:        'حدد كيوم تدريب',
    mark_rest:            'حدد كيوم راحة',
    no_notes_yet:         'لا توجد ملاحظات بعد.',
    set_total_pages:      'عيّن إجمالي الصفحات لتتبع التقدم',
    general_notes:        'ملاحظات عامة',
    add_note:             '+ إضافة ملاحظة',
    done_btn:             'تم',
    reflection_ph:        'كيف كان هذا الأسبوع؟ ما الذي نجح وما الذي لم ينجح، وما الذي تحمله معك... (يدعم **عريض**، *مائل*، # عناوين، - قوائم)',
    filter_all:           'الكل',
    target_label:         'الهدف:',
    notes_ph:             'ملاحظات...',
    type_ph:              'النوع',
    context_ph:           'السياق',
    exercise_ph:          'التمرين...',
    sets_ph:              '3×10',
    weight_ph:            'كغ',
    reps_ph:              'تكرار',
    unsorted:             'غير مصنف',
    auth_modules:         'الصلاة · العادات · التدريب · الأهداف · المشاريع · المكتبة · الملاحظات',
    auth_sub:             'سجل الدخول للمزامنة عبر الأجهزة',
    daily_notes_lbl:      'ملاحظات اليوم',
    daily_notes_ph:       'اكتب أي شيء...',
    your_name_ph:         'اسمك',
    username_ph:          '@handle — أحرف وأرقام و_',

    /* Calm insight lines */
    insight_all:          'جميع الصلوات وجميع العادات. يوم نادر.',
    insight_all_prayers:  'اكتملت الصلوات. أساس جيد.',
    insight_all_habits:   'جميع العادات منجزة. احتفظ بالمستوى.',
    insight_gym_cardio:   'الجيم والكارديو منجزان. استرح جيداً الليلة.',
    insight_gym:          'الجيم منجز. العمل صار فيه.',
    insight_nothing:      'لم يُسجَّل شيء بعد — اليوم لا يزال فيه متسع.',

    /* Calm insight dynamic parts */
    of:                   'من',
    prayers_done:         'صلوات مكتملة',
    remaining:            'متبقية',
    habits_momentum:      'عادات — هناك زخم.',
    cardio_goal_met:      'دقيقة كارديو — الهدف تحقق.',
    day_reading_streak:   ' يوم قراءة متواصلة. احمِ السلسلة.',
    days_reading_row:     'أيام قراءة متتالية.',

    /* Season / subtitle */
    spring:        'ربيع',
    summer:        'صيف',
    fall:          'خريف',

    /* Country */
    country:       'الدولة',

    /* Settings */
    settings:      'الإعدادات',
    profile:       'الملف الشخصي',
    appearance:    'المظهر',
    language:      'اللغة',
    theme:         'السمة',
    font:          'الخط',
    display_name:  'الاسم المعروض',
    username_lbl:  'اسم المستخدم',
    save_settings: 'حفظ',
    settings_saved:'تم حفظ الإعدادات',

    /* Past Notes */
    past_notes:         'ملاحظات سابقة',
    past_notes_btn:     'سابق',
    no_past_notes:      'لا توجد ملاحظات سابقة',

    /* Project detail */
    open_detail:        'فتح ←',
    tasks_label:        'المهام',
    linked_goals:       'أهداف مرتبطة',
    no_tasks:           'لا توجد مهام بعد',
    no_linked_goals:    'لا توجد أهداف مرتبطة',

    /* Training log full view */
    view_all:           'عرض الكل ←',

    /* Gym streak */
    gym_schedule:       'جدول الجيم',
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
  const stLangToggle = document.getElementById('stLangToggle');
  if (stLangToggle) stLangToggle.textContent = currentLang === 'en' ? 'AR' : 'EN';
}

/* Apply language on initial load */
document.documentElement.lang = currentLang;
document.documentElement.dir  = currentLang === 'ar' ? 'rtl' : 'ltr';
document.addEventListener('DOMContentLoaded', applyStaticI18n);
