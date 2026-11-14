/* ============================================================
   WINKY AI TRADING BOT — TELEGRAM MINI APP CONTROLLER (Vanilla JS)
   1-to-1 Visual Clone of Chrome Extension HUD
   Strictly 2 Bottom Tabs: Signals & AI Chat
   Zero Popups · Zero speechSynthesis · Full Inline Experience
   ============================================================ */

"use strict";

// Synchronize Telegram WebApp viewport & theme colors immediately
if (window.Telegram?.WebApp) {
  try {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    window.Telegram.WebApp.setHeaderColor("#0d1915");
    window.Telegram.WebApp.setBackgroundColor("#09120f");
  } catch (_) {}
}

const CURRENCY_FLAGS = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺", CAD: "🇨🇦",
  CHF: "🇨🇭", NZD: "🇳🇿", CNY: "🇨🇳", CNH: "🇨🇳", AED: "🇦🇪", MAD: "🇲🇦",
  BHD: "🇧🇭", INR: "🇮🇳", BRL: "🇧🇷", MXN: "🇲🇽", ZAR: "🇿🇦", TRY: "🇹🇷",
  KES: "🇰🇪", SGD: "🇸🇬", NOK: "🇳🇴", SEK: "🇸🇪", DKK: "🇩🇰", PLN: "🇵🇱",
  CZK: "🇨🇿", HUF: "🇭🇺", ILS: "🇮🇱", SAR: "🇸🇦", QAR: "🇶🇦", KWD: "🇰🇼",
  OMR: "🇴🇲", EGP: "🇪🇬", IDR: "🇮🇩", PHP: "🇵🇭", THB: "🇹🇭", VND: "🇻🇳",
  PKR: "🇵🇰", ARS: "🇦🇷", COP: "🇨🇴", CLP: "🇨🇱", PEN: "🇵🇪", NGN: "🇳🇬",
  GHS: "🇬🇭", JOD: "🇯🇴", LBP: "🇱🇧", TND: "🇹🇳", UAH: "🇺🇦", BDT: "🇧🇩",
  DZD: "🇩🇿", MYR: "🇲🇾", RUB: "🇷🇺", YER: "🇾🇪",
  BTC: "₿", ETH: "Ξ", SOL: "◎", LTC: "Ł", XRP: "✕",
  GOLD: "🥇", SILVER: "🥈", OIL: "🛢️", BRENT: "🛢️",
  APPLE: "🍏", TESLA: "⚡", MICROSOFT: "🪟", AMAZON: "📦", GOOGLE: "🔍",
  META: "👤"
};

function getPairFlags(pairName) {
  if (!pairName) return "🌐";
  const clean = String(pairName).replace(/\s*OTC\b/i, "").trim();
  if (clean.includes("/")) {
    const parts = clean.split("/");
    const f1 = CURRENCY_FLAGS[parts[0].toUpperCase()] || "🌐";
    const f2 = CURRENCY_FLAGS[parts[1].toUpperCase()] || "🌐";
    return f1 + f2;
  }
  return CURRENCY_FLAGS[clean.toUpperCase()] || "🌐";
}

const ASSET_CATALOG = {
  otc: [
    { id: "AED/CNY OTC", name: "AED/CNY OTC", flags: "🇦🇪🇨🇳", payout: "92%" },
    { id: "AUD/CAD OTC", name: "AUD/CAD OTC", flags: "🇦🇺🇨🇦", payout: "90%" },
    { id: "AUD/CHF OTC", name: "AUD/CHF OTC", flags: "🇦🇺🇨🇭", payout: "91%" },
    { id: "AUD/JPY OTC", name: "AUD/JPY OTC", flags: "🇦🇺🇯🇵", payout: "90%" },
    { id: "AUD/NZD OTC", name: "AUD/NZD OTC", flags: "🇦🇺🇳🇿", payout: "90%" },
    { id: "AUD/USD OTC", name: "AUD/USD OTC", flags: "🇦🇺🇺🇸", payout: "91%" },
    { id: "BHD/CNY OTC", name: "BHD/CNY OTC", flags: "🇧🇭🇨🇳", payout: "92%" },
    { id: "CAD/CHF OTC", name: "CAD/CHF OTC", flags: "🇨🇦🇨🇭", payout: "90%" },
    { id: "CAD/JPY OTC", name: "CAD/JPY OTC", flags: "🇨🇦🇯🇵", payout: "90%" },
    { id: "CHF/JPY OTC", name: "CHF/JPY OTC", flags: "🇨🇭🇯🇵", payout: "90%" },
    { id: "CHF/NOK OTC", name: "CHF/NOK OTC", flags: "🇨🇭🇳🇴", payout: "90%" },
    { id: "EUR/CAD OTC", name: "EUR/CAD OTC", flags: "🇪🇺🇨🇦", payout: "90%" },
    { id: "EUR/CHF OTC", name: "EUR/CHF OTC", flags: "🇪🇺🇨🇭", payout: "90%" },
    { id: "EUR/GBP OTC", name: "EUR/GBP OTC", flags: "🇪🇺🇬🇧", payout: "91%" },
    { id: "EUR/HUF OTC", name: "EUR/HUF OTC", flags: "🇪🇺🇭🇺", payout: "90%" },
    { id: "EUR/JPY OTC", name: "EUR/JPY OTC", flags: "🇪🇺🇯🇵", payout: "91%" },
    { id: "EUR/NZD OTC", name: "EUR/NZD OTC", flags: "🇪🇺🇳🇿", payout: "90%" },
    { id: "EUR/RUB OTC", name: "EUR/RUB OTC", flags: "🇪🇺🇷🇺", payout: "90%" },
    { id: "EUR/TRY OTC", name: "EUR/TRY OTC", flags: "🇪🇺🇹🇷", payout: "90%" },
    { id: "EUR/USD OTC", name: "EUR/USD OTC", flags: "🇪🇺🇺🇸", payout: "92%" },
    { id: "GBP/AUD OTC", name: "GBP/AUD OTC", flags: "🇬🇧🇦🇺", payout: "90%" },
    { id: "GBP/CAD OTC", name: "GBP/CAD OTC", flags: "🇬🇧🇨🇦", payout: "90%" },
    { id: "GBP/CHF OTC", name: "GBP/CHF OTC", flags: "🇬🇧🇨🇭", payout: "90%" },
    { id: "GBP/JPY OTC", name: "GBP/JPY OTC", flags: "🇬🇧🇯🇵", payout: "91%" },
    { id: "GBP/USD OTC", name: "GBP/USD OTC", flags: "🇬🇧🇺🇸", payout: "92%" },
    { id: "JOD/CNY OTC", name: "JOD/CNY OTC", flags: "🇯🇴🇨🇳", payout: "92%" },
    { id: "KES/USD OTC", name: "KES/USD OTC", flags: "🇰🇪🇺🇸", payout: "90%" },
    { id: "LBP/USD OTC", name: "LBP/USD OTC", flags: "🇱🇧🇺🇸", payout: "92%" },
    { id: "MAD/USD OTC", name: "MAD/USD OTC", flags: "🇲🇦🇺🇸", payout: "92%" },
    { id: "NGN/USD OTC", name: "NGN/USD OTC", flags: "🇳🇬🇺🇸", payout: "90%" },
    { id: "NZD/JPY OTC", name: "NZD/JPY OTC", flags: "🇳🇿🇯🇵", payout: "90%" },
    { id: "NZD/USD OTC", name: "NZD/USD OTC", flags: "🇳🇿🇺🇸", payout: "88%" },
    { id: "OMR/CNY OTC", name: "OMR/CNY OTC", flags: "🇴🇲🇨🇳", payout: "92%" },
    { id: "QAR/CNY OTC", name: "QAR/CNY OTC", flags: "🇶🇦🇨🇳", payout: "92%" },
    { id: "SAR/CNY OTC", name: "SAR/CNY OTC", flags: "🇸🇦🇨🇳", payout: "92%" },
    { id: "TND/USD OTC", name: "TND/USD OTC", flags: "🇹🇳🇺🇸", payout: "92%" },
    { id: "UAH/USD OTC", name: "UAH/USD OTC", flags: "🇺🇦🇺🇸", payout: "90%" },
    { id: "USD/ARS OTC", name: "USD/ARS OTC", flags: "🇺🇸🇦🇷", payout: "90%" },
    { id: "USD/BDT OTC", name: "USD/BDT OTC", flags: "🇺🇸🇧🇩", payout: "90%" },
    { id: "USD/BRL OTC", name: "USD/BRL OTC", flags: "🇺🇸🇧🇷", payout: "90%" },
    { id: "USD/CAD OTC", name: "USD/CAD OTC", flags: "🇺🇸🇨🇦", payout: "92%" },
    { id: "USD/CHF OTC", name: "USD/CHF OTC", flags: "🇺🇸🇨🇭", payout: "90%" },
    { id: "USD/CLP OTC", name: "USD/CLP OTC", flags: "🇺🇸🇨🇱", payout: "90%" },
    { id: "USD/CNH OTC", name: "USD/CNH OTC", flags: "🇺🇸🇨🇳", payout: "92%" },
    { id: "USD/COP OTC", name: "USD/COP OTC", flags: "🇺🇸🇨🇴", payout: "90%" },
    { id: "USD/DZD OTC", name: "USD/DZD OTC", flags: "🇺🇸🇩🇿", payout: "90%" },
    { id: "USD/EGP OTC", name: "USD/EGP OTC", flags: "🇺🇸🇪🇬", payout: "90%" },
    { id: "USD/IDR OTC", name: "USD/IDR OTC", flags: "🇺🇸🇮🇩", payout: "90%" },
    { id: "USD/INR OTC", name: "USD/INR OTC", flags: "🇺🇸🇮🇳", payout: "90%" },
    { id: "USD/JPY OTC", name: "USD/JPY OTC", flags: "🇺🇸🇯🇵", payout: "90%" },
    { id: "USD/MXN OTC", name: "USD/MXN OTC", flags: "🇺🇸🇲🇽", payout: "90%" },
    { id: "USD/MYR OTC", name: "USD/MYR OTC", flags: "🇺🇸🇲🇾", payout: "90%" },
    { id: "USD/PHP OTC", name: "USD/PHP OTC", flags: "🇺🇸🇵🇭", payout: "90%" },
    { id: "USD/PKR OTC", name: "USD/PKR OTC", flags: "🇺🇸🇵🇰", payout: "90%" },
    { id: "USD/RUB OTC", name: "USD/RUB OTC", flags: "🇺🇸🇷🇺", payout: "90%" },
    { id: "USD/SGD OTC", name: "USD/SGD OTC", flags: "🇺🇸🇸🇬", payout: "90%" },
    { id: "USD/THB OTC", name: "USD/THB OTC", flags: "🇺🇸🇹🇭", payout: "90%" },
    { id: "USD/VND OTC", name: "USD/VND OTC", flags: "🇺🇸🇻🇳", payout: "90%" },
    { id: "YER/USD OTC", name: "YER/USD OTC", flags: "🇾🇪🇺🇸", payout: "92%" },
    { id: "Apple OTC", name: "Apple OTC", flags: "🍏", payout: "90%" },
    { id: "Tesla OTC", name: "Tesla OTC", flags: "⚡", payout: "90%" },
    { id: "BTC/USD OTC", name: "Bitcoin OTC", flags: "₿🇺🇸", payout: "86%" },
    { id: "ETH/USD OTC", name: "Ethereum OTC", flags: "Ξ🇺🇸", payout: "85%" },
    { id: "GOLD OTC", name: "Gold OTC", flags: "🥇", payout: "90%" },
  ],
  regular: [
    { id: "AUD/CAD", name: "AUD/CAD", flags: "🇦🇺🇨🇦", payout: "82%" },
    { id: "AUD/CHF", name: "AUD/CHF", flags: "🇦🇺🇨🇭", payout: "80%" },
    { id: "AUD/JPY", name: "AUD/JPY", flags: "🇦🇺🇯🇵", payout: "82%" },
    { id: "AUD/NZD", name: "AUD/NZD", flags: "🇦🇺🇳🇿", payout: "80%" },
    { id: "AUD/USD", name: "AUD/USD", flags: "🇦🇺🇺🇸", payout: "80%" },
    { id: "CAD/CHF", name: "CAD/CHF", flags: "🇨🇦🇨🇭", payout: "80%" },
    { id: "CAD/JPY", name: "CAD/JPY", flags: "🇨🇦🇯🇵", payout: "80%" },
    { id: "CHF/JPY", name: "CHF/JPY", flags: "🇨🇭🇯🇵", payout: "82%" },
    { id: "EUR/AUD", name: "EUR/AUD", flags: "🇪🇺🇦🇺", payout: "82%" },
    { id: "EUR/CAD", name: "EUR/CAD", flags: "🇪🇺🇨🇦", payout: "82%" },
    { id: "EUR/CHF", name: "EUR/CHF", flags: "🇪🇺🇨🇭", payout: "80%" },
    { id: "EUR/GBP", name: "EUR/GBP", flags: "🇪🇺🇬🇧", payout: "82%" },
    { id: "EUR/JPY", name: "EUR/JPY", flags: "🇪🇺🇯🇵", payout: "84%" },
    { id: "EUR/NZD", name: "EUR/NZD", flags: "🇪🇺🇳🇿", payout: "80%" },
    { id: "EUR/USD", name: "EUR/USD", flags: "🇪🇺🇺🇸", payout: "85%" },
    { id: "GBP/AUD", name: "GBP/AUD", flags: "🇬🇧🇦🇺", payout: "80%" },
    { id: "GBP/CAD", name: "GBP/CAD", flags: "🇬🇧🇨🇦", payout: "80%" },
    { id: "GBP/CHF", name: "GBP/CHF", flags: "🇬🇧🇨🇭", payout: "80%" },
    { id: "GBP/JPY", name: "GBP/JPY", flags: "🇬🇧🇯🇵", payout: "85%" },
    { id: "GBP/USD", name: "GBP/USD", flags: "🇬🇧🇺🇸", payout: "84%" },
    { id: "NZD/JPY", name: "NZD/JPY", flags: "🇳🇿🇯🇵", payout: "80%" },
    { id: "NZD/USD", name: "NZD/USD", flags: "🇳🇿🇺🇸", payout: "80%" },
    { id: "USD/CAD", name: "USD/CAD", flags: "🇺🇸🇨🇦", payout: "82%" },
    { id: "USD/CHF", name: "USD/CHF", flags: "🇺🇸🇨🇭", payout: "80%" },
    { id: "USD/JPY", name: "USD/JPY", flags: "🇺🇸🇯🇵", payout: "85%" },
  ]
};

const TIMEFRAMES = ["5s", "15s", "30s", "1m"];

const urlParams = new URLSearchParams(window.location.search);
const queryTgId = urlParams.get("tg_id") ? parseInt(urlParams.get("tg_id"), 10) : null;
const queryLang = urlParams.get("lang") === "ru" || urlParams.get("lang") === "en" ? urlParams.get("lang") : null;

const DEMO_MODELS = ['Claude Fable 5.2', 'Claude Opus 5.5', 'Grok 4.7', 'GPT-6 Astra', 'GPT-6.1 Sol'];
let visualModel = DEMO_MODELS[0];

const CLAUDE_SVG = `<svg class="winky-model-brand-svg winky-brand-claude" width="248" height="248" viewBox="0 0 248 248" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z" fill="#D97757"/>
</svg>`;

const GROK_SVG = `<svg class="winky-model-brand-svg winky-brand-grok" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0.36 0.5 33.33 32"><path d="M13.2371 21.0407L24.3186 12.8506C24.8619 12.4491 25.6384 12.6057 25.8973 13.2294C27.2597 16.5185 26.651 20.4712 23.9403 23.1851C21.2297 25.8989 17.4581 26.4941 14.0108 25.1386L10.2449 26.8843C15.6463 30.5806 22.2053 29.6665 26.304 25.5601C29.5551 22.3051 30.562 17.8683 29.6205 13.8673L29.629 13.8758C28.2637 7.99809 29.9647 5.64871 33.449 0.844576C33.5314 0.730667 33.6139 0.616757 33.6964 0.5L29.1113 5.09055V5.07631L13.2343 21.0436" fill="#fff" id="mark"/><path d="M10.9503 23.0313C7.07343 19.3235 7.74185 13.5853 11.0498 10.2763C13.4959 7.82722 17.5036 6.82767 21.0021 8.2971L24.7595 6.55998C24.0826 6.07017 23.215 5.54334 22.2195 5.17313C17.7198 3.31926 12.3326 4.24192 8.67479 7.90126C5.15635 11.4239 4.0499 16.8403 5.94992 21.4622C7.36924 24.9165 5.04257 27.3598 2.69884 29.826C1.86829 30.7002 1.0349 31.5745 0.36364 32.5L10.9474 23.0341" fill="#fff" id="mark"/></svg>`;

const CHATGPT_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="winky-model-brand-svg winky-brand-chatgpt"><text x="-9999" y="-9999">ChatGPT</text><path d="M9.20509 8.76511V6.50545C9.20509 6.31513 9.27649 6.17234 9.44293 6.0773L13.9861 3.46088C14.6046 3.10413 15.342 2.93769 16.103 2.93769C18.9573 2.93769 20.7651 5.14983 20.7651 7.50454C20.7651 7.67098 20.7651 7.86129 20.7412 8.05161L16.0316 5.2924C15.7462 5.12596 15.4607 5.12596 15.1753 5.2924L9.20509 8.76511ZM19.8135 17.5659V12.1664C19.8135 11.8333 19.6708 11.5955 19.3854 11.429L13.4152 7.95633L15.3656 6.83833C15.5321 6.74328 15.6749 6.74328 15.8413 6.83833L20.3845 9.45474C21.6928 10.216 22.5728 11.8333 22.5728 13.4031C22.5728 15.2108 21.5025 16.8758 19.8135 17.5657V17.5659ZM7.80173 12.8088L5.8513 11.6671C5.68486 11.5721 5.61346 11.4293 5.61346 11.239V6.00613C5.61346 3.46111 7.56389 1.53433 10.2042 1.53433C11.2033 1.53433 12.1307 1.86743 12.9159 2.46202L8.2301 5.17371C7.94475 5.34015 7.80195 5.57798 7.80195 5.91109V12.809L7.80173 12.8088ZM12 15.2349L9.20509 13.6651V10.3351L12 8.76534L14.7947 10.3351V13.6651L12 15.2349ZM13.7958 22.4659C12.7967 22.4659 11.8693 22.1328 11.0841 21.5382L15.7699 18.8265C16.0553 18.6601 16.198 18.4222 16.198 18.0891V11.1912L18.1723 12.3329C18.3388 12.4279 18.4102 12.5707 18.4102 12.761V17.9939C18.4102 20.5389 16.4359 22.4657 13.7958 22.4657V22.4659ZM8.15848 17.1617L3.61528 14.5452C2.30696 13.784 1.42701 12.1667 1.42701 10.5969C1.42701 8.76534 2.52115 7.12414 4.20987 6.43428V11.8574C4.20987 12.1905 4.35266 12.4284 4.63802 12.5948L10.5846 16.0436L8.63415 17.1617C8.46771 17.2567 8.32492 17.2567 8.15848 17.1617ZM7.897 21.0625C5.20919 21.0625 3.23488 19.0407 3.23488 16.5432C3.23488 16.3529 3.25875 16.1626 3.2824 15.9723L7.96817 18.6839C8.25352 18.8504 8.53911 18.8504 8.82446 18.6839L14.7947 15.2351V17.4948C14.7947 17.6851 14.7233 17.8279 14.5568 17.9229L10.0136 20.5393C9.39518 20.8961 8.6578 21.0625 7.89677 21.0625H7.897ZM13.7958 23.8929C16.6739 23.8929 19.0762 21.8474 19.6235 19.1357C22.2874 18.4459 24 15.9484 24 13.4034C24 11.7383 23.2865 10.121 22.002 8.95542C22.121 8.45588 22.1924 7.95633 22.1924 7.45702C22.1924 4.0557 19.4331 1.51045 16.2458 1.51045C15.6037 1.51045 14.9852 1.60549 14.3668 1.81968C13.2963 0.773071 11.8215 0.107086 10.2042 0.107086C7.32606 0.107086 4.92383 2.15256 4.37653 4.86425C1.7126 5.55411 0 8.05161 0 10.5966C0 12.2617 0.713506 13.879 1.99795 15.0446C1.87904 15.5441 1.80764 16.0436 1.80764 16.543C1.80764 19.9443 4.56685 22.4895 7.75421 22.4895C8.39632 22.4895 9.01478 22.3945 9.63324 22.1803C10.7035 23.2269 12.1783 23.8929 13.7958 23.8929Z" fill="white"></path></svg>`;

const MODEL_CHECK_SVG = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;filter:drop-shadow(0 0 5px rgba(16,245,135,0.7));"><path d="M3.5 8.3L6.6 11.4L12.8 4.8" stroke="#10F587" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function getModelBrandLogoSVG(modelName) {
  const m = String(modelName || '').toLowerCase();
  if (m.includes('claude')) return CLAUDE_SVG;
  if (m.includes('grok')) return GROK_SVG;
  if (m.includes('gpt') || m.includes('chatgpt')) return CHATGPT_SVG;
  return CLAUDE_SVG;
}

const state = {
  lang: queryLang || localStorage.getItem("winky_lang") || "ru",
  marketType: "otc",
  pair: "EUR/USD OTC",
  flags: "🇪🇺🇺🇸",
  payout: "92%",
  duration: "30s",
  model: DEMO_MODELS[0],
  isBusy: false,
  forceDir: null, // Secret Streamer trigger: 'BUY' (logo) | 'SELL' (badge/pair)
  initData: window.Telegram?.WebApp?.initData || "",
  tgId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || (queryTgId ? parseInt(queryTgId, 10) : null),
  countdownInterval: null,
  lastSignal: null,
};

const i18n = {
  ru: {
    pairLbl: "Валютная пара",
    timeLbl: "Время сделки",
    time: "Экспирация",
    accuracy: "Точность",
    readyForSignal: "Готов к анализу графика",
    analysing: "Анализ графических паттернов...",
    getSignal: "⚡ Анализировать",
    analyzingBtn: "⚡ АНАЛИЗ ГРАФИКА...",
    tradeActive: "СДЕЛКА АКТИВНА",
    tradeCompleted: "СДЕЛКА ЗАВЕРШЕНА · СИГНАЛ ОТРАБОТАН",
    tabSignals: "Сигналы",
    tabChat: "ИИ-чат",
    chatSubtitle: "Ваш ассистент по анализу",
    chatWelcome: "Привет! Я Winky AI. Выберите валютную пару и время экспирации или нажмите кнопку анализа.",
    strategyNote: "Совпадение условий стратегии, а не вероятность прибыли.",
    searchPlaceholder: "Поиск пары...",
    depositTitle: "Демо-сигналы исчерпаны",
    depositDesc: "Вы использовали 3 бесплатных сигнала. Пополните счёт Pocket Option, чтобы получить безлимитный доступ к сигналам, OTC-алгоритмам и всем ИИ-моделям.",
    promoBonus: "+50% к депозиту от $50",
    registerNow: "1. БЫСТРАЯ РЕГИСТРАЦИЯ (30 сек)",
    depositNow: "2. ПОПОЛНИТЬ СЧЁТ (+50% БОНУС)",
    close: "Закрыть",
    copied: "Скопировано!",
    authError: "Откройте приложение заново из Telegram-бота.",
    signalError: "Не удалось получить сигнал. Проверьте связь и повторите запрос.",
    expired: "Время сигнала истекло.",
  },
  en: {
    pairLbl: "Currency pair",
    timeLbl: "Expiry time",
    time: "Expiry",
    accuracy: "Accuracy",
    readyForSignal: "Ready for chart analysis",
    analysing: "Analyzing chart patterns...",
    getSignal: "⚡ Analyze",
    analyzingBtn: "⚡ ANALYZING CHART...",
    tradeActive: "TRADE ACTIVE",
    tradeCompleted: "TRADE COMPLETED · SIGNAL EXECUTED",
    tabSignals: "Signals",
    tabChat: "AI chat",
    chatSubtitle: "Your analysis assistant",
    chatWelcome: "Hello! I am Winky AI. Select a currency pair and duration or tap analyze.",
    strategyNote: "Strategy conditions matched, not the probability of profit.",
    searchPlaceholder: "Search pair...",
    depositTitle: "Demo Signals Exhausted",
    depositDesc: "You have used all 3 free demo signals. Deposit on Pocket Option to unlock unlimited signals, OTC algorithms, and all AI models.",
    promoBonus: "+50% Deposit Bonus from $50",
    registerNow: "1. FAST REGISTRATION (30s)",
    depositNow: "2. DEPOSIT (+50% BONUS)",
    close: "Close",
    copied: "Copied!",
    authError: "Reopen the app from the Telegram bot.",
    signalError: "Unable to get a signal. Check your connection and try again.",
    expired: "Signal expired.",
  }
};

function t(k) {
  const dict = i18n[state.lang] || i18n.ru;
  return dict[k] || k;
}

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const k = node.getAttribute("data-i18n");
    node.textContent = t(k);
  });
  document.querySelectorAll(".winky-lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.lang);
  });
  const titleEl = document.getElementById("winkyModelMenuTitle");
  if (titleEl) {
    titleEl.textContent = state.lang === "ru" ? "Выбор модели" : "Select model";
  }
  const searchInput = document.getElementById("pairSearchInput");
  if (searchInput) {
    searchInput.placeholder = t("searchPlaceholder");
  }
  updateCardUI();
}

/* ==================== 0. AI Model Selector ==================== */

function renderModelOptions() {
  const container = document.getElementById("winkyModelOptions");
  if (!container) return;
  container.innerHTML = DEMO_MODELS.map(name => `
    <button type="button" class="winky-model-option ${name === visualModel ? 'selected' : ''}" data-model="${name}">
      <span class="winky-model-opt-main">
        <span class="winky-model-opt-logo">${getModelBrandLogoSVG(name)}</span>
        <span class="winky-model-opt-name">${name}</span>
      </span>
      <span class="winky-model-opt-check">${name === visualModel ? MODEL_CHECK_SVG : ''}</span>
    </button>
  `).join("");

  container.querySelectorAll(".winky-model-option").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const chosen = btn.getAttribute("data-model");
      if (chosen) {
        visualModel = chosen;
        state.model = chosen;
        const logoEl = document.getElementById("winkyModelLogo");
        const labelEl = document.getElementById("winkyModelLabel");
        if (logoEl) logoEl.innerHTML = getModelBrandLogoSVG(visualModel);
        if (labelEl) labelEl.textContent = visualModel;
        renderModelOptions();
        const menu = document.getElementById("winkyModelMenu");
        if (menu) menu.hidden = true;
        const trigger = document.getElementById("winkyModelButton");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function setupModelSelector() {
  const trigger = document.getElementById("winkyModelButton");
  const menu = document.getElementById("winkyModelMenu");
  const logoEl = document.getElementById("winkyModelLogo");
  const labelEl = document.getElementById("winkyModelLabel");
  const titleEl = document.getElementById("winkyModelMenuTitle");

  if (logoEl) logoEl.innerHTML = getModelBrandLogoSVG(visualModel);
  if (labelEl) labelEl.textContent = visualModel;
  if (titleEl) titleEl.textContent = state.lang === "ru" ? "Выбор модели" : "Select model";

  renderModelOptions();

  if (trigger && menu) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = menu.hidden;
      menu.hidden = !isHidden;
      trigger.setAttribute("aria-expanded", isHidden ? "true" : "false");
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target)) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }
}

/* ==================== 1. Tab Switching (Strictly 2 Tabs) ==================== */

function switchTab(tabId) {
  document.querySelectorAll(".tab-view").forEach((tab) => {
    tab.classList.remove("active");
    tab.classList.add("hidden");
    tab.setAttribute("hidden", "");
  });

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.remove("hidden");
    target.removeAttribute("hidden");
    target.classList.add("active");
  }

  document.querySelectorAll(".bottom-nav .nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==================== 2. Custom Styled Dropdowns (Pair & Duration) ==================== */

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function renderPairDropdownList(searchQuery = "") {
  const listEl = document.getElementById("pairDropdownList");
  if (!listEl) return;

  const pairs = ASSET_CATALOG[state.marketType] || ASSET_CATALOG.otc;
  const q = String(searchQuery || "").trim().toLowerCase();
  const filtered = q ? pairs.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) : pairs;

  if (filtered.length === 0) {
    listEl.innerHTML = `<div style="padding: 12px; text-align: center; color: #7f9991; font-size: 11px;">${state.lang === 'ru' ? 'Пары не найдены' : 'No pairs found'}</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(item => `
    <button type="button" class="winky-pair-option ${item.id === state.pair ? 'selected' : ''}" data-pair-id="${escapeHtml(item.id)}">
      <span class="winky-opt-left">
        <span class="winky-opt-flag">${item.flags}</span>
        <span class="winky-opt-name">${escapeHtml(item.name)}</span>
      </span>
      <span class="winky-opt-payout">+${escapeHtml(item.payout)}</span>
    </button>
  `).join("");

  listEl.querySelectorAll(".winky-pair-option").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pairId = btn.getAttribute("data-pair-id");
      if (pairId) {
        selectPair(pairId);
        closePairDropdown();
      }
    });
  });
}

function selectPair(pairId) {
  const all = [...ASSET_CATALOG.otc, ...ASSET_CATALOG.regular];
  const found = all.find(p => p.id.toLowerCase() === pairId.toLowerCase()) || { id: pairId, name: pairId, flags: getPairFlags(pairId), payout: "90%" };
  state.pair = found.id;
  state.flags = found.flags;
  state.payout = found.payout;
  updateCardUI();
}

function openPairDropdown() {
  const menu = document.getElementById("pairDropdownMenu");
  const trigger = document.getElementById("pairDropdownBtn");
  const searchInput = document.getElementById("pairSearchInput");
  if (!menu || !trigger) return;

  closeDurationDropdown();
  const modelMenu = document.getElementById("winkyModelMenu");
  if (modelMenu) modelMenu.hidden = true;

  menu.hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  if (searchInput) {
    searchInput.value = "";
    searchInput.focus();
  }
  renderPairDropdownList("");
}

function closePairDropdown() {
  const menu = document.getElementById("pairDropdownMenu");
  const trigger = document.getElementById("pairDropdownBtn");
  if (menu) menu.hidden = true;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function setupCustomPairDropdown() {
  const trigger = document.getElementById("pairDropdownBtn");
  const menu = document.getElementById("pairDropdownMenu");
  const searchInput = document.getElementById("pairSearchInput");

  if (trigger && menu) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menu.hidden) {
        openPairDropdown();
      } else {
        closePairDropdown();
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        renderPairDropdownList(e.target.value);
      });
      searchInput.addEventListener("click", (e) => e.stopPropagation());
    }

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target)) {
        closePairDropdown();
      }
    });
  }
}

function renderDurationDropdownList() {
  const listEl = document.getElementById("durationDropdownList");
  if (!listEl) return;

  listEl.innerHTML = TIMEFRAMES.map(tf => `
    <button type="button" class="winky-duration-option ${tf === state.duration ? 'selected' : ''}" data-duration="${tf}">
      <span>${tf}</span>
    </button>
  `).join("");

  listEl.querySelectorAll(".winky-duration-option").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dur = btn.getAttribute("data-duration");
      if (dur) {
        state.duration = dur;
        updateCardUI();
        closeDurationDropdown();
      }
    });
  });
}

function openDurationDropdown() {
  const menu = document.getElementById("durationDropdownMenu");
  const trigger = document.getElementById("durationDropdownBtn");
  if (!menu || !trigger) return;

  closePairDropdown();
  menu.hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  renderDurationDropdownList();
}

function closeDurationDropdown() {
  const menu = document.getElementById("durationDropdownMenu");
  const trigger = document.getElementById("durationDropdownBtn");
  if (menu) menu.hidden = true;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function setupCustomDurationDropdown() {
  const trigger = document.getElementById("durationDropdownBtn");
  const menu = document.getElementById("durationDropdownMenu");

  if (trigger && menu) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menu.hidden) {
        openDurationDropdown();
      } else {
        closeDurationDropdown();
      }
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target)) {
        closeDurationDropdown();
      }
    });
  }
}

function setupAccuracyInfoButton() {
  const btn = document.getElementById("winkyAccuracyButton");
  const note = document.getElementById("winkyAccuracyNote");
  if (btn && note) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = note.hidden;
      note.hidden = !isHidden;
      btn.setAttribute("aria-expanded", isHidden ? "true" : "false");
    });
  }
}

function updateCardUI() {
  const flagsEl = document.getElementById("cardFlags");
  const nameEl = document.getElementById("cardPairName");
  const payoutEl = document.getElementById("cardPayout");
  const metricTimeEl = document.getElementById("metricTime");
  const pillChatPair = document.getElementById("pillChatPair");
  const pillChatDuration = document.getElementById("pillChatDuration");

  const selFlag = document.getElementById("selectedPairFlag");
  const selName = document.getElementById("selectedPairName");
  const selPayout = document.getElementById("selectedPairPayout");
  const selDur = document.getElementById("selectedDurationVal");

  if (flagsEl) flagsEl.textContent = state.flags;
  if (nameEl) nameEl.textContent = state.pair;
  if (payoutEl) payoutEl.textContent = `+${state.payout}`;
  if (metricTimeEl) metricTimeEl.textContent = state.duration;

  if (selFlag) selFlag.textContent = state.flags;
  if (selName) selName.textContent = state.pair;
  if (selPayout) selPayout.textContent = `+${state.payout}`;
  if (selDur) selDur.textContent = state.duration;

  if (pillChatPair) pillChatPair.textContent = state.pair;
  if (pillChatDuration) pillChatDuration.textContent = state.duration;
}

/* ==================== 3. Signal Generation Flow ==================== */

function parseDurationSeconds(dur) {
  const num = parseInt(dur, 10) || 30;
  if (dur.includes("m")) return num * 60;
  return num;
}

function formatCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function telegramHeaders() {
  return { "Content-Type": "application/json", "X-Telegram-Init-Data": state.initData || "" };
}

function updateReferralLinks(data) {
  for (const [id, key] of [["btnRegisterLink", "register_url"], ["btnDepositLink", "deposit_url"]]) {
    const el = document.getElementById(id);
    if (el && typeof data[key] === "string" && data[key].startsWith("https://")) el.href = data[key];
  }
}

function syncPanelControlVisibility(phase) {
  const mkt = document.getElementById("winkyMarketSwitch");
  const sel = document.getElementById("winkySelectorsGrid");
  if (!mkt || !sel) return;

  if (phase === "analysing") {
    mkt.hidden = false;
    sel.hidden = false;
    mkt.classList.add("locked");
    sel.classList.add("locked");
    mkt.style.pointerEvents = "none";
    sel.style.pointerEvents = "none";
    mkt.style.opacity = "0.85";
    sel.style.opacity = "0.85";
  } else if (phase === "trade") {
    mkt.hidden = false;
    sel.hidden = false;
    mkt.classList.add("locked");
    sel.classList.add("locked");
    mkt.style.pointerEvents = "none";
    sel.style.pointerEvents = "none";
    mkt.style.opacity = "1";
    sel.style.opacity = "1";
  } else {
    mkt.hidden = false;
    sel.hidden = false;
    mkt.classList.remove("locked");
    sel.classList.remove("locked");
    mkt.style.pointerEvents = "";
    sel.style.pointerEvents = "";
    mkt.style.opacity = "1";
    sel.style.opacity = "1";
  }
}

function getTradeSetupExplanation(sig, isRu = true) {
  const family = sig?.family || "";
  const isBuy = sig?.direction === "BUY";

  if (family === "TREND_PULLBACK") {
    return isRu
      ? (isBuy ? "Откат к EMA завершён · вход по тренду вверх" : "Откат к EMA завершён · вход по тренду вниз")
      : (isBuy ? "EMA pullback completed · trend entry up" : "EMA pullback completed · trend entry down");
  }
  if (family === "BREAKOUT_RETEST") {
    return isRu
      ? (isBuy ? "Пробой уровня и ретест · импульс вверх" : "Пробой уровня и ретест · импульс вниз")
      : (isBuy ? "Level breakout & retest · momentum up" : "Level breakout & retest · momentum down");
  }
  if (family === "RANGE_REJECTION") {
    return isRu
      ? (isBuy ? "Отскок от нижней границы канала вверх" : "Отскок от верхней границы канала вниз")
      : (isBuy ? "Bounce from channel low upward" : "Bounce from channel high downward");
  }
  if (family === "LOCAL_REVERSAL") {
    return isRu
      ? (isBuy ? "Разворот от уровня поддержки · импульс вверх" : "Разворот от уровня сопротивления · импульс вниз")
      : (isBuy ? "Reversal from support level · impulse up" : "Reversal from resistance level · impulse down");
  }
  return isRu
    ? (isBuy ? "Подтверждённый импульс по тренду вверх" : "Подтверждённый импульс по тренду вниз")
    : (isBuy ? "Confirmed trend momentum up" : "Confirmed trend momentum down");
}

function generateClientRealisticCandles(pair = "AUD/CAD OTC", duration = "30s", direction = null) {
  const p = (pair || "").toUpperCase();
  let basePrice = 1.08450;
  let step = 0.00015;
  let decimals = 5;

  if (p.includes("JPY")) {
    basePrice = 154.30;
    step = 0.06;
    decimals = 3;
  } else if (p.includes("BTC")) {
    basePrice = 91450.0;
    step = 35.0;
    decimals = 2;
  } else if (p.includes("ETH")) {
    basePrice = 3120.0;
    step = 3.0;
    decimals = 2;
  } else if (p.includes("XAU") || p.includes("GOLD")) {
    basePrice = 2685.0;
    step = 1.5;
    decimals = 2;
  } else if (p.includes("SILVER") || p.includes("XAG")) {
    basePrice = 31.40;
    step = 0.04;
    decimals = 3;
  } else if (["RUB", "INR", "THB", "BRL"].some(c => p.includes(c))) {
    basePrice = 96.50;
    step = 0.04;
    decimals = 3;
  }

  const isBuy = direction ? (direction === "BUY") : (p.length % 2 === 0);

  const moves = isBuy
    ? [
        0.6, 1.2, -0.4, 0.8, 1.5, -0.5, 1.1, 0.9, -0.3, 1.4, -0.2,
        -0.8, -1.2, 0.3, -1.0, -0.7, 0.2, -0.9, 0.1,
        1.2, 1.6, -0.4, 1.8, 1.4, -0.3, 1.9,
        2.1, 1.8
      ]
    : [
        -0.6, -1.2, 0.4, -0.8, -1.5, 0.5, -1.1, -0.9, 0.3, -1.4, 0.2,
        0.8, 1.2, -0.3, 1.0, 0.7, -0.2, 0.9, -0.1,
        -1.2, -1.6, 0.4, -1.8, -1.4, 0.3, -1.9,
        -2.1, -1.8
      ];

  let currentPrice = basePrice - (moves.reduce((a, b) => a + b, 0) * step * 0.45);
  const candles = [];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const cOpen = currentPrice;
    const delta = m * step;
    const cClose = cOpen + delta;

    const bodyTop = Math.max(cOpen, cClose);
    const bodyBottom = Math.min(cOpen, cClose);

    let upperWick = Math.abs(delta) * (0.2 + (i % 2 === 0 ? 0.3 : 0.15)) + (step * 0.2);
    let lowerWick = Math.abs(delta) * (0.2 + (i % 2 === 0 ? 0.15 : 0.3)) + (step * 0.2);

    if (i >= 26) {
      if (isBuy) {
        upperWick = step * 0.15;
        lowerWick = step * 0.4;
      } else {
        lowerWick = step * 0.15;
        upperWick = step * 0.4;
      }
    }

    const cHigh = bodyTop + upperWick;
    const cLow = bodyBottom - lowerWick;

    candles.push({
      open: Number(cOpen.toFixed(decimals)),
      high: Number(cHigh.toFixed(decimals)),
      low: Number(cLow.toFixed(decimals)),
      close: Number(cClose.toFixed(decimals)),
    });
    currentPrice = cClose;
  }

  return candles;
}

function drawRealisticCandleChart(canvas, candles) {
  if (!canvas || !candles || !candles.length) return;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 300;
  const height = rect.height || 100;
  const dpr = window.devicePixelRatio || 2;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  // Subtle 5x4 grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  const gridCols = 5;
  const gridRows = 4;
  for (let c = 1; c < gridCols; c++) {
    const gx = Math.round((width / gridCols) * c) + 0.5;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let r = 1; r < gridRows; r++) {
    const gy = Math.round((height / gridRows) * r) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  // 16% vertical padding at top and bottom to eliminate clipping
  const minLow = Math.min(...candles.map((c) => c.low));
  const maxHigh = Math.max(...candles.map((c) => c.high));
  const rawRange = maxHigh - minLow || 0.0001;

  const paddingTop = height * 0.16;
  const paddingBottom = height * 0.16;
  const usableHeight = height - paddingTop - paddingBottom;

  const paddingLeft = 8;
  const paddingRight = 10;
  const usableWidth = width - paddingLeft - paddingRight;

  const count = candles.length;
  const stepX = usableWidth / count;
  const bodyWidth = Math.max(3.5, Math.min(6, stepX * 0.65));

  function getY(price) {
    const norm = (price - minLow) / rawRange;
    return height - paddingBottom - norm * usableHeight;
  }

  candles.forEach((c, i) => {
    const x = paddingLeft + (i + 0.5) * stepX;
    const isUp = c.close >= c.open;
    const color = isUp ? "#10F587" : "#FF4D6D";

    const yHigh = getY(c.high);
    const yLow = getY(c.low);
    const yOpen = getY(c.open);
    const yClose = getY(c.close);

    const top = Math.min(yOpen, yClose);
    const bottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.max(1.5, bottom - top);

    // 1px crisp wick on half-pixel
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const wickX = Math.round(x) + 0.5;
    ctx.moveTo(wickX, Math.round(yHigh));
    ctx.lineTo(wickX, Math.round(yLow));
    ctx.stroke();

    // Body
    ctx.fillStyle = color;
    const rx = Math.round(x - bodyWidth / 2);
    const ry = Math.round(top);
    const rw = Math.round(bodyWidth);
    const rh = Math.round(bodyHeight);
    ctx.fillRect(rx, ry, rw, rh);
  });
}

function showSignalError(key) {
  state.isBusy = false;
  state.lastSignal = null;
  syncPanelControlVisibility("idle");
  const block = document.getElementById("directionBlock");
  if (block) { block.className = "winky-direction-block idle"; block.textContent = t(key); }
  const btn = document.getElementById("btnGetSignal");
  if (btn) { btn.disabled = false; btn.classList.remove("disabled"); btn.textContent = t("getSignal"); }
  const accuracy = document.getElementById("metricAccuracy");
  if (accuracy) accuracy.textContent = "—";
}

async function loadProfile() {
  try {
    if (state.initData) await fetch("/api/activity", { method: "POST", headers: telegramHeaders() });
    const response = await fetch("/api/me", { headers: telegramHeaders() });
    if (response.ok) updateReferralLinks(await response.json());
  } catch (_) {}
}

async function startSignalAnalysis() {
  if (state.isBusy) return;
  state.isBusy = true;
  state.lastSignal = null;

  if (state.countdownInterval) {
    clearInterval(state.countdownInterval);
    state.countdownInterval = null;
  }

  const dirBlock = document.getElementById("directionBlock");
  const btn = document.getElementById("btnGetSignal");
  const accEl = document.getElementById("metricAccuracy");
  if (btn) {
    btn.disabled = true;
    btn.textContent = t("analyzingBtn");
  }

  // 1. ANALYSIS STATE: Hide selectors grid & market switch, set height 241px
  syncPanelControlVisibility("analysing");

  const isRu = (state.lang === "ru");
  const stages = isRu
    ? [
        { name: "Тренд M1", icon: "↗" },
        { name: "Структура", icon: "◇" },
        { name: "Импульс", icon: "⌁" },
        { name: "Точка входа", icon: "◎" },
      ]
    : [
        { name: "M1 Trend", icon: "↗" },
        { name: "Structure", icon: "◇" },
        { name: "Momentum", icon: "⌁" },
        { name: "Entry Point", icon: "◎" },
      ];

  if (dirBlock) {
    dirBlock.className = "winky-direction-block analysing";
    dirBlock.innerHTML = `
      <div class="winky-scan-top">
        <div class="winky-scan-title">
          <span class="winky-scan-dot"></span>
          <span>${isRu ? "АНАЛИЗ ГРАФИКА" : "CHART ANALYSIS"}</span>
        </div>
        <div class="winky-scan-score-badge" id="scanScoreBadge">★ 4.9 / 5.0</div>
      </div>

      <div class="winky-chart-preview">
        <canvas id="winkyVisualChart"></canvas>
        <span class="winky-chart-scanner"></span>
      </div>

      <div class="winky-stage-frame">
        <div class="winky-stage-current confirmed" id="analysisCurrentStage">
          <span class="winky-stage-symbol" id="stageSymbol">${stages[0].icon}</span>
          <span class="winky-stage-name" id="stageName">${stages[0].name}</span>
          <span class="winky-stage-indicator" id="stageIndicator">${MODEL_CHECK_SVG}</span>
        </div>
      </div>

      <div class="winky-analysis-meta" id="analysisMeta">${isRu ? "Анализ" : "Analysis"} · S30 · M1</div>
    `;

    const chartCanvas = document.getElementById("winkyVisualChart");
    if (chartCanvas) {
      const initialCandles = generateClientRealisticCandles(state.pair, state.duration, state.forceDir);
      drawRealisticCandleChart(chartCanvas, initialCandles);
    }
  }

  const startTime = performance.now();
  let apiData = null;

  // Launch API call in background while animating stages
  const apiPromise = fetch("/api/signal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": state.initData || "",
    },
    body: JSON.stringify({
      tg_id: state.tgId,
      pair: state.pair,
      duration: state.duration,
      force_dir: state.forceDir,
      model: state.model,
      init_data: state.initData || "",
    }),
  });
  state.forceDir = null; // consume trigger

  // Animate smoothly across the 4 stages (~680ms each = ~2.7s total)
  const symEl = document.getElementById("stageSymbol");
  const nameEl = document.getElementById("stageName");
  const indEl = document.getElementById("stageIndicator");

  for (let i = 0; i < stages.length; i++) {
    if (symEl) symEl.textContent = stages[i].icon;
    if (nameEl) nameEl.textContent = stages[i].name;
    if (indEl) indEl.innerHTML = MODEL_CHECK_SVG;
    if (accEl) {
      const stepScores = [88, 92, 95, 96];
      accEl.textContent = `${stepScores[i]}%`;
    }
    await new Promise((r) => setTimeout(r, 680));
  }

  try {
    const resp = await apiPromise;

    if (resp.status === 403) {
      syncPanelControlVisibility("idle");
      if (dirBlock) {
        dirBlock.className = "winky-direction-block idle";
        dirBlock.innerHTML = `<span id="dirStateText">${t("readyForSignal")}</span>`;
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = t("getSignal");
      }
      state.isBusy = false;
      const depositBackdrop = document.getElementById("depositSheetBackdrop");
      if (depositBackdrop) depositBackdrop.hidden = false;
      return;
    }

    if (!resp.ok) {
      syncPanelControlVisibility("idle");
      showSignalError(resp.status === 401 ? "authError" : "signalError");
      return;
    }
    apiData = await resp.json();
    if (!["BUY", "SELL"].includes(apiData.direction) || !Number.isFinite(apiData.accuracy)) {
      syncPanelControlVisibility("idle");
      showSignalError("signalError");
      return;
    }
    state.lastSignal = apiData;
    updateReferralLinks(apiData);

    if (apiData.candles && apiData.candles.length) {
      const chartCanvas = document.getElementById("winkyVisualChart");
      if (chartCanvas) {
        drawRealisticCandleChart(chartCanvas, apiData.candles);
      }
    }
  } catch (_) {
    syncPanelControlVisibility("idle");
    showSignalError("signalError");
    return;
  }

  // Ensure minimum smooth transition time (~2.7s total)
  const elapsed = performance.now() - startTime;
  if (elapsed < 2700) {
    await new Promise((r) => setTimeout(r, 2700 - elapsed));
  }

  // 2. ACTIVE SIGNAL STATE
  syncPanelControlVisibility("trade");

  const dir = apiData.direction;
  const isBuy = dir === "BUY";
  const accuracy = apiData.accuracy;
  const totalSec = parseDurationSeconds(state.duration);

  if (accEl) accEl.textContent = `${accuracy}%`;

  if (dirBlock) {
    dirBlock.className = `winky-direction-block active ${isBuy ? "buy" : "sell"}`;
    dirBlock.innerHTML = `
      <div class="winky-sig-hero">
        <div class="winky-sig-dir-wrap ${isBuy ? "buy" : "sell"}">
          <span class="winky-sig-arrow">${isBuy ? "↗" : "↘"}</span>
          <span class="winky-sig-dir-text">${isBuy ? (isRu ? "КУПИТЬ · ВВЕРХ" : "BUY · CALL") : (isRu ? "ПРОДАТЬ · ВНИЗ" : "SELL · PUT")}</span>
        </div>
        <div class="winky-sig-timer-capsule">
          <span class="winky-sig-pulse-dot">●</span>
          <span class="winky-sig-timer-val" id="signalTimer">${formatCountdown(totalSec)}</span>
        </div>
      </div>

      <div class="winky-trade-setup-note winky-signal-reason">${getTradeSetupExplanation(apiData, isRu)}</div>

      <div class="winky-sig-progress-track">
        <div class="winky-sig-progress-fill ${isBuy ? "buy" : "sell"}" id="signalProgressFill" style="width: 100%;"></div>
      </div>
    `;
  }

  if (btn) {
    btn.disabled = true;
    btn.classList.add("disabled");
    btn.textContent = `${t("tradeActive")} · ${formatCountdown(totalSec)}`;
  }

  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(isBuy ? "success" : "warning");
  }

  dispatchLumeanVoice({ pair: state.pair, direction: dir, duration: state.duration, accuracy });

  // 3. COUNTDOWN TO EXPIRY
  let remaining = totalSec;
  const timerEl = document.getElementById("signalTimer");
  const progressEl = document.getElementById("signalProgressFill");

  state.countdownInterval = setInterval(() => {
    remaining -= 1;
    const safeRem = Math.max(0, remaining);
    if (timerEl) timerEl.textContent = formatCountdown(safeRem);
    if (progressEl) {
      const pct = Math.max(0, Math.min(100, (safeRem / totalSec) * 100));
      progressEl.style.width = `${pct}%`;
    }
    if (btn) {
      btn.textContent = `${t("tradeActive")} · ${formatCountdown(safeRem)}`;
    }

    if (remaining <= 0) {
      clearInterval(state.countdownInterval);
      state.countdownInterval = null;
      onSignalExpiryFinished();
    }
  }, 1000);
}

function onSignalExpiryFinished() {
  const isRu = (state.lang === "ru");
  const block = document.getElementById("directionBlock");
  const btn = document.getElementById("btnGetSignal");

  if (block) {
    block.className = "winky-direction-block completed";
    block.innerHTML = `
      <span class="winky-completion-badge">${MODEL_CHECK_SVG}</span>
      <span class="winky-completion-text">${t("tradeCompleted")}</span>
    `;
  }

  setTimeout(() => {
    syncPanelControlVisibility("idle");
    if (block) {
      block.className = "winky-direction-block idle";
      block.innerHTML = `<span id="dirStateText">${t("readyForSignal")}</span>`;
    }
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("disabled");
      btn.textContent = t("getSignal");
    }
    const accEl = document.getElementById("metricAccuracy");
    if (accEl) accEl.textContent = "—";
    state.isBusy = false;
  }, 2500);
}

async function dispatchLumeanVoice(payload) {
  try {
    await fetch("/api/winky/speak_signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        lang: state.lang,
      }),
    });
  } catch (_) {
    // Non-critical if running in pure web mode
  }
}

/* ==================== 4. AI Chat Tab Controller ==================== */

function setupAiChat() {
  const chatFeed = document.getElementById("chatFeed");
  const btnSend = document.getElementById("btnChatSend");
  const pillPair = document.getElementById("pillChatPair");
  const pillDuration = document.getElementById("pillChatDuration");

  async function sendChatQuery() {
    if (!chatFeed || state.isBusy) return;
    if (!state.lastSignal || state.lastSignal.pair !== state.pair || state.lastSignal.duration !== state.duration) {
      await startSignalAnalysis();
    }
    const bubble = document.createElement("div");
    bubble.className = "winky-chat-bubble ai";
    const data = state.lastSignal;
    if (!data) {
      bubble.textContent = t("signalError");
    } else {
      const lines = state.lang === "ru" ? data.rationale_ru : data.rationale_en;
      bubble.textContent = [data.pair, data.duration, data.direction, ...(lines || [])].join(" · ");
    }
    chatFeed.appendChild(bubble);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  if (btnSend) btnSend.addEventListener("click", sendChatQuery);
  if (pillPair) pillPair.addEventListener("click", sendChatQuery);
  if (pillDuration) pillDuration.addEventListener("click", sendChatQuery);
}

/* ==================== 5. Streamer Secret Triggers ==================== */

function setupSecretTriggers() {
  const brand = document.getElementById("brand");
  const cardPair = document.getElementById("cardPairClickable");

  // Tap Logo -> Force BUY
  if (brand) {
    brand.addEventListener("click", () => {
      state.forceDir = "BUY";
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
      }
    });
  }

  // Tap Pair Name or clickable row -> Force SELL
  if (cardPair) {
    cardPair.addEventListener("click", () => {
      state.forceDir = "SELL";
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
      }
    });
  }
}

/* ==================== 6. App Initialization ==================== */

document.addEventListener("DOMContentLoaded", () => {
  // Telegram WebApp setup
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    try {
      window.Telegram.WebApp.setHeaderColor("#0d1915");
      window.Telegram.WebApp.setBackgroundColor("#09120f");
    } catch (_) {}
  }

  // Setup UI components
  applyLanguage();
  setupModelSelector();
  setupCustomPairDropdown();
  setupCustomDurationDropdown();
  setupAccuracyInfoButton();
  loadProfile();
  switchTab("tabSignals");

  // Tab switching
  document.querySelectorAll(".bottom-nav .nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      if (tabId) switchTab(tabId);
    });
  });

  // Market Switch
  const mktReg = document.getElementById("mktRegularBtn");
  const mktOtc = document.getElementById("mktOtcBtn");

  if (mktReg) {
    mktReg.addEventListener("click", () => {
      state.marketType = "regular";
      mktReg.classList.add("active");
      if (mktOtc) mktOtc.classList.remove("active");
      const defaultPair = ASSET_CATALOG.regular[0].id;
      selectPair(defaultPair);
      renderPairDropdownList("");
    });
  }

  if (mktOtc) {
    mktOtc.addEventListener("click", () => {
      state.marketType = "otc";
      mktOtc.classList.add("active");
      if (mktReg) mktReg.classList.remove("active");
      const defaultPair = ASSET_CATALOG.otc[0].id;
      selectPair(defaultPair);
      renderPairDropdownList("");
    });
  }

  // Initial pair selection and list render
  selectPair(state.pair);
  renderPairDropdownList("");
  renderDurationDropdownList();

  // Language Switch
  document.querySelectorAll(".winky-lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.lang = btn.getAttribute("data-lang") || "ru";
      localStorage.setItem("winky_lang", state.lang);
      applyLanguage();
    });
  });

  // Action Button
  const btnGetSignal = document.getElementById("btnGetSignal");
  if (btnGetSignal) {
    btnGetSignal.addEventListener("click", startSignalAnalysis);
  }

  // Deposit Sheet actions
  const btnCloseDeposit = document.getElementById("btnCloseDeposit");
  const depositBackdrop = document.getElementById("depositSheetBackdrop");
  if (btnCloseDeposit && depositBackdrop) {
    btnCloseDeposit.addEventListener("click", () => {
      depositBackdrop.hidden = true;
    });
  }

  const btnCopyPromo = document.getElementById("btnCopyPromo");
  if (btnCopyPromo) {
    btnCopyPromo.addEventListener("click", () => {
      navigator.clipboard?.writeText("50START").then(() => {
        btnCopyPromo.textContent = t("copied");
        setTimeout(() => {
          btnCopyPromo.textContent = state.lang === "ru" ? "Копировать" : "Copy";
        }, 2000);
      });
    });
  }

  // AI Chat setup
  setupAiChat();

  // Secret Streamer Triggers
  setupSecretTriggers();

  // Poll synced signal from live streamer extension
  let lastSyncedSignalKey = "";
  async function pollSyncedStreamSignal() {
    try {
      const res = await fetch("/api/signal/sync", { headers: telegramHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.active && data.signal && data.remaining_sec > 0) {
        const sig = data.signal;
        const key = `${sig.pair}_${sig.direction}_${Math.floor(sig.created_at)}`;
        if (key !== lastSyncedSignalKey) {
          lastSyncedSignalKey = key;
          if (!state.isBusy) {
            selectPair(sig.pair);
          }
        }
      }
    } catch (_) {}
  }
  setInterval(pollSyncedStreamSignal, 3500);
});
