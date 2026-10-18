export type Locale = "en" | "si";

export interface Translations {
  common: {
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    archive: string;
    create: string;
    add: string;
    search: string;
    filter: string;
    all: string;
    status: string;
    actions: string;
    loading: string;
    date: string;
    notes: string;
    active: string;
    inactive: string;
    archived: string;
    completed: string;
    pending: string;
    success: string;
    error: string;
    warning: string;
    total: string;
    quantity: string;
    amount: string;
    category: string;
    viewAll: string;
    noData: string;
    language: string;
    product: string;
    saving: string;
  };
  nav: {
    overview: string;
    reports: string;
    mushroom: string;
    inventory: string;
    finance: string;
    members: string;
    settings: string;
    activity: string;
    allBusinesses: string;
    platformAdmin: string;
    newBusiness: string;
    signOut: string;
    superAdmin: string;
  };
  mushroom: {
    nav: {
      overview: string;
      batches: string;
      harvests: string;
      contamination: string;
      drying: string;
      strains: string;
    };
    harvests: {
      title: string;
      subtitle: string;
      recordBtn: string;
      modalTitle: string;
      modalSubtitle: string;
      fruitingBatch: string;
      freshProduct: string;
      flushNumber: string;
      totalFreshKg: string;
      gradeAKg: string;
      gradeBKg: string;
      scrapKg: string;
      harvestDate: string;
      observations: string;
      observationsPlaceholder: string;
      submitBtn: string;
      noFruitingBatches: string;
      noFreshProducts: string;
      table: {
        code: string;
        date: string;
        batch: string;
        product: string;
        flush: string;
        totalFresh: string;
        gradeA: string;
        gradeB: string;
        scrap: string;
        observations: string;
      };
    };
    batches: {
      title: string;
      subtitle: string;
      newBatchBtn: string;
      modalTitle: string;
      modalSubtitle: string;
      strain: string;
      recipe: string;
      chamber: string;
      noneChamber: string;
      noRecipe: string;
      initialBags: string;
      expectedYield: string;
      allocatedCost: string;
      startDate: string;
      notes: string;
      notesPlaceholder: string;
      createBtn: string;
      advancePhase: string;
      completeBatch: string;
      logWaste: string;
      currentPhase: string;
      viableBags: string;
      survivalRate: string;
      phases: {
        preparation: string;
        sterilization: string;
        inoculation: string;
        incubation: string;
        fruiting: string;
        completed: string;
        terminated: string;
      };
    };
    contamination: {
      title: string;
      subtitle: string;
      totalDiscarded: string;
      recordBtn: string;
      modalTitle: string;
      modalSubtitle: string;
      selectBatch: string;
      phaseDetected: string;
      discardedBags: string;
      reason: string;
      observations: string;
      observationsPlaceholder: string;
      submitBtn: string;
      noActiveBatches: string;
      reasons: {
        greenMold: string;
        cobweb: string;
        bacterialBlotch: string;
        blackPinMold: string;
        rodentPest: string;
        sterilizationFailure: string;
        unknown: string;
      };
      table: {
        date: string;
        batch: string;
        phase: string;
        discarded: string;
        reason: string;
        notes: string;
      };
    };
    drying: {
      title: string;
      subtitle: string;
      newRunBtn: string;
      modalTitle: string;
      freshInput: string;
      driedOutput: string;
      lossKg: string;
      lossReason: string;
      moistureLoss: string;
      yieldRatio: string;
    };
    strains: {
      title: string;
      subtitle: string;
      addStrainBtn: string;
      addRecipeBtn: string;
      addChamberBtn: string;
      strainName: string;
      scientificName: string;
      incubationDays: string;
      fruitingDays: string;
      recipeName: string;
      bagWeight: string;
      chamberName: string;
      capacity: string;
    };
  };
  inventory: {
    nav: {
      overview: string;
      products: string;
      movements: string;
      purchases: string;
      sales: string;
      contacts: string;
    };
    products: {
      title: string;
      subtitle: string;
      addBtn: string;
      searchPlaceholder: string;
      allCategories: string;
      modalTitle: string;
      modalSubtitle: string;
      editModalTitle: string;
      editingSku: string;
      noProducts: string;
      barcode: string;
      description: string;
      name: string;
      sku: string;
      category: string;
      unit: string;
      cost: string;
      price: string;
      stock: string;
      reorderLevel: string;
      initialStock: string;
      lowStock: string;
      categories: {
        rawMaterial: string;
        packaging: string;
        freshMushroom: string;
        driedMushroom: string;
        generalProduct: string;
      };
    };
  };
  finance: {
    nav: {
      overview: string;
      transactions: string;
      capital: string;
      loans: string;
      profitSharing: string;
    };
    transactions: {
      title: string;
      recordBtn: string;
      type: string;
      income: string;
      expense: string;
      category: string;
      amount: string;
      paymentMethod: string;
      description: string;
      approveBtn: string;
    };
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    email: string;
    password: string;
    signInBtn: string;
    forgotPassword: string;
    rememberMe: string;
  };
}

export const translations: Record<Locale, Translations> = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      confirm: "Confirm",
      delete: "Delete",
      edit: "Edit",
      archive: "Archive",
      create: "Create",
      add: "Add",
      search: "Search",
      filter: "Filter",
      all: "All",
      status: "Status",
      actions: "Actions",
      loading: "Loading...",
      date: "Date",
      notes: "Notes",
      active: "ACTIVE",
      inactive: "INACTIVE",
      archived: "ARCHIVED",
      completed: "COMPLETED",
      pending: "PENDING",
      success: "Success",
      error: "Error",
      warning: "Warning",
      total: "Total",
      quantity: "Quantity",
      amount: "Amount",
      category: "Category",
      viewAll: "View All",
      noData: "No records found.",
      language: "Language",
      product: "Product",
      saving: "Saving...",
    },
    nav: {
      overview: "Overview",
      reports: "Reports",
      mushroom: "Mushroom Farm",
      inventory: "Inventory & Sales",
      finance: "Finance & Accounting",
      members: "Members & Partners",
      settings: "Settings",
      activity: "Activity Log",
      allBusinesses: "All Businesses",
      platformAdmin: "Platform Admin",
      newBusiness: "New Business",
      signOut: "Sign out",
      superAdmin: "Super Admin",
    },
    mushroom: {
      nav: {
        overview: "Production Overview",
        batches: "Production Batches",
        harvests: "Harvest Flushes",
        contamination: "Contamination & Waste",
        drying: "Drying & Processing",
        strains: "Strains & Substrates",
      },
      harvests: {
        title: "Harvest Operations",
        subtitle: "Track multi-flush mushroom yields and auto-post saleable fresh stock to inventory.",
        recordBtn: "Record Mushroom Flush",
        modalTitle: "Record Mushroom Flush",
        modalSubtitle: "Log fresh harvested mushrooms. Saleable yield (Grade A + B) will be atomically credited to fresh inventory.",
        fruitingBatch: "Fruiting Batch *",
        freshProduct: "Fresh Mushroom Product *",
        flushNumber: "Flush # *",
        totalFreshKg: "Total Fresh (kg) *",
        gradeAKg: "Grade A (kg)",
        gradeBKg: "Grade B (kg)",
        scrapKg: "Scrap / Trim Loss (kg)",
        harvestDate: "Harvest Date",
        observations: "Harvest Observations",
        observationsPlaceholder: "Notes on cap size, spore drop, pinhead density...",
        submitBtn: "Post Harvest Yield",
        noFruitingBatches: "No batches in FRUITING phase",
        noFreshProducts: "No FRESH_MUSHROOM products",
        table: {
          code: "Harvest Code",
          date: "Date Harvested",
          batch: "Production Batch",
          product: "Product Credited",
          flush: "Flush #",
          totalFresh: "Total Fresh",
          gradeA: "Grade A",
          gradeB: "Grade B",
          scrap: "Scrap Loss",
          observations: "Observations",
        },
      },
      batches: {
        title: "Production Batches",
        subtitle: "Controlled bag-group production cycles from substrate preparation through harvest.",
        newBatchBtn: "New Batch",
        modalTitle: "Spawn Production Batch",
        modalSubtitle: "Initiate a tracked mushroom production cycle. Consumes recipe ingredients from raw material stock.",
        strain: "Mushroom Strain *",
        recipe: "Substrate Recipe *",
        chamber: "Target Fruiting Chamber",
        noneChamber: "None (Assign during fruiting)",
        noRecipe: "No recipe for strain",
        initialBags: "Initial Bags Count *",
        expectedYield: "Expected Yield (kg)",
        allocatedCost: "Allocated Labor/Utility Cost",
        startDate: "Start Date",
        notes: "Production Notes",
        notesPlaceholder: "Optional batch preparation notes, grain spawn lot reference, etc.",
        createBtn: "Create Batch",
        advancePhase: "Advance Phase",
        completeBatch: "Complete Batch",
        logWaste: "Log Waste / Contamination",
        currentPhase: "Current Phase",
        viableBags: "Viable Bags",
        survivalRate: "Survival Rate",
        phases: {
          preparation: "PREPARATION",
          sterilization: "STERILIZATION",
          inoculation: "INOCULATION",
          incubation: "INCUBATION",
          fruiting: "FRUITING",
          completed: "COMPLETED",
          terminated: "TERMINATED",
        },
      },
      contamination: {
        title: "Contamination & Waste Logs",
        subtitle: "Auditable record of discarded bags, pathogenic outbreaks, and cultivation loss reasons.",
        totalDiscarded: "Total Discarded",
        recordBtn: "Record Contamination",
        modalTitle: "Record Contamination & Waste",
        modalSubtitle: "Log defective, molded or discarded bags to atomically update viable batch inventory.",
        selectBatch: "Select Active Batch *",
        phaseDetected: "Phase Detected *",
        discardedBags: "Discarded Bags *",
        reason: "Pathogen / Failure Reason *",
        observations: "Observations & Action Taken",
        observationsPlaceholder: "Details of contamination location, symptom, or disposal method...",
        submitBtn: "Record Loss",
        noActiveBatches: "No active production batches found. Please create an active batch first before recording waste.",
        reasons: {
          greenMold: "Green Mold (Trichoderma)",
          cobweb: "Cobweb (Dactylium)",
          bacterialBlotch: "Bacterial Blotch",
          blackPinMold: "Black Pin Mold",
          rodentPest: "Rodent / Pest Damage",
          sterilizationFailure: "Sterilization Failure",
          unknown: "Unknown Reason",
        },
        table: {
          date: "Date Logged",
          batch: "Batch Code",
          phase: "Phase Detected",
          discarded: "Discarded Bags",
          reason: "Pathogen / Reason",
          notes: "Observations & Action Taken",
        },
      },
      drying: {
        title: "Drying & Processing Runs",
        subtitle: "Convert surplus fresh mushroom inventory into shelf-stable dried product batches.",
        newRunBtn: "New Drying Run",
        modalTitle: "Execute Drying Run",
        freshInput: "Source Fresh Product *",
        driedOutput: "Destination Dried Product *",
        lossKg: "Trimming / Handling Loss (kg)",
        lossReason: "Loss Reason",
        moistureLoss: "Moisture Loss",
        yieldRatio: "Drying Yield",
      },
      strains: {
        title: "Mushroom Strains & Substrate Recipes",
        subtitle: "Configure biological strain profiles, substrate formulas, and fruiting chamber parameters.",
        addStrainBtn: "Add Strain",
        addRecipeBtn: "Add Recipe",
        addChamberBtn: "Add Chamber",
        strainName: "Strain Name *",
        scientificName: "Scientific Name",
        incubationDays: "Incubation Days *",
        fruitingDays: "Fruiting Days *",
        recipeName: "Recipe Name *",
        bagWeight: "Standard Bag Weight (kg) *",
        chamberName: "Chamber Name *",
        capacity: "Capacity (Bags) *",
      },
    },
    inventory: {
      nav: {
        overview: "Inventory Overview",
        products: "Products & Catalog",
        movements: "Stock Movements & Adjust",
        purchases: "Purchases & Influx",
        sales: "Sales & Invoicing",
        contacts: "Customers & Suppliers",
      },
      products: {
        title: "Product Catalog & Pricing",
        subtitle: "Manage tenant-isolated goods, cost tracking, selling prices, and reorder levels.",
        addBtn: "Add Product",
        searchPlaceholder: "Search by product name, SKU or barcode...",
        allCategories: "All Categories",
        modalTitle: "Add New Product",
        modalSubtitle: "Register a tenant-isolated product item. SKU must be unique in this business.",
        editModalTitle: "Edit Product Details",
        editingSku: "Editing SKU",
        noProducts: "No products found.",
        barcode: "Barcode / QR (Optional)",
        description: "Description (Optional)",
        name: "Product Name *",
        sku: "SKU (Code) *",
        category: "Category *",
        unit: "Unit of Measure *",
        cost: "Unit Cost (LKR) *",
        price: "Selling Price (LKR) *",
        stock: "Current Stock",
        reorderLevel: "Reorder Threshold *",
        initialStock: "Initial Stock (Opening)",
        lowStock: "LOW STOCK",
        categories: {
          rawMaterial: "Raw Material",
          packaging: "Packaging",
          freshMushroom: "Fresh Mushroom",
          driedMushroom: "Dried Mushroom",
          generalProduct: "General Product",
        },
      },
    },
    finance: {
      nav: {
        overview: "Financial Overview",
        transactions: "Income & Expenses",
        capital: "Capital & Withdrawals",
        loans: "Partner & Business Loans",
        profitSharing: "Profit Sharing & Periods",
      },
      transactions: {
        title: "Financial Transactions",
        recordBtn: "Record Transaction",
        type: "Transaction Type *",
        income: "INCOME (Revenue)",
        expense: "EXPENSE (Cost)",
        category: "Category *",
        amount: "Amount (LKR) *",
        paymentMethod: "Payment Method *",
        description: "Description / Memo",
        approveBtn: "Approve",
      },
    },
    auth: {
      loginTitle: "Sign in to BusinessHub",
      loginSubtitle: "Multi-tenant business management and specialized operations platform",
      email: "Email address",
      password: "Password",
      signInBtn: "Sign in",
      forgotPassword: "Forgot password?",
      rememberMe: "Remember me",
    },
  },

  si: {
    common: {
      save: "සුරකින්න (Save)",
      cancel: "අවලංගු කරන්න (Cancel)",
      confirm: "තහවුරු කරන්න (Confirm)",
      delete: "මකන්න (Delete)",
      edit: "වෙනස් කරන්න (Edit)",
      archive: "ලේඛනාගාරගත කරන්න (Archive)",
      create: "සාදන්න (Create)",
      add: "එකතු කරන්න (Add)",
      search: "සොයන්න...",
      filter: "පෙරහන (Filter)",
      all: "සියල්ල (All)",
      status: "තත්ත්වය (Status)",
      actions: "ක්‍රියාවන් (Actions)",
      loading: "පූරණය වෙමින්...",
      date: "දිනය (Date)",
      notes: "සටහන් (Notes)",
      active: "සක්‍රියයි (ACTIVE)",
      inactive: "අක්‍රියයි (INACTIVE)",
      archived: "ලේඛනාගාරගතයි (ARCHIVED)",
      completed: "සම්පූර්ණයි (COMPLETED)",
      pending: "පොරොත්තුවේ (PENDING)",
      success: "සාර්ථකයි",
      error: "දෝෂයකි",
      warning: "අවවාදයයි",
      total: "මුළු එකතුව",
      quantity: "ප්‍රමාණය",
      amount: "මුදල (LKR)",
      category: "කාණ්ඩය (Category)",
      viewAll: "සියල්ල බලන්න",
      noData: "වාර්තා කිසිවක් හමු නොවීය.",
      language: "භාෂාව (Language)",
      product: "නිෂ්පාදනය (Product)",
      saving: "සුරකිමින් පවතී...",
    },
    nav: {
      overview: "දළ විශ්ලේෂණය",
      reports: "වාර්තා (Reports)",
      mushroom: "බිම්මල් ගොවිපළ",
      inventory: "තොග සහ විකුණුම්",
      finance: "මුදල් සහ ගිණුම්",
      members: "සාමාජිකයින් සහ හවුල්කරුවන්",
      settings: "සැකසුම් (Settings)",
      activity: "ක්‍රියාකාරකම් සටහන",
      allBusinesses: "සියලු ව්‍යාපාර",
      platformAdmin: "පද්ධති පරිපාලනය",
      newBusiness: "නව ව්‍යාපාරයක්",
      signOut: "පිටවීම (Sign Out)",
      superAdmin: "සුපිරි පරිපාලක",
    },
    mushroom: {
      nav: {
        overview: "නිෂ්පාදන දළ විශ්ලේෂණය",
        batches: "නිෂ්පාදන කාණ්ඩ (Batches)",
        harvests: "අස්වනු නෙලීම් (Harvests)",
        contamination: "හානි සහ අපතේයාම්",
        drying: "වේලීම සහ සැකසීම (Drying)",
        strains: "ප්‍රභේද සහ වට්ටෝරු",
      },
      harvests: {
        title: "අස්වනු නෙලීමේ මෙහෙයුම්",
        subtitle: "බහු-අස්වනු අස්වැන්න නිරීක්ෂණය කර නැවුම් තොගය ස්වයංක්‍රීයව ගබඩාවට බැර කරන්න.",
        recordBtn: "+ අස්වැන්න සටහන් කරන්න",
        modalTitle: "බිම්මල් අස්වැන්න සටහන් කිරීම",
        modalSubtitle: "නෙලූ නැවුම් බිම්මල් සටහන් කරන්න. විකිණිය හැකි බර (Grade A + B) ස්වයංක්‍රීයව නැවුම් තොගයට බැර වේ.",
        fruitingBatch: "ඵලදරන කාණ්ඩය (Fruiting Batch) *",
        freshProduct: "නැවුම් බිම්මල් භාණ්ඩය (Fresh Product) *",
        flushNumber: "අස්වනු වාරය (Flush #) *",
        totalFreshKg: "මුළු නැවුම් බර (Total Fresh kg) *",
        gradeAKg: "Grade A පළමු ශ්‍රේණියේ බර (kg)",
        gradeBKg: "Grade B දෙවන ශ්‍රේණියේ බර (kg)",
        scrapKg: "කපා ඉවත් කළ / අපතේ ගිය බර (kg)",
        harvestDate: "අස්වනු දිනය",
        observations: "අස්වනු නිරීක්ෂණ සටහන්",
        observationsPlaceholder: "කරල් ප්‍රමාණය, පැහැය හෝ ගුණාත්මකභාවය පිළිබඳ සටහන්...",
        submitBtn: "අස්වැන්න තොගයට එක් කරන්න",
        noFruitingBatches: "ඵලදරන (FRUITING) අවධියේ කාණ්ඩ නොමැත",
        noFreshProducts: "FRESH_MUSHROOM කාණ්ඩයේ භාණ්ඩ නොමැත",
        table: {
          code: "අස්වනු කේතය",
          date: "නෙලූ දිනය",
          batch: "නිෂ්පාදන කාණ්ඩය",
          product: "බැර වූ භාණ්ඩය",
          flush: "වාරය (Flush #)",
          totalFresh: "මුළු නැවුම් බර",
          gradeA: "Grade A බර",
          gradeB: "Grade B බර",
          scrap: "අපතේ ගිය බර",
          observations: "නිරීක්ෂණ සටහන්",
        },
      },
      batches: {
        title: "නිෂ්පාදන කාණ්ඩ (Batches)",
        subtitle: "උපස්ථර සකස් කිරීමේ සිට අස්වැන්න දක්වා පාලිත බෑග් කණ්ඩායම් නිෂ්පාදන චක්‍රය.",
        newBatchBtn: "+ නව කාණ්ඩයක් (New Batch)",
        modalTitle: "නව නිෂ්පාදන කාණ්ඩයක් ආරම්භ කිරීම",
        modalSubtitle: "නව බිම්මල් කාණ්ඩයක් අරඹන්න. වට්ටෝරුවේ අමුද්‍රව්‍ය ස්වයංක්‍රීයව තොගයෙන් අඩු වේ.",
        strain: "බිම්මල් ප්‍රභේදය (Strain) *",
        recipe: "උපස්ථර වට්ටෝරුව (Recipe) *",
        chamber: "වගා කාමරය (Chamber)",
        noneChamber: "කිසිවක් නැත (ඵලදරන විට තෝරන්න)",
        noRecipe: "මෙම ප්‍රභේදය සඳහා වට්ටෝරුවක් නැත",
        initialBags: "ආරම්භක බෑග් ගණන *",
        expectedYield: "බලාපොරොත්තු වන අස්වැන්න (kg)",
        allocatedCost: "වෙන් කළ ශ්‍රම/විදුලි පිරිවැය (LKR)",
        startDate: "ආරම්භක දිනය",
        notes: "නිෂ්පාදන සටහන්",
        notesPlaceholder: "විකල්ප කාණ්ඩ සටහන්, බීජ තොරතුරු ආදිය...",
        createBtn: "කාණ්ඩය අරඹන්න (Create Batch)",
        advancePhase: "ඊළඟ අවධියට (Advance Phase)",
        completeBatch: "කාණ්ඩය අවසන් කරන්න",
        logWaste: "හානි වූ බෑග් සටහන් කරන්න",
        currentPhase: "වත්මන් අවධිය",
        viableBags: "සක්‍රිය බෑග් ගණන",
        survivalRate: "නිරෝගී ප්‍රතිශතය",
        phases: {
          preparation: "සූදානම් කිරීම (PREPARATION)",
          sterilization: "විෂබීජහරණය (STERILIZATION)",
          inoculation: "බීජ තැන්පත් කිරීම (INOCULATION)",
          incubation: "පුර්වායනය (INCUBATION)",
          fruiting: "ඵලදැරීම (FRUITING)",
          completed: "අවසන් කර ඇත (COMPLETED)",
          terminated: "අවලංගුයි (TERMINATED)",
        },
      },
      contamination: {
        title: "දිලීර හානි සහ අපතේයාම් ලොගය",
        subtitle: "ඉවත් කළ බෑග්, රෝග වසංගත සහ වගා පාඩු පිළිබඳ විගණනය කළ හැකි වාර්තාව.",
        totalDiscarded: "මුළු ඉවත් කළ ප්‍රමාණය",
        recordBtn: "+ හානි සටහන් කරන්න",
        modalTitle: "දිලීර හානි සහ අපතේයාම් සටහන් කිරීම",
        modalSubtitle: "දෝෂ සහිත හෝ නරක් වූ බෑග් ඉවත් කර සක්‍රිය බෑග් ගණන යාවත්කාලීන කරන්න.",
        selectBatch: "සක්‍රිය කාණ්ඩය තෝරන්න *",
        phaseDetected: "හඳුනාගත් අවධිය *",
        discardedBags: "ඉවත් කළ බෑග් ගණන *",
        reason: "රෝගය හෝ හානිවීමේ හේතුව *",
        observations: "නිරීක්ෂණ සහ ගත් ක්‍රියාමාර්ග",
        observationsPlaceholder: "හානිය හඳුනාගත් ආකාරය, ලක්ෂණ සහ ඉවත් කළ ක්‍රමය...",
        submitBtn: "පාඩුව සටහන් කරන්න (Record Loss)",
        noActiveBatches: "සක්‍රිය නිෂ්පාදන කාණ්ඩ කිසිවක් හමු නොවීය. හානි සටහන් කිරීමට පෙර කරුණාකර පළමුව කාණ්ඩයක් සාදන්න.",
        reasons: {
          greenMold: "කොළ පැහැති පුස් (Trichoderma)",
          cobweb: "මකුළු දැල් දිලීරය (Cobweb / Dactylium)",
          bacterialBlotch: "බැක්ටීරියා ලප රෝගය (Bacterial Blotch)",
          blackPinMold: "කළු හිස් පුස් (Black Pin Mold)",
          rodentPest: "මීයන් / පළිබෝධක හානි",
          sterilizationFailure: "විෂබීජහරණ දෝෂයකි",
          unknown: "හඳුනා නොගත් හේතුවක්",
        },
        table: {
          date: "සටහන් කළ දිනය",
          batch: "කාණ්ඩ කේතය",
          phase: "හඳුනාගත් අවධිය",
          discarded: "ඉවත් කළ බෑග්",
          reason: "හේතුව / රෝගය",
          notes: "නිරීක්ෂණ සහ ගත් ක්‍රියාමාර්ග",
        },
      },
      drying: {
        title: "වේලීම සහ අගය එකතු කිරීමේ මෙහෙයුම්",
        subtitle: "අතිරික්ත නැවුම් බිම්මල් තොගය දිගුකල් තබාගත හැකි වියළි බිම්මල් බවට පත් කරන්න.",
        newRunBtn: "+ නව වේලීමේ ක්‍රියාවලියක්",
        modalTitle: "බිම්මල් වේලීමේ මෙහෙයුම ක්‍රියාත්මක කිරීම",
        freshInput: "යොමු කළ නැවුම් බිම්මල් *",
        driedOutput: "ලැබුණු වියළි බිම්මල් *",
        lossKg: "කපා ඉවත් කිරීමේ හානිය (kg)",
        lossReason: "හානිවීමට හේතුව",
        moistureLoss: "තෙතමනය අඩුවීම",
        yieldRatio: "වියළි අස්වනු අනුපාතය",
      },
      strains: {
        title: "බිම්මල් ප්‍රභේද සහ උපස්ථර වට්ටෝරු",
        subtitle: "ජීව විද්‍යාත්මක ප්‍රභේද, උපස්ථර මිශ්‍රණ සහ වගා කාමර පරාමිතීන් සකසන්න.",
        addStrainBtn: "+ ප්‍රභේදයක් එක් කරන්න",
        addRecipeBtn: "+ වට්ටෝරුවක් එක් කරන්න",
        addChamberBtn: "+ කාමරයක් එක් කරන්න",
        strainName: "ප්‍රභේදයේ නම *",
        scientificName: "විද්‍යාත්මක නාමය",
        incubationDays: "පුර්වායන දින ගණන *",
        fruitingDays: "ඵලදරන දින ගණන *",
        recipeName: "වට්ටෝරුවේ නම *",
        bagWeight: "බෑගයක සම්මත බර (kg) *",
        chamberName: "කාමරයේ නම *",
        capacity: "ධාරිතාව (බෑග්) *",
      },
    },
    inventory: {
      nav: {
        overview: "තොග දළ විශ්ලේෂණය",
        products: "නිෂ්පාදන සහ නාමාවලිය",
        movements: "තොග සංචලන සහ සීරුමාරු",
        purchases: "මිලදී ගැනීම් සහ ලැබීම්",
        sales: "විකුණුම් සහ ඉන්වොයිස්",
        contacts: "පාරිභෝගිකයින් සහ සැපයුම්කරුවන්",
      },
      products: {
        title: "නිෂ්පාදන නාමාවලිය සහ මිල ගණන්",
        subtitle: "ව්‍යාපාරයට අයත් භාණ්ඩ, පිරිවැය ලුහුබැඳීම, විකුණුම් මිල සහ නැවත ඇණවුම් මට්ටම් පාලනය කරන්න.",
        addBtn: "+ නව නිෂ්පාදනයක්",
        searchPlaceholder: "නම, SKU හෝ බාර්කෝඩ් මගින් සොයන්න...",
        allCategories: "සියලු කාණ්ඩ",
        modalTitle: "නව නිෂ්පාදනයක් ඇතුළත් කිරීම",
        modalSubtitle: "ව්‍යාපාරයට අයත් භාණ්ඩයක් ලියාපදිංචි කරන්න. SKU කේතය අද්විතීය විය යුතුය.",
        editModalTitle: "නිෂ්පාදන විස්තර සංස්කරණය",
        editingSku: "සංස්කරණය වන SKU",
        noProducts: "නිෂ්පාදන කිසිවක් හමු නොවීය.",
        barcode: "බාර්කෝඩ් / QR (විකල්ප)",
        description: "විස්තරය (විකල්ප)",
        name: "නිෂ්පාදනයේ නම *",
        sku: "භාණ්ඩ කේතය (SKU) *",
        category: "කාණ්ඩය (Category) *",
        unit: "මිනුම් ඒකකය *",
        cost: "ඒකක පිරිවැය (LKR) *",
        price: "විකුණුම් මිල (LKR) *",
        stock: "වත්මන් තොගය",
        reorderLevel: "අවම තොග සීමාව *",
        initialStock: "ආරම්භක තොග ප්‍රමාණය",
        lowStock: "අඩු තොගයකි!",
        categories: {
          rawMaterial: "අමුද්‍රව්‍ය (Raw Material)",
          packaging: "ඇසුරුම් ද්‍රව්‍ය (Packaging)",
          freshMushroom: "නැවුම් බිම්මල් (Fresh Mushroom)",
          driedMushroom: "වියළි බිම්මල් (Dried Mushroom)",
          generalProduct: "සාමාන්‍ය භාණ්ඩ (General Product)",
        },
      },
    },
    finance: {
      nav: {
        overview: "මූල්‍ය දළ විශ්ලේෂණය",
        transactions: "ආදායම් සහ වියදම්",
        capital: "ප්‍රාග්ධනය සහ මුදල් ලබාගැනීම්",
        loans: "ණය කළමනාකරණය",
        profitSharing: "ලාභ බෙදාහැරීම සහ වාර",
      },
      transactions: {
        title: "මූල්‍ය ගනුදෙනු",
        recordBtn: "+ ගනුදෙනුවක් සටහන් කරන්න",
        type: "ගනුදෙනු වර්ගය *",
        income: "ආදායම් (INCOME)",
        expense: "වියදම් (EXPENSE)",
        category: "කාණ්ඩය *",
        amount: "මුදල (LKR) *",
        paymentMethod: "ගෙවූ ආකාරය *",
        description: "විස්තරය / සටහන",
        approveBtn: "අනුමත කරන්න",
      },
    },
    auth: {
      loginTitle: "BusinessHub වෙත පිවිසෙන්න",
      loginSubtitle: "බහු-ව්‍යාපාරික කළමනාකරණ සහ විශේෂිත මෙහෙයුම් වේදිකාව",
      email: "ඊමේල් ලිපිනය",
      password: "මුරපදය",
      signInBtn: "ඇතුළු වන්න (Sign In)",
      forgotPassword: "මුරපදය අමතකද?",
      rememberMe: "මතක තබා ගන්න",
    },
  },
};
