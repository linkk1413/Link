// Complete Saudi Arabia Regions, Cities, and Districts data

export interface District {
  value: string;
  label: { en: string; ar: string };
}

export interface City {
  value: string;
  label: { en: string; ar: string };
  districts: District[];
}

export interface Region {
  value: string;
  label: { en: string; ar: string };
  cities: City[];
}

export const SAUDI_REGIONS: Region[] = [
  {
    value: "Riyadh",
    label: { en: "Riyadh", ar: "الرياض" },
    cities: [
      {
        value: "Riyadh",
        label: { en: "Riyadh", ar: "الرياض" },
        districts: [
          { value: "Al Olaya", label: { en: "Al Olaya", ar: "العليا" } },
          { value: "Al Malqa", label: { en: "Al Malqa", ar: "الملقا" } },
          { value: "Al Nakheel", label: { en: "Al Nakheel", ar: "النخيل" } },
          { value: "Al Yasmeen", label: { en: "Al Yasmeen", ar: "الياسمين" } },
          { value: "Al Narjis", label: { en: "Al Narjis", ar: "النرجس" } },
          { value: "Al Sahafah", label: { en: "Al Sahafah", ar: "الصحافة" } },
          { value: "Al Muruj", label: { en: "Al Muruj", ar: "المروج" } },
          { value: "Al Rawdah", label: { en: "Al Rawdah", ar: "الروضة" } },
          {
            value: "Al Sulimaniyah",
            label: { en: "Al Sulimaniyah", ar: "السليمانية" },
          },
          { value: "Al Wadi", label: { en: "Al Wadi", ar: "الوادي" } },
        ],
      },
      {
        value: "Al Kharj",
        label: { en: "Al Kharj", ar: "الخرج" },
        districts: [
          { value: "Al Yarmouk", label: { en: "Al Yarmouk", ar: "اليرموك" } },
          { value: "Al Andalus", label: { en: "Al Andalus", ar: "الأندلس" } },
        ],
      },
      {
        value: "Ad Diriyah",
        label: { en: "Ad Diriyah", ar: "الدرعية" },
        districts: [
          { value: "Al Bujairi", label: { en: "Al Bujairi", ar: "البجيري" } },
        ],
      },
      {
        value: "Al Majmaah",
        label: { en: "Al Majmaah", ar: "المجمعة" },
        districts: [
          {
            value: "Al Faisaliyah",
            label: { en: "Al Faisaliyah", ar: "الفيصلية" },
          },
        ],
      },
      {
        value: "Dawadmi",
        label: { en: "Dawadmi", ar: "الدوادمي" },
        districts: [
          { value: "Al Rawdah", label: { en: "Al Rawdah", ar: "الروضة" } },
        ],
      },
      {
        value: "Al Zulfi",
        label: { en: "Al Zulfi", ar: "الزلفي" },
        districts: [
          { value: "Al Safa", label: { en: "Al Safa", ar: "الصفا" } },
        ],
      },
      {
        value: "Wadi Ad Dawasir",
        label: { en: "Wadi Ad Dawasir", ar: "وادي الدواسر" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Aflaj",
        label: { en: "Al Aflaj", ar: "الأفلاج" },
        districts: [{ value: "Layla", label: { en: "Layla", ar: "ليلى" } }],
      },
      {
        value: "Hotat Bani Tamim",
        label: { en: "Hotat Bani Tamim", ar: "حوطة بني تميم" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Quway'iyah",
        label: { en: "Al Quway'iyah", ar: "القويعية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Shaqra",
        label: { en: "Shaqra", ar: "شقراء" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Ghat",
        label: { en: "Al Ghat", ar: "الغاط" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Rumah",
        label: { en: "Rumah", ar: "رماح" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Thadiq",
        label: { en: "Thadiq", ar: "ثادق" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Hariq",
        label: { en: "Al Hariq", ar: "الحريق" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Marat",
        label: { en: "Marat", ar: "مرات" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "As Sulayyil",
        label: { en: "As Sulayyil", ar: "السليل" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Makkah",
    label: { en: "Makkah", ar: "مكة المكرمة" },
    cities: [
      {
        value: "Jeddah",
        label: { en: "Jeddah", ar: "جدة" },
        districts: [
          { value: "Al Hamra", label: { en: "Al Hamra", ar: "الحمراء" } },
          { value: "Al Rawdah", label: { en: "Al Rawdah", ar: "الروضة" } },
          { value: "Al Salamah", label: { en: "Al Salamah", ar: "السلامة" } },
          { value: "Al Nahdah", label: { en: "Al Nahdah", ar: "النهضة" } },
          { value: "Al Marwah", label: { en: "Al Marwah", ar: "المروة" } },
          { value: "Al Safa", label: { en: "Al Safa", ar: "الصفا" } },
          { value: "Al Zahra", label: { en: "Al Zahra", ar: "الزهراء" } },
          {
            value: "Al Faisaliyah",
            label: { en: "Al Faisaliyah", ar: "الفيصلية" },
          },
        ],
      },
      {
        value: "Makkah",
        label: { en: "Makkah", ar: "مكة" },
        districts: [
          { value: "Ajyad", label: { en: "Ajyad", ar: "أجياد" } },
          {
            value: "Al Aziziyah",
            label: { en: "Al Aziziyah", ar: "العزيزية" },
          },
          {
            value: "Al Shubaikah",
            label: { en: "Al Shubaikah", ar: "الشبيكة" },
          },
          { value: "Al Rusaifah", label: { en: "Al Rusaifah", ar: "الرصيفة" } },
        ],
      },
      {
        value: "Taif",
        label: { en: "Taif", ar: "الطائف" },
        districts: [
          { value: "Al Shafa", label: { en: "Al Shafa", ar: "الشفا" } },
          { value: "Al Hawiyah", label: { en: "Al Hawiyah", ar: "الحوية" } },
          {
            value: "Al Faisaliyah",
            label: { en: "Al Faisaliyah", ar: "الفيصلية" },
          },
        ],
      },
      {
        value: "Rabigh",
        label: { en: "Rabigh", ar: "رابغ" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Qunfudhah",
        label: { en: "Al Qunfudhah", ar: "القنفذة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Lith",
        label: { en: "Al Lith", ar: "الليث" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Khulais",
        label: { en: "Khulais", ar: "خليص" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Jumum",
        label: { en: "Al Jumum", ar: "الجموم" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Kamil",
        label: { en: "Al Kamil", ar: "الكامل" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Bahrah",
        label: { en: "Bahrah", ar: "بحرة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Thuwal",
        label: { en: "Thuwal", ar: "ثول" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Muwayh",
        label: { en: "Al Muwayh", ar: "المويه" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Turabah",
        label: { en: "Turabah", ar: "تربة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Ranyah",
        label: { en: "Ranyah", ar: "رنية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Khurmah",
        label: { en: "Al Khurmah", ar: "الخرمة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Adham",
        label: { en: "Adham", ar: "أضم" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Madinah",
    label: { en: "Madinah", ar: "المدينة المنورة" },
    cities: [
      {
        value: "Madinah",
        label: { en: "Madinah", ar: "المدينة" },
        districts: [
          { value: "Quba", label: { en: "Quba", ar: "قباء" } },
          { value: "Al Aqiq", label: { en: "Al Aqiq", ar: "العقيق" } },
          { value: "Al Haram", label: { en: "Al Haram", ar: "الحرم" } },
          { value: "Al Awali", label: { en: "Al Awali", ar: "العوالي" } },
        ],
      },
      {
        value: "Yanbu",
        label: { en: "Yanbu", ar: "ينبع" },
        districts: [
          { value: "Al Murjan", label: { en: "Al Murjan", ar: "المرجان" } },
          { value: "Al Balad", label: { en: "Al Balad", ar: "البلد" } },
          {
            value: "Yanbu Al Sinaiyah",
            label: { en: "Yanbu Al Sinaiyah", ar: "ينبع الصناعية" },
          },
        ],
      },
      {
        value: "Al Ula",
        label: { en: "Al Ula", ar: "العلا" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Badr",
        label: { en: "Badr", ar: "بدر" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Khaybar",
        label: { en: "Khaybar", ar: "خيبر" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Mahd",
        label: { en: "Al Mahd", ar: "المهد" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Hanakiyah",
        label: { en: "Al Hanakiyah", ar: "الحناكية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Hinakiyah",
        label: { en: "Al Hinakiyah", ar: "الحناكية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Wadi Al Fara",
        label: { en: "Wadi Al Fara", ar: "وادي الفرع" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Ais",
        label: { en: "Al Ais", ar: "العيص" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Eastern Province",
    label: { en: "Eastern Province", ar: "المنطقة الشرقية" },
    cities: [
      {
        value: "Dammam",
        label: { en: "Dammam", ar: "الدمام" },
        districts: [
          {
            value: "Al Faisaliyah",
            label: { en: "Al Faisaliyah", ar: "الفيصلية" },
          },
          { value: "Al Shati", label: { en: "Al Shati", ar: "الشاطئ" } },
          {
            value: "Al Muraikabat",
            label: { en: "Al Muraikabat", ar: "المريكبات" },
          },
          { value: "Al Nakheel", label: { en: "Al Nakheel", ar: "النخيل" } },
          {
            value: "Al Mazruiyah",
            label: { en: "Al Mazruiyah", ar: "المزروعية" },
          },
        ],
      },
      {
        value: "Khobar",
        label: { en: "Khobar", ar: "الخبر" },
        districts: [
          { value: "Al Ulaya", label: { en: "Al Ulaya", ar: "العليا" } },
          { value: "Al Rakah", label: { en: "Al Rakah", ar: "الراكة" } },
          { value: "Al Thuqbah", label: { en: "Al Thuqbah", ar: "الثقبة" } },
          {
            value: "Al Kurnaish",
            label: { en: "Al Kurnaish", ar: "الكورنيش" },
          },
        ],
      },
      {
        value: "Dhahran",
        label: { en: "Dhahran", ar: "الظهران" },
        districts: [
          { value: "Al Dana", label: { en: "Al Dana", ar: "الدانة" } },
          { value: "KFUPM", label: { en: "KFUPM", ar: "جامعة الملك فهد" } },
        ],
      },
      {
        value: "Al Ahsa",
        label: { en: "Al Ahsa", ar: "الأحساء" },
        districts: [
          { value: "Al Hofuf", label: { en: "Al Hofuf", ar: "الهفوف" } },
          { value: "Al Mubarraz", label: { en: "Al Mubarraz", ar: "المبرز" } },
          { value: "Al Oyun", label: { en: "Al Oyun", ar: "العيون" } },
        ],
      },
      {
        value: "Jubail",
        label: { en: "Jubail", ar: "الجبيل" },
        districts: [
          {
            value: "Jubail Industrial",
            label: { en: "Jubail Industrial", ar: "الجبيل الصناعية" },
          },
          {
            value: "Al Fanateer",
            label: { en: "Al Fanateer", ar: "الفناتير" },
          },
        ],
      },
      {
        value: "Qatif",
        label: { en: "Qatif", ar: "القطيف" },
        districts: [
          {
            value: "Al Awamiyah",
            label: { en: "Al Awamiyah", ar: "العوامية" },
          },
          { value: "Safwa", label: { en: "Safwa", ar: "صفوى" } },
          { value: "Saihat", label: { en: "Saihat", ar: "سيهات" } },
          { value: "Tarout", label: { en: "Tarout", ar: "تاروت" } },
        ],
      },
      {
        value: "Ras Tanura",
        label: { en: "Ras Tanura", ar: "رأس تنورة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Hafar Al Batin",
        label: { en: "Hafar Al Batin", ar: "حفر الباطن" },
        districts: [
          {
            value: "Al Khalidiyah",
            label: { en: "Al Khalidiyah", ar: "الخالدية" },
          },
          {
            value: "Al Sulimaniyah",
            label: { en: "Al Sulimaniyah", ar: "السليمانية" },
          },
        ],
      },
      {
        value: "Khafji",
        label: { en: "Khafji", ar: "الخفجي" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Buqayq",
        label: { en: "Buqayq", ar: "بقيق" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Nairyah",
        label: { en: "Al Nairyah", ar: "النعيرية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Udhailiyah",
        label: { en: "Udhailiyah", ar: "العضيلية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Qassim",
    label: { en: "Qassim", ar: "القصيم" },
    cities: [
      {
        value: "Buraydah",
        label: { en: "Buraydah", ar: "بريدة" },
        districts: [
          { value: "Al Rawdah", label: { en: "Al Rawdah", ar: "الروضة" } },
          { value: "Al Iskan", label: { en: "Al Iskan", ar: "الإسكان" } },
          {
            value: "Al Faisaliyah",
            label: { en: "Al Faisaliyah", ar: "الفيصلية" },
          },
          {
            value: "Al Khalidiyah",
            label: { en: "Al Khalidiyah", ar: "الخالدية" },
          },
        ],
      },
      {
        value: "Unaizah",
        label: { en: "Unaizah", ar: "عنيزة" },
        districts: [
          {
            value: "Al Salhiyah",
            label: { en: "Al Salhiyah", ar: "الصالحية" },
          },
          {
            value: "Al Khalidiyah",
            label: { en: "Al Khalidiyah", ar: "الخالدية" },
          },
        ],
      },
      {
        value: "Ar Rass",
        label: { en: "Ar Rass", ar: "الرس" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Mithnab",
        label: { en: "Al Mithnab", ar: "المذنب" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Bukayriyah",
        label: { en: "Al Bukayriyah", ar: "البكيرية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Badai",
        label: { en: "Al Badai", ar: "البدائع" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Uyun Al Jiwa",
        label: { en: "Uyun Al Jiwa", ar: "عيون الجواء" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Riyadh Al Khabra",
        label: { en: "Riyadh Al Khabra", ar: "رياض الخبراء" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Shimasiyah",
        label: { en: "Al Shimasiyah", ar: "الشماسية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Uglat Asugour",
        label: { en: "Uglat Asugour", ar: "عقلة الصقور" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Dhariyah",
        label: { en: "Dhariyah", ar: "ضرية" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Asyah",
        label: { en: "Al Asyah", ar: "الأسياح" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Asir",
    label: { en: "Asir", ar: "عسير" },
    cities: [
      {
        value: "Abha",
        label: { en: "Abha", ar: "أبها" },
        districts: [
          { value: "Al Nasb", label: { en: "Al Nasb", ar: "النصب" } },
          {
            value: "Al Khaldiyah",
            label: { en: "Al Khaldiyah", ar: "الخالدية" },
          },
          { value: "Al Mahalah", label: { en: "Al Mahalah", ar: "المحالة" } },
        ],
      },
      {
        value: "Khamis Mushait",
        label: { en: "Khamis Mushait", ar: "خميس مشيط" },
        districts: [
          { value: "Al Dabab", label: { en: "Al Dabab", ar: "الضباب" } },
          {
            value: "Al Thalatha",
            label: { en: "Al Thalatha", ar: "الثلاثاء" },
          },
          { value: "Al Rabie", label: { en: "Al Rabie", ar: "الربيع" } },
        ],
      },
      {
        value: "Bisha",
        label: { en: "Bisha", ar: "بيشة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "An Namas",
        label: { en: "An Namas", ar: "النماص" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Muhayil",
        label: { en: "Muhayil", ar: "محايل" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Ahad Rafidah",
        label: { en: "Ahad Rafidah", ar: "أحد رفيدة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Sarat Abidah",
        label: { en: "Sarat Abidah", ar: "سراة عبيدة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Rijal Almaa",
        label: { en: "Rijal Almaa", ar: "رجال ألمع" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Tanomah",
        label: { en: "Tanomah", ar: "تنومة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Dhahran Al Janub",
        label: { en: "Dhahran Al Janub", ar: "ظهران الجنوب" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Balqarn",
        label: { en: "Balqarn", ar: "بلقرن" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Tathlith",
        label: { en: "Tathlith", ar: "تثليث" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Majardah",
        label: { en: "Al Majardah", ar: "المجاردة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Bariq",
        label: { en: "Bariq", ar: "بارق" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Tabuk",
    label: { en: "Tabuk", ar: "تبوك" },
    cities: [
      {
        value: "Tabuk",
        label: { en: "Tabuk", ar: "تبوك" },
        districts: [
          { value: "Al Wurud", label: { en: "Al Wurud", ar: "الورود" } },
          {
            value: "Al Sulaymaniyah",
            label: { en: "Al Sulaymaniyah", ar: "السليمانية" },
          },
          {
            value: "Al Faisaliyah",
            label: { en: "Al Faisaliyah", ar: "الفيصلية" },
          },
        ],
      },
      {
        value: "Duba",
        label: { en: "Duba", ar: "ضباء" },
        districts: [
          { value: "Al Shati", label: { en: "Al Shati", ar: "الشاطئ" } },
        ],
      },
      {
        value: "Umluj",
        label: { en: "Umluj", ar: "أملج" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Wajh",
        label: { en: "Al Wajh", ar: "الوجه" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Haql",
        label: { en: "Haql", ar: "حقل" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Tayma",
        label: { en: "Tayma", ar: "تيماء" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Sharma",
        label: { en: "Sharma", ar: "شرما" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "NEOM",
        label: { en: "NEOM", ar: "نيوم" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Hail",
    label: { en: "Hail", ar: "حائل" },
    cities: [
      {
        value: "Hail",
        label: { en: "Hail", ar: "حائل" },
        districts: [
          { value: "Al Nafl", label: { en: "Al Nafl", ar: "النفل" } },
          { value: "Al Mahattah", label: { en: "Al Mahattah", ar: "المحطة" } },
          { value: "Al Zahra", label: { en: "Al Zahra", ar: "الزهراء" } },
        ],
      },
      {
        value: "Baqaa",
        label: { en: "Baqaa", ar: "بقعاء" },
        districts: [
          { value: "Al Batin", label: { en: "Al Batin", ar: "الباطن" } },
        ],
      },
      {
        value: "Al Ghazalah",
        label: { en: "Al Ghazalah", ar: "الغزالة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Shinan",
        label: { en: "Al Shinan", ar: "الشنان" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Ash Shamli",
        label: { en: "Ash Shamli", ar: "الشملي" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Mawqaq",
        label: { en: "Mawqaq", ar: "موقق" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Sumayrah",
        label: { en: "Sumayrah", ar: "السميراء" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Hayt",
        label: { en: "Al Hayt", ar: "الحائط" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Northern Borders",
    label: { en: "Northern Borders", ar: "الحدود الشمالية" },
    cities: [
      {
        value: "Arar",
        label: { en: "Arar", ar: "عرعر" },
        districts: [
          { value: "Al Matar", label: { en: "Al Matar", ar: "المطار" } },
          { value: "Al Rabi", label: { en: "Al Rabi", ar: "الربيع" } },
          {
            value: "Al Faisaliyah",
            label: { en: "Al Faisaliyah", ar: "الفيصلية" },
          },
        ],
      },
      {
        value: "Rafha",
        label: { en: "Rafha", ar: "رفحاء" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Turaif",
        label: { en: "Turaif", ar: "طريف" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Uwayqilah",
        label: { en: "Al Uwayqilah", ar: "العويقيلة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Jazan",
    label: { en: "Jazan", ar: "جازان" },
    cities: [
      {
        value: "Jazan",
        label: { en: "Jazan", ar: "جازان" },
        districts: [
          { value: "Al Rawdah", label: { en: "Al Rawdah", ar: "الروضة" } },
          { value: "Al Safa", label: { en: "Al Safa", ar: "الصفا" } },
          { value: "Al Shati", label: { en: "Al Shati", ar: "الشاطئ" } },
        ],
      },
      {
        value: "Sabya",
        label: { en: "Sabya", ar: "صبيا" },
        districts: [
          { value: "Al Safa", label: { en: "Al Safa", ar: "الصفا" } },
        ],
      },
      {
        value: "Abu Arish",
        label: { en: "Abu Arish", ar: "أبو عريش" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Samtah",
        label: { en: "Samtah", ar: "صامطة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Ahad Al Masarihah",
        label: { en: "Ahad Al Masarihah", ar: "أحد المسارحة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Aridhah",
        label: { en: "Al Aridhah", ar: "العارضة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Farasan",
        label: { en: "Farasan", ar: "فرسان" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Darb",
        label: { en: "Al Darb", ar: "الدرب" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Baysh",
        label: { en: "Baysh", ar: "بيش" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Damad",
        label: { en: "Damad", ar: "ضمد" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Rayth",
        label: { en: "Al Rayth", ar: "الريث" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Harub",
        label: { en: "Harub", ar: "هروب" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Tuwal",
        label: { en: "Al Tuwal", ar: "الطوال" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Eidabi",
        label: { en: "Al Eidabi", ar: "العيدابي" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Fayfa",
        label: { en: "Fayfa", ar: "فيفا" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Khobah",
        label: { en: "Al Khobah", ar: "الخوبة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Najran",
    label: { en: "Najran", ar: "نجران" },
    cities: [
      {
        value: "Najran",
        label: { en: "Najran", ar: "نجران" },
        districts: [
          {
            value: "Al Khalidiyah",
            label: { en: "Al Khalidiyah", ar: "الخالدية" },
          },
          {
            value: "Al Faysaliyah",
            label: { en: "Al Faysaliyah", ar: "الفيصلية" },
          },
          { value: "Al Balad", label: { en: "Al Balad", ar: "البلد" } },
        ],
      },
      {
        value: "Sharurah",
        label: { en: "Sharurah", ar: "شرورة" },
        districts: [
          { value: "Al Mahd", label: { en: "Al Mahd", ar: "المهد" } },
        ],
      },
      {
        value: "Hubuna",
        label: { en: "Hubuna", ar: "حبونا" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Badr Al Janub",
        label: { en: "Badr Al Janub", ar: "بدر الجنوب" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Yadamah",
        label: { en: "Yadamah", ar: "يدمة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Thar",
        label: { en: "Thar", ar: "ثار" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Khubash",
        label: { en: "Khubash", ar: "خباش" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Al Bahah",
    label: { en: "Al Bahah", ar: "الباحة" },
    cities: [
      {
        value: "Al Bahah",
        label: { en: "Al Bahah", ar: "الباحة" },
        districts: [
          { value: "Al Zaher", label: { en: "Al Zaher", ar: "الزاهر" } },
          { value: "Al Atawlah", label: { en: "Al Atawlah", ar: "الأطاولة" } },
        ],
      },
      {
        value: "Baljurashi",
        label: { en: "Baljurashi", ar: "بلجرشي" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Mandaq",
        label: { en: "Al Mandaq", ar: "المندق" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Makhwah",
        label: { en: "Al Makhwah", ar: "المخواة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Aqiq",
        label: { en: "Al Aqiq", ar: "العقيق" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Qilwah",
        label: { en: "Qilwah", ar: "قلوة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Ghamid Az Zinad",
        label: { en: "Ghamid Az Zinad", ar: "غامد الزناد" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Hajrah",
        label: { en: "Al Hajrah", ar: "الحجرة" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Bani Hasan",
        label: { en: "Bani Hasan", ar: "بني حسن" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
  {
    value: "Al Jawf",
    label: { en: "Al Jawf", ar: "الجوف" },
    cities: [
      {
        value: "Sakaka",
        label: { en: "Sakaka", ar: "سكاكا" },
        districts: [
          {
            value: "Al Suwaiflah",
            label: { en: "Al Suwaiflah", ar: "السويفلة" },
          },
          { value: "Al Badiah", label: { en: "Al Badiah", ar: "البادية" } },
          { value: "Al Naseem", label: { en: "Al Naseem", ar: "النسيم" } },
        ],
      },
      {
        value: "Dumat Al Jandal",
        label: { en: "Dumat Al Jandal", ar: "دومة الجندل" },
        districts: [
          { value: "Al Qasr", label: { en: "Al Qasr", ar: "القصر" } },
        ],
      },
      {
        value: "Qurayyat",
        label: { en: "Qurayyat", ar: "القريات" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Tabarjal",
        label: { en: "Tabarjal", ar: "طبرجل" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
      {
        value: "Al Laqayit",
        label: { en: "Al Laqayit", ar: "اللقائط" },
        districts: [
          { value: "Al Markaz", label: { en: "Al Markaz", ar: "المركز" } },
        ],
      },
    ],
  },
];

// Regions and cities are stored by their English `value` ("Riyadh"), so anything
// that renders a stored value must translate it back through these helpers —
// otherwise Arabic users see English place names.

const pickLabel = (
  item: { label: { en: string; ar: string } } | undefined,
  isArabic: boolean,
  fallback: string,
): string => {
  if (!item) return fallback;
  return (isArabic ? item.label.ar : item.label.en) || fallback;
};

export const getRegionLabel = (value: string, isArabic: boolean): string => {
  if (!value) return "";
  return pickLabel(
    SAUDI_REGIONS.find((region) => region.value === value),
    isArabic,
    value,
  );
};

export const getCityLabel = (value: string, isArabic: boolean): string => {
  if (!value) return "";
  for (const region of SAUDI_REGIONS) {
    const city = region.cities.find((c) => c.value === value);
    if (city) return pickLabel(city, isArabic, value);
  }
  return value;
};

/**
 * Districts are free text now, so an unknown value is returned as typed — only
 * the legacy values picked from the old dropdown get translated.
 */
export const getDistrictLabel = (value: string, isArabic: boolean): string => {
  if (!value) return "";
  for (const region of SAUDI_REGIONS) {
    for (const city of region.cities) {
      const district = city.districts.find((d) => d.value === value);
      if (district) return pickLabel(district, isArabic, value);
    }
  }
  return value;
};

/** "الروضة، الرياض" — skips empty parts. */
export const formatLocation = (
  parts: { city?: string; area?: string },
  isArabic: boolean,
): string =>
  [getDistrictLabel(parts.area || "", isArabic), getCityLabel(parts.city || "", isArabic)]
    .filter(Boolean)
    .join(isArabic ? "، " : ", ");
