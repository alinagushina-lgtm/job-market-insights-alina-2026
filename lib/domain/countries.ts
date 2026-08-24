type CountryRow = readonly [code: string, name: string, englishName: string, currency: string]

const COUNTRY_ROWS = [
  ["AF", "Афганистан", "Afghanistan", "AFN"],
  ["AL", "Албания", "Albania", "ALL"],
  ["DZ", "Алжир", "Algeria", "DZD"],
  ["AD", "Андорра", "Andorra", "EUR"],
  ["AO", "Ангола", "Angola", "AOA"],
  ["AG", "Антигуа и Барбуда", "Antigua and Barbuda", "XCD"],
  ["AR", "Аргентина", "Argentina", "ARS"],
  ["AM", "Армения", "Armenia", "AMD"],
  ["AU", "Австралия", "Australia", "AUD"],
  ["AT", "Австрия", "Austria", "EUR"],
  ["AZ", "Азербайджан", "Azerbaijan", "AZN"],
  ["BS", "Багамы", "Bahamas", "BSD"],
  ["BH", "Бахрейн", "Bahrain", "BHD"],
  ["BD", "Бангладеш", "Bangladesh", "BDT"],
  ["BB", "Барбадос", "Barbados", "BBD"],
  ["BY", "Беларусь", "Belarus", "BYN"],
  ["BE", "Бельгия", "Belgium", "EUR"],
  ["BZ", "Белиз", "Belize", "BZD"],
  ["BJ", "Бенин", "Benin", "XOF"],
  ["BT", "Бутан", "Bhutan", "BTN"],
  ["BO", "Боливия", "Bolivia", "BOB"],
  ["BA", "Босния и Герцеговина", "Bosnia and Herzegovina", "BAM"],
  ["BW", "Ботсвана", "Botswana", "BWP"],
  ["BR", "Бразилия", "Brazil", "BRL"],
  ["BN", "Бруней", "Brunei", "BND"],
  ["BG", "Болгария", "Bulgaria", "EUR"],
  ["BF", "Буркина-Фасо", "Burkina Faso", "XOF"],
  ["BI", "Бурунди", "Burundi", "BIF"],
  ["CV", "Кабо-Верде", "Cape Verde", "CVE"],
  ["KH", "Камбоджа", "Cambodia", "KHR"],
  ["CM", "Камерун", "Cameroon", "XAF"],
  ["CA", "Канада", "Canada", "CAD"],
  ["CF", "Центральноафриканская Республика", "Central African Republic", "XAF"],
  ["TD", "Чад", "Chad", "XAF"],
  ["CL", "Чили", "Chile", "CLP"],
  ["CN", "Китай", "China", "CNY"],
  ["CO", "Колумбия", "Colombia", "COP"],
  ["KM", "Коморы", "Comoros", "KMF"],
  ["CG", "Республика Конго", "Republic of the Congo", "XAF"],
  ["CD", "Демократическая Республика Конго", "Democratic Republic of the Congo", "CDF"],
  ["CR", "Коста-Рика", "Costa Rica", "CRC"],
  ["CI", "Кот-д’Ивуар", "Ivory Coast", "XOF"],
  ["HR", "Хорватия", "Croatia", "EUR"],
  ["CU", "Куба", "Cuba", "CUP"],
  ["CY", "Кипр", "Cyprus", "EUR"],
  ["CZ", "Чехия", "Czechia", "CZK"],
  ["DK", "Дания", "Denmark", "DKK"],
  ["DJ", "Джибути", "Djibouti", "DJF"],
  ["DM", "Доминика", "Dominica", "XCD"],
  ["DO", "Доминиканская Республика", "Dominican Republic", "DOP"],
  ["EC", "Эквадор", "Ecuador", "USD"],
  ["EG", "Египет", "Egypt", "EGP"],
  ["SV", "Сальвадор", "El Salvador", "USD"],
  ["GQ", "Экваториальная Гвинея", "Equatorial Guinea", "XAF"],
  ["ER", "Эритрея", "Eritrea", "ERN"],
  ["EE", "Эстония", "Estonia", "EUR"],
  ["SZ", "Эсватини", "Eswatini", "SZL"],
  ["ET", "Эфиопия", "Ethiopia", "ETB"],
  ["FJ", "Фиджи", "Fiji", "FJD"],
  ["FI", "Финляндия", "Finland", "EUR"],
  ["FR", "Франция", "France", "EUR"],
  ["GA", "Габон", "Gabon", "XAF"],
  ["GM", "Гамбия", "Gambia", "GMD"],
  ["GE", "Грузия", "Georgia", "GEL"],
  ["DE", "Германия", "Germany", "EUR"],
  ["GH", "Гана", "Ghana", "GHS"],
  ["GR", "Греция", "Greece", "EUR"],
  ["GD", "Гренада", "Grenada", "XCD"],
  ["GT", "Гватемала", "Guatemala", "GTQ"],
  ["GN", "Гвинея", "Guinea", "GNF"],
  ["GW", "Гвинея-Бисау", "Guinea-Bissau", "XOF"],
  ["GY", "Гайана", "Guyana", "GYD"],
  ["HT", "Гаити", "Haiti", "HTG"],
  ["HN", "Гондурас", "Honduras", "HNL"],
  ["HU", "Венгрия", "Hungary", "HUF"],
  ["IS", "Исландия", "Iceland", "ISK"],
  ["IN", "Индия", "India", "INR"],
  ["ID", "Индонезия", "Indonesia", "IDR"],
  ["IR", "Иран", "Iran", "IRR"],
  ["IQ", "Ирак", "Iraq", "IQD"],
  ["IE", "Ирландия", "Ireland", "EUR"],
  ["IL", "Израиль", "Israel", "ILS"],
  ["IT", "Италия", "Italy", "EUR"],
  ["JM", "Ямайка", "Jamaica", "JMD"],
  ["JP", "Япония", "Japan", "JPY"],
  ["JO", "Иордания", "Jordan", "JOD"],
  ["KZ", "Казахстан", "Kazakhstan", "KZT"],
  ["KE", "Кения", "Kenya", "KES"],
  ["KI", "Кирибати", "Kiribati", "AUD"],
  ["KP", "КНДР", "North Korea", "KPW"],
  ["KR", "Южная Корея", "South Korea", "KRW"],
  ["XK", "Косово", "Kosovo", "EUR"],
  ["KW", "Кувейт", "Kuwait", "KWD"],
  ["KG", "Кыргызстан", "Kyrgyzstan", "KGS"],
  ["LA", "Лаос", "Laos", "LAK"],
  ["LV", "Латвия", "Latvia", "EUR"],
  ["LB", "Ливан", "Lebanon", "LBP"],
  ["LS", "Лесото", "Lesotho", "LSL"],
  ["LR", "Либерия", "Liberia", "LRD"],
  ["LY", "Ливия", "Libya", "LYD"],
  ["LI", "Лихтенштейн", "Liechtenstein", "CHF"],
  ["LT", "Литва", "Lithuania", "EUR"],
  ["LU", "Люксембург", "Luxembourg", "EUR"],
  ["MG", "Мадагаскар", "Madagascar", "MGA"],
  ["MW", "Малави", "Malawi", "MWK"],
  ["MY", "Малайзия", "Malaysia", "MYR"],
  ["MV", "Мальдивы", "Maldives", "MVR"],
  ["ML", "Мали", "Mali", "XOF"],
  ["MT", "Мальта", "Malta", "EUR"],
  ["MH", "Маршалловы Острова", "Marshall Islands", "USD"],
  ["MR", "Мавритания", "Mauritania", "MRU"],
  ["MU", "Маврикий", "Mauritius", "MUR"],
  ["MX", "Мексика", "Mexico", "MXN"],
  ["FM", "Микронезия", "Micronesia", "USD"],
  ["MD", "Молдова", "Moldova", "MDL"],
  ["MC", "Монако", "Monaco", "EUR"],
  ["MN", "Монголия", "Mongolia", "MNT"],
  ["ME", "Черногория", "Montenegro", "EUR"],
  ["MA", "Марокко", "Morocco", "MAD"],
  ["MZ", "Мозамбик", "Mozambique", "MZN"],
  ["MM", "Мьянма", "Myanmar", "MMK"],
  ["NA", "Намибия", "Namibia", "NAD"],
  ["NR", "Науру", "Nauru", "AUD"],
  ["NP", "Непал", "Nepal", "NPR"],
  ["NL", "Нидерланды", "Netherlands", "EUR"],
  ["NZ", "Новая Зеландия", "New Zealand", "NZD"],
  ["NI", "Никарагуа", "Nicaragua", "NIO"],
  ["NE", "Нигер", "Niger", "XOF"],
  ["NG", "Нигерия", "Nigeria", "NGN"],
  ["MK", "Северная Македония", "North Macedonia", "MKD"],
  ["NO", "Норвегия", "Norway", "NOK"],
  ["OM", "Оман", "Oman", "OMR"],
  ["PK", "Пакистан", "Pakistan", "PKR"],
  ["PW", "Палау", "Palau", "USD"],
  ["PS", "Палестина", "Palestine", "ILS"],
  ["PA", "Панама", "Panama", "PAB"],
  ["PG", "Папуа — Новая Гвинея", "Papua New Guinea", "PGK"],
  ["PY", "Парагвай", "Paraguay", "PYG"],
  ["PE", "Перу", "Peru", "PEN"],
  ["PH", "Филиппины", "Philippines", "PHP"],
  ["PL", "Польша", "Poland", "PLN"],
  ["PT", "Португалия", "Portugal", "EUR"],
  ["QA", "Катар", "Qatar", "QAR"],
  ["RO", "Румыния", "Romania", "RON"],
  ["RU", "Россия", "Russia", "RUB"],
  ["RW", "Руанда", "Rwanda", "RWF"],
  ["KN", "Сент-Китс и Невис", "Saint Kitts and Nevis", "XCD"],
  ["LC", "Сент-Люсия", "Saint Lucia", "XCD"],
  ["VC", "Сент-Винсент и Гренадины", "Saint Vincent and the Grenadines", "XCD"],
  ["WS", "Самоа", "Samoa", "WST"],
  ["SM", "Сан-Марино", "San Marino", "EUR"],
  ["ST", "Сан-Томе и Принсипи", "Sao Tome and Principe", "STN"],
  ["SA", "Саудовская Аравия", "Saudi Arabia", "SAR"],
  ["SN", "Сенегал", "Senegal", "XOF"],
  ["RS", "Сербия", "Serbia", "RSD"],
  ["SC", "Сейшелы", "Seychelles", "SCR"],
  ["SL", "Сьерра-Леоне", "Sierra Leone", "SLE"],
  ["SG", "Сингапур", "Singapore", "SGD"],
  ["SK", "Словакия", "Slovakia", "EUR"],
  ["SI", "Словения", "Slovenia", "EUR"],
  ["SB", "Соломоновы Острова", "Solomon Islands", "SBD"],
  ["SO", "Сомали", "Somalia", "SOS"],
  ["ZA", "Южно-Африканская Республика", "South Africa", "ZAR"],
  ["SS", "Южный Судан", "South Sudan", "SSP"],
  ["ES", "Испания", "Spain", "EUR"],
  ["LK", "Шри-Ланка", "Sri Lanka", "LKR"],
  ["SD", "Судан", "Sudan", "SDG"],
  ["SR", "Суринам", "Suriname", "SRD"],
  ["SE", "Швеция", "Sweden", "SEK"],
  ["CH", "Швейцария", "Switzerland", "CHF"],
  ["SY", "Сирия", "Syria", "SYP"],
  ["TW", "Тайвань", "Taiwan", "TWD"],
  ["TJ", "Таджикистан", "Tajikistan", "TJS"],
  ["TZ", "Танзания", "Tanzania", "TZS"],
  ["TH", "Таиланд", "Thailand", "THB"],
  ["TL", "Тимор-Лесте", "Timor-Leste", "USD"],
  ["TG", "Того", "Togo", "XOF"],
  ["TO", "Тонга", "Tonga", "TOP"],
  ["TT", "Тринидад и Тобаго", "Trinidad and Tobago", "TTD"],
  ["TN", "Тунис", "Tunisia", "TND"],
  ["TR", "Турция", "Turkey", "TRY"],
  ["TM", "Туркменистан", "Turkmenistan", "TMT"],
  ["TV", "Тувалу", "Tuvalu", "AUD"],
  ["UG", "Уганда", "Uganda", "UGX"],
  ["UA", "Украина", "Ukraine", "UAH"],
  ["AE", "Объединённые Арабские Эмираты", "United Arab Emirates", "AED"],
  ["GB", "Великобритания", "United Kingdom", "GBP"],
  ["US", "США", "United States", "USD"],
  ["UY", "Уругвай", "Uruguay", "UYU"],
  ["UZ", "Узбекистан", "Uzbekistan", "UZS"],
  ["VU", "Вануату", "Vanuatu", "VUV"],
  ["VA", "Ватикан", "Vatican City", "EUR"],
  ["VE", "Венесуэла", "Venezuela", "VES"],
  ["VN", "Вьетнам", "Vietnam", "VND"],
  ["YE", "Йемен", "Yemen", "YER"],
  ["ZM", "Замбия", "Zambia", "ZMW"],
  ["ZW", "Зимбабве", "Zimbabwe", "ZWG"],
] as const satisfies readonly CountryRow[]

export type CountryCode = "WORLD" | (typeof COUNTRY_ROWS)[number][0]

export type Country = {
  code: CountryCode
  name: string
  englishName: string
  currency: string
}

const WORLD: Country = { code: "WORLD", name: "Весь мир", englishName: "Worldwide", currency: "USD" }
const POPULAR_CODES: readonly CountryCode[] = ["RU", "US", "GB", "DE", "FR", "ES", "AE", "CA", "NL", "KZ"]
const POPULAR_CODE_SET = new Set<CountryCode>(POPULAR_CODES)
const COUNTRIES_BY_CODE = new Map<CountryCode, Country>()

for (const [code, name, englishName, currency] of COUNTRY_ROWS) {
  COUNTRIES_BY_CODE.set(code, { code, name, englishName, currency })
}
COUNTRIES_BY_CODE.set("WORLD", WORLD)

const popular = POPULAR_CODES.map((code) => COUNTRIES_BY_CODE.get(code)).filter((country): country is Country => Boolean(country))
const remaining = Array.from(COUNTRIES_BY_CODE.values())
  .filter((country) => country.code !== "WORLD" && !POPULAR_CODE_SET.has(country.code))
  .sort((left, right) => left.name.localeCompare(right.name, "ru"))

export const COUNTRIES: readonly Country[] = [WORLD, ...popular, ...remaining]
export const SALARY_CURRENCIES = Array.from(new Set(COUNTRIES.map((country) => country.currency))).sort()
export const COUNTRY_CODES = new Set<CountryCode>(COUNTRIES.map((country) => country.code))

const COUNTRY_BY_NAME = new Map<string, Country>()
for (const country of COUNTRIES) {
  COUNTRY_BY_NAME.set(country.name.toLocaleLowerCase("ru"), country)
  COUNTRY_BY_NAME.set(country.englishName.toLocaleLowerCase("en"), country)
  COUNTRY_BY_NAME.set(country.code.toLowerCase(), country)
}

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && COUNTRY_CODES.has(value as CountryCode)
}

export function countryByCode(code: CountryCode) {
  return COUNTRIES_BY_CODE.get(code) ?? WORLD
}

export function countryByInput(value: string) {
  return COUNTRY_BY_NAME.get(value.trim().toLocaleLowerCase("ru"))
}
