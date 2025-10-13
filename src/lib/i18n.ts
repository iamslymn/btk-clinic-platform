/**
 * Azerbaijani Localization for BTK Medical Platform
 * Azərbaycan dili lokallaşdırması
 */

export const AZ_TRANSLATIONS = {
  // Fallback map for missing keys
  _fallbacks: {
    'reports.representatives.filtersTitle': 'Nümayəndə filtrləri',
    'reports.subtitle': 'Komandanızın performansını izləyin',
    'reports.representatives.table.representative': 'Nümayəndə',
    'reports.representatives.noData': 'Uyğun məlumat tapılmadı',
    'reports.representatives.exportCsv': 'CSV-yə ixrac et',
    'reports.representatives.exportXlsx': 'Excel-ə ixrac et',
    'reports.representatives.fromDate': 'Başlanğıc tarix',
    'reports.representatives.toDate': 'Bitmə tarixi',
    'reports.representatives.representative': 'Nümayəndə',
    'reports.representatives.brand': 'Brend',
    'reports.representatives.applyFilters': 'Filtrləri tətbiq et'
  },
  // Navigation
  nav: {
    dashboard: 'İdarə Paneli',
    managers: 'Menecerlər',
    doctors: 'Həkimlər',
    clinics: 'Klinikalar',
    specializations: 'İxtisaslaşmalar',
    brands: 'Brendlər',
    products: 'Məhsullar',
    reports: 'Hesabatlar',
    representatives: 'Nümayəndələr',
    visitAssignments: 'Vizit Tapşırıqları',
    schedule: 'Cədvəl',
    visits: 'Vizitlər',
    settings: 'Tənzimləmələr'
  },

  // Common Actions
  actions: {
    add: 'Əlavə et',
    edit: 'Redaktə et',
    delete: 'Sil',
    save: 'Yadda saxla',
    cancel: 'Ləğv et',
    close: 'Bağla',
    create: 'Yarat',
    update: 'Yenilə',
    search: 'Axtarış',
    filter: 'Süzgəc',
    export: 'İxrac',
    import: 'İdxal',
    refresh: 'Yenilə',
    back: 'Geri',
    next: 'Növbəti',
    previous: 'Əvvəlki',
    submit: 'Təqdim et',
    confirm: 'Təsdiq et'
  },

  // Headers & Titles
  headers: {
    platform: 'BTK Tibbi Platforma',
    dashboard: 'İdarə Paneli',
    welcome: 'Xoş gəlmisiniz',
    quickActions: 'Sürətli Əməllər',
    overview: 'Ümumi Baxış',
    statistics: 'Statistika',
    recentActivity: 'Son Fəaliyyət',
    management: 'İdarəetmə'
  },

  // Forms
  forms: {
    firstName: 'Ad',
    lastName: 'Soyad',
    fullName: 'Tam ad',
    email: 'E-poçt',
    password: 'Şifrə',
    confirmPassword: 'Şifrəni təsdiqləyin',
    phone: 'Telefon',
    address: 'Ünvan',
    specialty: 'İxtisas',
    specialization: 'İxtisaslaşma',
    category: 'Kateqoriya',
    description: 'Təsvir',
    notes: 'Qeydlər',
    startTime: 'Başlama vaxtı',
    endTime: 'Bitmə vaxtı',
    date: 'Tarix',
    status: 'Status',
    name: 'Ad',
    brand: 'Brend',
    brandName: 'Brend adı',
    productName: 'Məhsul adı',
    gender: 'Cins',
    male: 'Kişi',
    female: 'Qadın',
    totalCategory: 'Ümumi kateqoriya',
    planetaCategory: 'Planeta kateqoriyası',
    workplaces: 'İş yerləri',
    clinicName: 'Klinika adı',
    prioritySpecializations: 'Prioritet ixtisaslaşmaları',
    annotations: 'Qeydlər',
    pdfFile: 'PDF faylı',
    required: '*',
    optional: '(Opsional)',
    personalInformation: 'Şəxsi məlumatlar',
    professionalInformation: 'Peşəkar məlumatlar',
    
    // Create Forms
    createManager: {
      title: 'Yeni Menecer yarat',
      fullNameLabel: 'Tam Ad *',
      fullNamePlaceholder: 'Menecerin tam adını daxil edin',
      emailLabel: 'E-poçt *',
      emailPlaceholder: 'Menecerin e-poçtunu daxil edin',
      passwordLabel: 'Şifrə *',
      passwordPlaceholder: 'Şifrə daxil edin (minimum 6 simvol)',
      createButton: 'Menecer yarat',
      creating: 'Yaradılır...',
      cancel: 'Ləğv et'
    },
    
    createDoctor: {
      title: 'Yeni Həkim yarat',
      firstNameLabel: 'Ad *',
      lastNameLabel: 'Soyad *',
      specializationLabel: 'İxtisaslaşma *',
      selectSpecialization: 'İxtisaslaşma seçin',
      totalCategoryLabel: 'Ümumi Kateqoriya *',
      planetaCategoryLabel: 'Planeta Kateqoriyası *',
      genderLabel: 'Cins *',
      selectGender: 'Cins seçin',
      phoneLabel: 'Telefon *',
      workplacesLabel: 'İş yerləri *',
      addWorkplace: 'İş yeri əlavə et',
      clinicNamePlaceholder: 'Klinika adını daxil edin',
      addressPlaceholder: 'Ünvanı daxil edin',
      workplacePhonePlaceholder: 'Telefon (opsional)',
      removeWorkplace: 'İş yerini sil',
      createButton: 'Həkim yarat',
      creating: 'Yaradılır...',
      cancel: 'Ləğv et'
    },

    // Generic form keys
    selectSpecialization: 'İxtisaslaşma seçin',
    updateDoctor: 'Həkimi Yenilə',
    updating: 'Yenilənir...',
    
    createBrand: {
      title: 'Yeni Brend yarat',
      nameLabel: 'Brend Adı *',
      namePlaceholder: 'Brend adını daxil edin',
      createButton: 'Brend yarat',
      creating: 'Yaradılır...',
      cancel: 'Ləğv et'
    },
    
    createProduct: {
      title: 'Yeni Məhsul yarat',
      brandLabel: 'Brend *',
      selectBrand: 'Brend seçin',
      nameLabel: 'Məhsul Adı *',
      namePlaceholder: 'Məhsul adını daxil edin',
      descriptionLabel: 'Təsvir *',
      descriptionPlaceholder: 'Məhsul təsvirini daxil edin',
      prioritySpecializationsLabel: 'Prioritet İxtisaslaşmaları *',
      annotationsLabel: 'Əlavə qeydlər',
      annotationsPlaceholder: 'Əlavə qeydlər (opsional)',
      pdfFileLabel: 'PDF Faylı',
      uploadPdf: 'PDF yüklə',
      changeFile: 'Faylı dəyiş',
      removeFile: 'Faylı sil',
      createButton: 'Məhsul yarat',
      creating: 'Yaradılır...',
      cancel: 'Ləğv et'
    },
    
    createRepresentative: {
      title: 'Yeni Nümayəndə Yarat',
      accountInfo: 'Hesab Məlumatları',
      personalInfo: 'Şəxsi Məlumatlar',
      territories: 'Ərazilər',
      brands: 'Brendlər',
      emailLabel: 'E-poçt *',
      emailPlaceholder: 'E-poçt ünvanını daxil edin',
      passwordLabel: 'Şifrə *',
      passwordPlaceholder: 'Şifrəni daxil edin',
      firstNameLabel: 'Ad *',
      firstNamePlaceholder: 'Adı daxil edin',
      lastNameLabel: 'Soyad *',
      lastNamePlaceholder: 'Soyadı daxil edin',
      managerLabel: 'Menecer *',
      selectManager: 'Menecer seçin',
      territoriesHint: 'Bu nümayəndənin məsul olduğu əraziləri seçin',
      brandsHint: 'Bu nümayəndənin təqdim edəcəyi brendləri seçin',
      loadingData: 'Menecerlər və brendlər yüklənir...',
      cancel: 'Ləğv et',
      createButton: 'Nümayəndə Yarat',
      creating: 'Yaradılır...'
    },

    addRepresentative: {
      title: 'Yeni Nümayəndə Əlavə Et',
      subtitle: 'Komandanıza yeni satış nümayəndəsi əlavə edin',
      personalInformation: 'Şəxsi Məlumatlar',
      workInformation: 'İş Məlumatları',
      additionalNotes: 'Əlavə Qeydlər',
      fullNameLabel: 'Tam Ad *',
      fullNamePlaceholder: 'Nümayəndənin tam adını daxil edin',
      emailLabel: 'E-poçt *',
      emailPlaceholder: 'E-poçt ünvanını daxil edin',
      phoneLabel: 'Telefon *',
      phonePlaceholder: 'Telefon nömrəsini daxil edin',
      passwordLabel: 'Şifrə *',
      passwordPlaceholder: 'İlkin şifrəni yaradın',
      passwordHint: 'Şifrə böyük hərf, kiçik hərf və rəqəm ehtiva etməlidir',
      territoryLabel: 'Ərazi *',
      territoryPlaceholder: 'Ərazi və ya əhatə sahəsini daxil edin',
      hireDateLabel: 'İşə Qəbul Tarixi *',
      notesLabel: 'Qeydlər (İstəyə görə)',
      notesPlaceholder: 'Nümayəndə haqqında əlavə qeydlər...',
      accessDenied: 'Giriş rədd edildi. Menecer səlahiyyətləri tələb olunur.',
      errorCreating: 'Nümayəndə Yaradılarkən Xəta',
      cancel: 'Ləğv et',
      createButton: 'Nümayəndə Yarat',
      creating: 'Yaradılır...',
      creatingTip: 'Nümayəndə Yaratmaq',
      tipContent: [
        'Hesab məlumatları dərhal yaradılacaq',
        'E-poçt doğrulaması tələb olunmur',
        'Nümayəndə dərhal giriş edə bilər',
        'Şifrə təhlükəsiz saxlanılacaq'
      ]
    },
    
    // Validation messages
    validation: {
      required: 'Bu sahə tələb olunur',
      email: 'Düzgün e-poçt ünvanı daxil edin',
      minLength: 'Minimum {{min}} simvol tələb olunur',
      maxLength: 'Maksimum {{max}} simvol icazə verilir',
      phoneNumber: 'Düzgün telefon nömrəsi daxil edin',
      passwordMin: 'Şifrə minimum 6 simvol olmalıdır',
      firstNameRequired: 'Ad tələb olunur',
      lastNameRequired: 'Soyad tələb olunur',
      specializationRequired: 'İxtisaslaşma seçin',
      categoryRequired: 'Kateqoriya seçin',
      genderRequired: 'Cins seçin',
      phoneRequired: 'Telefon nömrəsi tələb olunur',
      workplacesRequired: 'Ən azı bir iş yeri tələb olunur',
      clinicNameRequired: 'Klinika adı tələb olunur',
      addressRequired: 'Ünvan tələb olunur',
      brandRequired: 'Brend tələb olunur',
      productNameRequired: 'Məhsul adı tələb olunur',
      descriptionRequired: 'Təsvir tələb olunur',
      prioritySpecializationsRequired: 'Ən azı bir prioritet ixtisaslaşma tələb olunur',
      brandNameRequired: 'Brend adı tələb olunur',
      emailRequired: 'E-poçt tələb olunur',
      passwordRequired: 'Şifrə tələb olunur',
      managerRequired: 'Menecer seçin',
      territoriesRequired: 'Ən azı bir ərazi seçin',
      brandsRequired: 'Ən azı bir brend seçin',
      fullNameRequired: 'Tam ad tələb olunur',
      territoryRequired: 'Ərazi tələb olunur',
      hireDateRequired: 'İşə qəbul tarixi tələb olunur',
      validEmailRequired: 'Düzgün e-poçt tələb olunur',
      passwordMinLength: 'Şifrə ən az 6 simvoldan ibarət olmalıdır',
      passwordTooShort: 'Şifrə ən az 8 simvoldan ibarət olmalıdır',
      passwordComplexity: 'Şifrə böyük hərf, kiçik hərf və rəqəm ehtiva etməlidir',
      atLeastOneTerritory: 'Ən azı bir ərazi tələb olunur',
      atLeastOneBrand: 'Ən azı bir brend tələb olunur'
    },
    
    // Specializations  
    specializations: {
      cardiology: 'Kardiologiya',
      neurology: 'Nevrologiya',
      orthopedics: 'Ortopediya',
      pediatrics: 'Pediatriya',
      dermatology: 'Dermatalogiya',
      psychiatry: 'Psixiatriya',
      oncology: 'Onkologiya',
      gastroenterology: 'Qastroenterologiya',
      endocrinology: 'Endokrinologiya',
      pulmonology: 'Pulmonologiya',
      nephrology: 'Nefrologiya',
      rheumatology: 'Revmatologiya',
      ophthalmology: 'Oftalmologiya',
      otolaryngology: 'Otolaringologiya',
      urology: 'Urologiya',
      gynecology: 'Ginekologiya',
      surgery: 'Cərrahiyyə',
      anesthesiology: 'Anestezologiya',
      radiology: 'Radiologiya',
      pathology: 'Patologiya'
    }
  },

  // Status
  status: {
    active: 'Aktiv',
    inactive: 'Qeyri-aktiv',
    pending: 'Gözləyən',
    completed: 'Tamamlandı',
    cancelled: 'Ləğv edildi',
    approved: 'Təsdiqləndi',
    rejected: 'Rədd edildi',
    inProgress: 'Davam edir'
  },

  // Roles
  roles: {
    superAdmin: 'Super Admin',
    manager: 'Menecer',
    representative: 'Nümayəndə',
    doctor: 'Həkim'
  },

  // Messages
  messages: {
    loading: 'Yüklənir...',
    noData: 'Məlumat yoxdur',
    success: 'Uğurla tamamlandı',
    error: 'Xəta baş verdi',
    warning: 'Xəbərdarlıq',
    info: 'Məlumat',
    deleteConfirm: 'Silmək istədiyinizə əminsiniz?',
    unsavedChanges: 'Yadda saxlanmamış dəyişikliklər var',
    accessDenied: 'Giriş qadağandır',
    sessionExpired: 'Sessiyanın müddəti bitib',
    invalidCredentials: 'Yanlış giriş məlumatları'
  },

  // Specific Entities
  entities: {
    manager: {
      singular: 'Menecer',
      plural: 'Menecerlər',
      add: 'Menecer əlavə et',
      edit: 'Meneceri redaktə et',
      delete: 'Meneceri sil'
    },
    doctor: {
      singular: 'Həkim',
      plural: 'Həkimlər',
      add: 'Həkim əlavə et',
      edit: 'Həkimi redaktə et',
      delete: 'Həkimi sil'
    },
    representative: {
      singular: 'Nümayəndə',
      plural: 'Nümayəndələr',
      add: 'Nümayəndə əlavə et',
      edit: 'Nümayəndəni redaktə et',
      delete: 'Nümayəndəni sil'
    },
    brand: {
      singular: 'Brend',
      plural: 'Brendlər',
      add: 'Brend əlavə et',
      edit: 'Brendi redaktə et',
      delete: 'Brendi sil'
    },
    product: {
      singular: 'Məhsul',
      plural: 'Məhsullar',
      add: 'Məhsul əlavə et',
      edit: 'Məhsulu redaktə et',
      delete: 'Məhsulu sil'
    },
    assignment: {
      singular: 'Tapşırıq',
      plural: 'Tapşırıqlar',
      add: 'Tapşırıq əlavə et',
      edit: 'Tapşırığı redaktə et',
      delete: 'Tapşırığı sil',
      weekly: 'Həftəlik Tapşırıq',
      calendar: 'Tapşırıq Təqvimi'
    }
  },

  // Dashboard Stats
  stats: {
    total: 'Ümumi',
    active: 'Aktiv',
    completed: 'Tamamlanmış',
    pending: 'Gözləyən',
    thisMonth: 'Bu ay',
    thisWeek: 'Bu həftə',
    today: 'Bu gün',
    completionRate: 'Tamamlanma nisbəti',
    growth: 'Artım'
  },

  // Calendar & Time
  calendar: {
    monday: 'Bazar ertəsi',
    tuesday: 'Çərşənbə axşamı',
    wednesday: 'Çərşənbə',
    thursday: 'Cümə axşamı',
    friday: 'Cümə',
    saturday: 'Şənbə',
    sunday: 'Bazar',
    january: 'Yanvar',
    february: 'Fevral',
    march: 'Mart',
    april: 'Aprel',
    may: 'May',
    june: 'İyun',
    july: 'İyul',
    august: 'Avqust',
    september: 'Sentyabr',
    october: 'Oktyabr',
    november: 'Noyabr',
    december: 'Dekabr'
  },

  // Authentication
  auth: {
    login: 'Daxil ol',
    logout: 'Çıxış',
    signIn: 'Giriş',
    signOut: 'Çıxış et',
    forgotPassword: 'Şifrəni unutdum',
    resetPassword: 'Şifrəni sıfırla',
    changePassword: 'Şifrəni dəyiş',
    welcome: 'Xoş gəlmisiniz',
    enterCredentials: 'Giriş məlumatlarınızı daxil edin',
    rememberMe: 'Məni xatırla',
    loginButton: 'Daxil ol',
    loginFailed: 'Giriş uğursuz oldu',
    invalidEmail: 'Yanlış e-poçt ünvanı',
    invalidPassword: 'Yanlış şifrə',
    userNotFound: 'İstifadəçi tapılmadı',
    accountLocked: 'Hesab bloklanıb',
    sessionTimeout: 'Sessiyanın vaxtı bitib'
  },

  // Page-specific translations
  pages: {
    login: {
      title: 'BTK Tibbi Platforma',
      subtitle: 'Hesabınıza daxil olun',
      emailPlaceholder: 'E-poçt ünvanınızı daxil edin',
      passwordPlaceholder: 'Şifrənizi daxil edin',
      forgotPasswordLink: 'Şifrəni unutmusunuz?',
      loginButton: 'Daxil ol',
      loading: 'Giriş edilir...'
    },
    dashboard: {
      welcomeBack: 'Yenidən xoş gəlmisiniz',
      lastLogin: 'Son giriş',
      todaysStats: 'Bu günün statistikası',
      weeklyOverview: 'Həftəlik icmal',
      monthlyProgress: 'Aylıq tərəqqi',
      upcomingTasks: 'Qarşıdan gələn tapşırıqlar',
      recentActivity: 'Son fəaliyyət',
      systemHealth: 'Sistem vəziyyəti',
      notifications: 'Bildirişlər',
      shortcuts: 'Qısayollar'
    },
    doctors: {
      title: 'Həkim İdarəetməsi',
      subtitle: 'Həkimləri idarə edin və məlumatlarını yeniləyin',
      searchPlaceholder: 'Həkimləri ad, ixtisas və ya klinika görə axtarın...',
      addDoctor: 'Həkim Əlavə Et',
      viewProfile: 'Profili gör',
      editDoctor: 'Həkimi redaktə et',
      deleteDoctor: 'Həkimi sil',
      totalDoctors: 'Ümumi Həkimlər',
      activeDoctors: 'Aktiv Həkimlər',
      specialties: 'İxtisaslar',
      workplaces: 'İş yerləri',
      contactInfo: 'Əlaqə məlumatları',
      noResults: 'Heç bir həkim tapılmadı',
      tryDifferentSearch: 'Başqa axtarış şərtləri ilə cəhd edin'
    },
    representatives: {
      title: 'Nümayəndə İdarəetməsi', 
      subtitle: 'Sahə nümayəndələrinizi və hesablarını idarə edin',
      searchPlaceholder: 'Ad və ya e-poçt ilə axtarış...',
      addRepresentative: 'Nümayəndə Əlavə Et',
      editRepresentative: 'Nümayəndəni redaktə et',
      deleteRepresentative: 'Nümayəndəni sil',
      totalReps: 'Ümumi Nümayəndələr',
      activeAccounts: 'Aktiv Hesablar',
      utilization: 'İstifadə nisbəti',
      registrationDate: 'Qeydiyyat tarixi',
      actions: 'Əməllər',
      noRepresentatives: 'Hələ nümayəndə yoxdur',
      addFirstRep: 'İlk nümayəndənizi əlavə edin',
      emailNotAvailable: 'E-poçt yoxdur',
      confirmDelete: 'nümayəndəsini silmək istədiyinizə əminsiniz?',
      deleteError: 'Nümayəndə silinmədi. Yenidən cəhd edin.',
      updateError: 'Nümayəndə yenilənmədi. Yenidən cəhd edin.'
    },
    brands: {
      title: 'Brend İdarəetməsi',
      subtitle: 'Məhsul brendlərini idarə edin',
      searchPlaceholder: 'Brendləri axtarın...',
      addBrand: 'Brend Əlavə Et',
      editBrand: 'Brendi redaktə et',
      deleteBrand: 'Brendi sil',
      totalBrands: 'Ümumi Brendlər',
      activeBrands: 'Aktiv Brendlər',
      brandName: 'Brend adı',
      description: 'Təsvir',
      createdDate: 'Yaradılma tarixi',
      noBrands: 'Hələ brend yoxdur'
    },
    products: {
      title: 'Məhsul İdarəetməsi',
      subtitle: 'Tibbi məhsulları idarə edin',
      searchPlaceholder: 'Məhsulları axtarın...',
      addProduct: 'Məhsul Əlavə Et',
      editProduct: 'Məhsulu redaktə et',
      deleteProduct: 'Məhsulu sil',
      totalProducts: 'Ümumi Məhsullar',
      activeProducts: 'Aktiv Məhsullar',
      productName: 'Məhsul adı',
      brand: 'Brend',
      category: 'Kateqoriya',
      price: 'Qiymət',
      stock: 'Stok',
      available: 'Mövcud',
      outOfStock: 'Stokda yoxdur',
      noProducts: 'Hələ məhsul yoxdur'
    },
    clinics: {
      title: 'Klinika İdarəetməsi',
      subtitle: 'Tapşırıqlar üçün klinikaları idarə edin',
      name: 'Ad *',
      address: 'Ünvan *',
      phone: 'Telefon',
      email: 'E-poçt',
      add: 'Əlavə et',
      update: 'Yenilə',
      confirmDelete: 'Klinikanı silmək istəyirsiniz?',
      table: {
        name: 'Ad',
        address: 'Ünvan',
        phone: 'Telefon',
        email: 'E-poçt',
        actions: 'Əməllər',
        edit: 'Redaktə et',
        delete: 'Sil'
      }
    },
    specializations: {
      title: 'Həkim İxtisaslaşmaları',
      subtitle: 'Həkim ixtisaslarını idarə edin',
      key: 'Açar (name) *',
      displayName: 'Görünən ad *',
      description: 'Təsvir',
      add: 'Əlavə et',
      update: 'Yenilə',
      confirmDelete: 'İxtisası silmək istəyirsiniz?',
      table: {
        key: 'Açar',
        displayName: 'Görünən ad',
        description: 'Təsvir',
        actions: 'Əməllər',
        edit: 'Redaktə et',
        delete: 'Sil'
      }
    },
    assignments: {
      title: 'Vizit Tapşırıqları',
      subtitle: 'Nümayəndə vizit tapşırıqlarını idarə edin',
      newAssignment: 'Yeni Tapşırıq',
      weeklyAssignment: 'Həftəlik Tapşırıq',
      calendarView: 'Təqvim Görünüşü',
      listView: 'Siyahı Görünüşü',
      filterBy: 'Süzgəc',
      allAssignments: 'Bütün Tapşırıqlar',
      todayAssignments: 'Bu günün tapşırıqları',
      weekAssignments: 'Bu həftənin tapşırıqları',
      assignmentWizard: 'Tapşırıq Sihirbazı',
      selectDate: 'Tarix seçin',
      selectRepresentative: 'Nümayəndə seçin',
      selectDoctors: 'Həkim(lər) seçin',
      selectProducts: 'Məhsul(lar) seçin',
      visitTime: 'Vizit vaxtı',
      recurringWeekly: 'Həftəlik təkrar',
      noAssignments: 'Tapşırıq yoxdur',
      createFirst: 'İlk tapşırığınızı yaradın',
      // Weekly Assignment Form
      createWeeklyAssignment: 'Həftəlik Tapşırıq Yarat',
      selectDayOfWeek: 'Həftənin günü seçin',
      selectedDayOfWeek: 'Seçilmiş həftənin günü',
      upcomingAssignments: 'Gələcək Tapşırıqlar',
      assignmentDetails: 'Tapşırıq Təfərrüatları',
      representative: 'Nümayəndə',
      selectRepresentativeRequired: 'Nümayəndə seçin',
      startTime: 'Başlama vaxtı',
      endTime: 'Bitiş vaxtı',
      recurringWeeks: 'Təkrarlanan həftələr',
      selectDoctorsRequired: 'Həkim(lər) seçin ({0} seçildi)',
      selectProductsRequired: 'Məhsul(lar) seçin ({0} seçildi)',
      notesOptional: 'Qeydlər (İstəyə görə)',
      additionalNotesPlaceholder: 'Bu tapşırıq üçün əlavə qeydlər...',
      cancel: 'Ləğv et',
      createWeeklyAssignments: '{0} Həftəlik Tapşırıq Yarat',
      creatingAssignments: 'Tapşırıqlar yaradılır...',
      loadingAssignmentData: 'Tapşırıq məlumatları yüklənir...',
      failedToLoadData: 'Məlumatları yükləmək uğursuz oldu: {0}',
      pleaseSelectRepresentative: 'Zəhmət olmasa nümayəndə seçin',
      pleaseSelectAtLeastOneDoctor: 'Zəhmət olmasa ən azı bir həkim seçin',
      pleaseSelectAtLeastOneProduct: 'Zəhmət olmasa ən azı bir məhsul seçin',
      failedToCreateAssignments: 'Tapşırıqlar yaratmaq uğursuz oldu',
      moreWeeks: '+{0} daha həftə',
      // New Assignment Wizard
      createNewAssignment: 'Yeni Tapşırıq Yarat',
      stepOf: 'Addım {0} / {1}',
      chooseDateAndTime: 'Tarix və Vaxt Seçin',
      dateRequired: 'Tarix *',
      startTimeRequired: 'Başlama vaxtı *',
      endTimeRequired: 'Bitiş vaxtı *',
      selected: 'Seçildi',
      selectRepresentativeStep: 'Nümayəndə Seçin',
      representativeLabel: 'Nümayəndə',
      chooseDoctorsFor: '{0} {1} üçün həkimlər seçin',
      selectOneOrMoreDoctors: 'Ziyarət ediləcək bir və ya daha çox həkim seçin:',
      doctorsSelected: '{0} həkim seçildi',
      assignProductsToEachDoctor: 'Hər Həkimə Məhsul Təyin Et',
      selectProductsForEachDoctor: 'Hər həkimin təqdim ediləcəyi məhsulları seçin:',
      productsSelected: '{0} məhsul seçildi',
      previous: 'Əvvəlki',
      next: 'Növbəti',
      createAssignments: 'Tapşırıqlar Yarat',
      // Weekdays
      weekdays: {
        sunday: 'Bazar',
        monday: 'Bazar ertəsi',
        tuesday: 'Çərşənbə axşamı',
        wednesday: 'Çərşənbə',
        thursday: 'Cümə axşamı',
        friday: 'Cümə',
        saturday: 'Şənbə',
        // Short forms
        sun: 'B',
        mon: 'BE',
        tue: 'ÇA',
        wed: 'Ç',
        thu: 'CA',
        fri: 'C',
        sat: 'Ş'
      },
      // Months
      months: {
        january: 'Yanvar',
        february: 'Fevral',
        march: 'Mart',
        april: 'Aprel',
        may: 'May',
        june: 'İyun',
        july: 'İyul',
        august: 'Avqust',
        september: 'Sentyabr',
        october: 'Oktyabr',
        november: 'Noyabr',
        december: 'Dekabr'
      },
      // Recurring options
      recurringOptions: {
        oneWeek: '1 həftə',
        twoWeeks: '2 həftə',
        fourWeeks: '4 həftə',
        eightWeeks: '8 həftə',
        twelveWeeks: '12 həftə',
        sixMonths: '26 həftə (6 ay)',
        oneYear: '52 həftə (1 il)'
      }
    },
    reports: {
      title: 'Hesabatlar və Analitika',
      subtitle: 'Komandanızın performansını izləyin',
      overviewTab: 'Ümumi baxış',
      performanceTab: 'Performans',
      trendsTab: 'Meyillər',
      representativesTab: 'Nümayəndələr',
      routeTab: 'Görüş xəritəsi',
      representatives: {
        filtersTitle: 'Nümayəndə filtrləri',
        fromDate: 'Başlanğıc tarix',
        toDate: 'Bitmə tarixi',
        representative: 'Nümayəndə',
        brand: 'Brend',
        applyFilters: 'Filtrləri tətbiq et',
        exportCsv: 'CSV-yə ixrac et',
        exportXlsx: 'Excel-ə ixrac et',
        noData: 'Uyğun məlumat tapılmadı',
        table: {
          representative: 'Nümayəndə',
          brand: 'Brend',
          total: 'Ümumi görüş',
          completed: 'Bitmiş görüş',
          postponed: 'Təxirə salındı',
          missed: 'Tamamlanmamış görüş'
        }
      }
    },
    schedule: {
      title: 'İş Cədvəli',
      subtitle: 'Günlük və həftəlik cədvəlinizi görün',
      today: 'Bu gün',
      tomorrow: 'Sabah',
      thisWeek: 'Bu həftə',
      nextWeek: 'Gələn həftə',
      upcomingVisits: 'Qarşıdan gələn vizitlər',
      completedVisits: 'Tamamlanmış vizitlər',
      pendingVisits: 'Gözləyən vizitlər',
      visitDetails: 'Vizit təfərrüatları',
      reschedule: 'Yenidən planla',
      markComplete: 'Tamamlandı olaraq işarələ',
      noSchedule: 'Cədvəl yoxdur'
    },
    common: {
      none: 'Yoxdur',
      all: 'Hamısı',
      loading: 'Məlumatlar yüklənir'
    },
    visits: {
      title: 'Vizit İdarəetməsi',
      subtitle: 'Həkim vizitlərini qeyd edin və izləyin',
      newVisit: 'Yeni Vizit',
      visitHistory: 'Vizit Tarixçəsi',
      plannedVisits: 'Planlaşdırılmış Vizitlər',
      completedVisits: 'Tamamlanmış Vizitlər',
      missedVisits: 'Qaçırılmış Vizitlər',
      visitDate: 'Vizit tarixi',
      doctor: 'Həkim',
      duration: 'Müddət',
      outcome: 'Nəticə',
      notes: 'Qeydlər',
      followUp: 'Növbəti görüş',
      successful: 'Uğurlu',
      unsuccessful: 'Uğursuz',
      rescheduled: 'Yenidən planlaşdırıldı',
      noVisits: 'Vizit yoxdur'
    }
  },

  // Table and list headers
  table: {
    name: 'Ad',
    email: 'E-poçt',
    phone: 'Telefon', 
    role: 'Rol',
    status: 'Status',
    createdAt: 'Yaradılma tarixi',
    updatedAt: 'Yenilənmə tarixi',
    actions: 'Əməllər',
    noData: 'Məlumat yoxdur',
    loading: 'Yüklənir...',
    rowsPerPage: 'Səhifə başına sətir',
    page: 'Səhifə',
    of: '/',
    showing: 'Göstərilir',
    to: 'dan',
    results: 'nəticə'
  },

  // Form validation messages
  validation: {
    required: 'Bu sahə tələb olunur',
    invalidEmail: 'Düzgün e-poçt ünvanı daxil edin',
    passwordTooShort: 'Şifrə ən az 6 simvoldan ibarət olmalıdır',
    passwordMismatch: 'Şifrələr uyğun gəlmir',
    invalidPhone: 'Düzgün telefon nömrəsi daxil edin',
    min: 'Minimum {min} simvol',
    max: 'Maksimum {max} simvol',
    numeric: 'Yalnız rəqəm daxil edin',
    alphabetic: 'Yalnız hərf daxil edin',
    alphanumeric: 'Yalnız hərf və rəqəm daxil edin'
  },

  // Modal and popup content
  modal: {
    confirmDelete: 'Silməni təsdiq edin',
    confirmDeleteMessage: 'Bu əməliyyat geri qaytarıla bilməz. Davam etmək istədiyinizə əminsiniz?',
    yes: 'Bəli',
    no: 'Xeyr',
    ok: 'OK',
    cancel: 'Ləğv et',
    apply: 'Tətbiq et',
    reset: 'Sıfırla',
    clear: 'Təmizlə',
    selectAll: 'Hamısını seç',
    deselectAll: 'Hamısının seçimini ləğv et',
    comingSoon: 'Bu funksiya tezliklə tətbiq olunacaq.',
    doctorEditingSoon: 'Həkim redaktə funksiyası tezliklə tətbiq olunacaq.',
    productEditingSoon: 'Məhsul redaktə funksiyası tezliklə tətbiq olunacaq.'
  },

  // Notifications and alerts
  notifications: {
    success: 'Əməliyyat uğurla tamamlandı',
    error: 'Xəta baş verdi',
    warning: 'Xəbərdarlıq',
    info: 'Məlumat',
    saved: 'Yadda saxlanıldı',
    updated: 'Yeniləndi',
    deleted: 'Silindi',
    created: 'Yaradıldı',
    uploadSuccess: 'Fayl uğurla yükləndi',
    uploadError: 'Fayl yüklənmədi',
    networkError: 'Şəbəkə xətası',
    serverError: 'Server xətası',
    accessDenied: 'Giriş qadağandır',
    sessionExpired: 'Sessiyanın müddəti bitdi',
    noChanges: 'Dəyişiklik edilməyib',
    unsavedChanges: 'Yadda saxlanmamış dəyişikliklər var'
  },

  // Tooltips and help text
  tooltips: {
    edit: 'Redaktə et',
    delete: 'Sil',
    view: 'Bax',
    download: 'Yüklə',
    upload: 'Yüklə',
    copy: 'Kopyala',
    share: 'Paylaş',
    print: 'Çap et',
    refresh: 'Yenilə',
    filter: 'Süzgəc',
    search: 'Axtarış',
    sort: 'Sırala',
    export: 'İxrac et',
    import: 'İdxal et',
    settings: 'Tənzimləmələr',
    help: 'Kömək',
    close: 'Bağla',
    minimize: 'Kiçilt',
    maximize: 'Böyüt'
  },

  // Time and date formatting
  time: {
    now: 'İndi',
    today: 'Bu gün',
    yesterday: 'Dünən',
    tomorrow: 'Sabah',
    thisWeek: 'Bu həftə',
    lastWeek: 'Keçən həftə',
    nextWeek: 'Gələn həftə',
    thisMonth: 'Bu ay',
    lastMonth: 'Keçən ay',
    nextMonth: 'Gələn ay',
    am: 'səhər',
    pm: 'axşam',
    minute: 'dəqiqə',
    minutes: 'dəqiqə',
    hour: 'saat',
    hours: 'saat',
    day: 'gün',
    days: 'gün',
    week: 'həftə',
    weeks: 'həftə',
    month: 'ay',
    months: 'ay',
    year: 'il',
    years: 'il',
    ago: 'əvvəl'
  },

  // Representative Pages
  representative: {
    dashboard: {
      title: 'Nümayəndə İdarə Paneli',
      welcome: 'Xoş gəlmisiniz!',
      todaysOverview: 'Bu günün icmalı və cədvəli',
      dailyOverview: 'Günlük icmal',
      assignments: 'Tapşırıqlar',
      todayAssignments: 'Bu günün tapşırıqları',
      pendingSectionTitle: 'Başlamalı olduğun görüşlər',
      completedSectionTitle: 'Bu gün başa vurduğun görüşlər',
      allSectionTitle: 'Bütün görüşlər',
      noPending: 'Hazırda başlamalı olduğun görüş yoxdur',
      noCompleted: 'Bu gün hələ tamamlanmış görüş yoxdur',
      statusLabel: 'Status',
      timeAllocated: 'Ayrılan zaman',
      statusCompleted: 'Bitmiş görüş',
      statusPostponed: 'Təxirə salındı',
      statusMissed: 'Tamamlanmamış görüş',
      statusPlanned: 'Planlaşdırılıb',
      totalAssignments: 'Ümumi tapşırıqlar',
      today: 'bu gün',
      completedVisits: 'Tamamlanmış ziyarətlər',
      thisMonth: 'bu ay',
      activeMeetings: 'Aktiv görüşlər',
      inProgress: 'davam edir',
      postponedCount: 'Təxirə salınmış görüşlər',
      allAssignments: 'Bütün tapşırıqlar',
      noAssignments: 'Tapşırıq tapılmadı',
      contactManager: 'Zəhmət olmasa menecerinizlə əlaqə saxlayın',
      meetingInProgress: 'Görüş davam edir',
      meetingDuration: 'Görüş müddəti',
      finishMeeting: 'Görüşü bitir',
      meetingCompleted: 'Görüş tamamlandı! Müddət:',
      startMeeting: 'Görüşə başla',
      meetingActive: 'Görüş aktiv',
      outsideWindow: 'Vaxt aralığı xaricində',
      products: 'məhsul təyin edilmiş',
        visitDays: 'Ziyarət günləri',
        inWindow: 'Vaxt aralığında',
        productsFor: 'məhsullar',
      noProducts: 'Bu həkimə məhsul təyin edilməyib',
      viewDetails: 'Təfərrüatları gör',
      brand: 'Brend',
      specialty: 'İxtisas',
      instant: {
        selectHospital: 'Klinika seç',
        selectDoctor: 'Həkim seç',
        startInstant: 'Anlıq Görüş',
        hasActive: 'Sizdə hazırda aktiv görüş var. Yeni görüş başlatmaq üçün əvvəlkini bitirin.',
        confirmTitle: 'Anlıq görüş təsdiqi',
        confirmText: 'Seçilmiş həkimlə görüşə başlamaq istədiyinizə əminsiniz?',
        yesStart: 'Bəli, başla',
        noCancel: 'Xeyr, ləğv et'
      }
    },
    schedule: {
      title: 'Həftəlik Cədvəl',
      yourVisits: 'Ziyarətləriniz',
      weekRange: 'həftəsi',
      navigation: {
        previousWeek: 'Əvvəlki həftə',
        nextWeek: 'Növbəti həftə',
        thisWeek: 'Bu həftə',
        today: 'Bu gün'
      },
      days: {
        monday: 'Bazar ertəsi',
        tuesday: 'Çərşənbə axşamı',
        wednesday: 'Çərşənbə',
        thursday: 'Cümə axşamı',
        friday: 'Cümə',
        saturday: 'Şənbə',
        sunday: 'Bazar'
      },
      noVisits: 'ziyarət yoxdur',
      doctor: 'Həkim',
      time: 'Vaxt',
      startTime: 'Başlama vaxtı',
      endTime: 'Bitiş vaxtı',
      location: 'Ünvan',
      products: 'Məhsullar',
      visitStatus: 'Ziyarət statusu',
      status: {
        completed: 'Tamamlandı',
        postponed: 'Təxirə salındı',
        missed: 'Qaçırıldı',
        pending: 'Gözləyir',
        inProgress: 'Davam edir',
        planned: 'Planlaşdırılıb'
      },
      actions: {
        startVisit: 'Ziyarətə başla',
        endVisit: 'Ziyarəti bitir',
        visitCompleted: 'Ziyarət tamamlandı'
      },
      started: 'Başladı',
      ended: 'Bitdi',
      reason: 'Səbəb',
      moreMeetings: 'daha çox görüş',
      dayDetails: '{day} üçün görüşlər',
      summary: {
        visitsThisWeek: 'Bu həftə ziyarətlər',
        completed: 'Tamamlandı',
        postponed: 'Təxirə salındı'
      }
    },
    visits: {
      title: 'Ziyarət Tarixçəsi',
      reviewVisits: 'Keçmiş ziyarətlərinizi və performans göstəricilərinizi nəzərdən keçirin',
      filters: 'Filtrlər',
      filterVisits: 'Ziyarətləri filtrlə',
      timePeriod: 'Vaxt dövrü',
      visitStatus: 'Ziyarət statusu',
      search: 'Axtarış',
      searchPlaceholder: 'Həkim, ixtisas və ya səbəb...',
      performanceStats: 'Performans statistikaları',
      thisWeek: 'Bu həftə',
      thisMonth: 'Bu ay',
      totalCompleted: 'Ümumi tamamlandı',
      inSelectedPeriod: 'seçilmiş dövrdə',
      postponed: 'Təxirə salındı',
      visitHistory: 'Ziyarət tarixçəsi',
      visits: 'ziyarət',
      noVisitsFound: 'Ziyarət tapılmadı',
      noVisitsYet: 'Hələ ziyarət yoxdur',
      adjustFilters: 'Filtrlərinizi tənzimləyin',
      completeVisits: 'Bəzi ziyarətləri tamamlamaq üçün tarixçənizi burada görəcəksiniz',
      specialty: 'İxtisas',
      scheduledDate: 'Planlaşdırılan tarix',
      started: 'Başladı',
      ended: 'Bitdi',
      duration: 'Müddət',
      min: 'dəq',
      periods: {
        week: 'Son həftə',
        month: 'Son ay',
        '3months': 'Son 3 ay',
        all: 'Bütün vaxt'
      },
      statuses: {
        all: 'Bütün statuslar',
        completed: 'Tamamlandı',
        postponed: 'Təxirə salındı',
        missed: 'Qaçırıldı'
      }
    }
  },

  // Common placeholders
  placeholders: {
    search: 'Axtarış...',
    email: 'E-poçt ünvanınızı daxil edin',
    password: 'Şifrənizi daxil edin',
    name: 'Adınızı daxil edin',
    phone: 'Telefon nömrənizi daxil edin',
    address: 'Ünvanınızı daxil edin',
    description: 'Təsvir daxil edin',
    notes: 'Qeydlərinizi daxil edin',
    selectOption: 'Seçim edin',
    selectDate: 'Tarix seçin',
    selectTime: 'Vaxt seçin',
    uploadFile: 'Fayl seçin və ya buraya sürükləyin',
    noOptions: 'Seçim yoxdur'
  }
} as const;

// Helper function to get translation
export const t = (key: string): string => {
  // Temporary test - return a simple test value for all assignment keys
  if (key.startsWith('assignments.')) {
    const simpleTranslations: Record<string, string> = {
      'assignments.createWeeklyAssignment': 'Həftəlik Tapşırıq Yarat',
      'assignments.selectDayOfWeek': 'Həftənin günü seçin',
      'assignments.selectedDayOfWeek': 'Seçilmiş həftənin günü',
      'assignments.upcomingAssignments': 'Gələcək Tapşırıqlar',
      'assignments.assignmentDetails': 'Tapşırıq Təfərrüatları',
      'assignments.representative': 'Nümayəndə',
      'assignments.selectRepresentativeRequired': 'Nümayəndə seçin',
      'assignments.startTime': 'Başlama vaxtı',
      'assignments.endTime': 'Bitiş vaxtı',
      'assignments.recurringWeeks': 'Təkrarlanan həftələr',
      'assignments.selectDoctorsRequired': 'Həkim(lər) seçin',
      'assignments.selectProductsRequired': 'Məhsul(lar) seçin',
      'assignments.notesOptional': 'Qeydlər (İstəyə görə)',
      'assignments.additionalNotesPlaceholder': 'Bu tapşırıq üçün əlavə qeydlər...',
      'assignments.cancel': 'Ləğv et',
      'assignments.createWeeklyAssignments': 'Həftəlik Tapşırıq Yarat',
      'assignments.creatingAssignments': 'Tapşırıqlar yaradılır...',
      'assignments.loadingAssignmentData': 'Tapşırıq məlumatları yüklənir...',
      'assignments.weekdays.sunday': 'Bazar',
      'assignments.weekdays.monday': 'Bazar ertəsi',
      'assignments.weekdays.tuesday': 'Çərşənbə axşamı',
      'assignments.weekdays.wednesday': 'Çərşənbə',
      'assignments.weekdays.thursday': 'Cümə axşamı',
      'assignments.weekdays.friday': 'Cümə',
      'assignments.weekdays.saturday': 'Şənbə',
      'assignments.weekdays.sun': 'B',
      'assignments.weekdays.mon': 'BE',
      'assignments.weekdays.tue': 'ÇA',
      'assignments.weekdays.wed': 'Ç',
      'assignments.weekdays.thu': 'CA',
      'assignments.weekdays.fri': 'C',
      'assignments.weekdays.sat': 'Ş',
      'assignments.months.january': 'Yanvar',
      'assignments.months.february': 'Fevral',
      'assignments.months.march': 'Mart',
      'assignments.months.april': 'Aprel',
      'assignments.months.may': 'May',
      'assignments.months.june': 'İyun',
      'assignments.months.july': 'İyul',
      'assignments.months.august': 'Avqust',
      'assignments.months.september': 'Sentyabr',
      'assignments.months.october': 'Oktyabr',
      'assignments.months.november': 'Noyabr',
      'assignments.months.december': 'Dekabr',
      'assignments.recurringOptions.oneWeek': '1 həftə',
      'assignments.recurringOptions.twoWeeks': '2 həftə',
      'assignments.recurringOptions.fourWeeks': '4 həftə',
      'assignments.recurringOptions.eightWeeks': '8 həftə',
      'assignments.recurringOptions.twelveWeeks': '12 həftə',
      'assignments.recurringOptions.sixMonths': '26 həftə (6 ay)',
      'assignments.recurringOptions.oneYear': '52 həftə (1 il)',
      'assignments.moreWeeks': 'daha həftə',
      'assignments.createNewAssignment': 'Yeni Tapşırıq Yarat',
      'assignments.stepOf': 'Addım',
      'assignments.chooseDateAndTime': 'Tarix və Vaxt Seçin',
      'assignments.dateRequired': 'Tarix *',
      'assignments.startTimeRequired': 'Başlama vaxtı *',
      'assignments.endTimeRequired': 'Bitiş vaxtı *',
      'assignments.selected': 'Seçildi',
      'assignments.selectRepresentativeStep': 'Nümayəndə Seçin',
      'assignments.representativeLabel': 'Nümayəndə',
      'assignments.chooseDoctorsFor': 'üçün həkimlər seçin',
      'assignments.selectOneOrMoreDoctors': 'Ziyarət ediləcək bir və ya daha çox həkim seçin:',
      'assignments.doctorsSelected': 'həkim seçildi',
      'assignments.assignProductsToEachDoctor': 'Hər Həkimə Məhsul Təyin Et',
      'assignments.selectProductsForEachDoctor': 'Hər həkimin təqdim ediləcəyi məhsulları seçin:',
      'assignments.productsSelected': 'məhsul seçildi',
      'assignments.previous': 'Əvvəlki',
      'assignments.next': 'Növbəti',
      'assignments.createAssignments': 'Tapşırıqlar Yarat',
      'assignments.failedToLoadData': 'Məlumatları yükləmək uğursuz oldu',
      'assignments.pleaseSelectRepresentative': 'Zəhmət olmasa nümayəndə seçin',
      'assignments.pleaseSelectAtLeastOneDoctor': 'Zəhmət olmasa ən azı bir həkim seçin',
      'assignments.pleaseSelectAtLeastOneProduct': 'Zəhmət olmasa ən azı bir məhsul seçin',
      'assignments.failedToCreateAssignments': 'Tapşırıqlar yaratmaq uğursuz oldu'
    };
    
    if (simpleTranslations[key]) {
      return simpleTranslations[key];
    }
  }
  
  const keys = key.split('.');
  let value: any = AZ_TRANSLATIONS;

  for (const k of keys) {
    value = value?.[k];
  }

  if (typeof value === 'string') return value;

  // Fallbacks for missing report keys (prevents raw key output)
  const fb: any = (AZ_TRANSLATIONS as any)._fallbacks || {};
  if (fb[key]) return fb[key];

  return key;
};

// Export default
export default AZ_TRANSLATIONS;

// Helper to get array translations (lists)
export const tList = (key: string): string[] => {
  const keys = key.split('.');
  let value: any = AZ_TRANSLATIONS;
  for (const k of keys) {
    value = value?.[k];
  }
  return Array.isArray(value) ? value : [];
};

// Weekday localization helper (English weekday to Azerbaijani)
export const toAzWeekday = (enWeekday: string): string => {
  const map: Record<string, string> = {
    Sunday: 'Bazar',
    Monday: 'Bazar ertəsi',
    Tuesday: 'Çərşənbə axşamı',
    Wednesday: 'Çərşənbə',
    Thursday: 'Cümə axşamı',
    Friday: 'Cümə',
    Saturday: 'Şənbə',
    // Short forms
    Sun: 'B',
    Mon: 'BE',
    Tue: 'ÇA',
    Wed: 'Ç',
    Thu: 'CA',
    Fri: 'C',
    Sat: 'Ş',
  };
  return map[enWeekday] || enWeekday;
};
