// Normalize every known speech source into one isolated, typed performance event.
const ALIASES={greeting:'wave',greet:'wave',win:'joy',cheer:'joy',dance:'hip_groove',
  think:'ponder',thinking:'ponder',blush:'shy',kiss:'flirt_kiss',paws:'neko_paws',groove:'hip_groove',peek:'peek_closer'};
const CATEGORIES={start_stream:'START_STREAM_READY',stream_ready:'START_STREAM_READY',analyzing:'ANALYZING_CHART',
  win:'TRADE_WIN',loss_step1:'TRADE_LOSS',loss_step2:'TRADE_LOSS',start_analysis:'ANALYZING_CHART',
  flat_skip:'WEAK_SIGNAL_SWITCH_PAIR',switch_pair:'PAIR_SWITCHED_NEW_SCAN',prepare_entry:'PREPARE_ENTRY',
  in_trade:'IN_TRADE_WAITING',trade_win:'TRADE_WIN',trade_loss:'TRADE_LOSS',trade_refund:'TRADE_REFUND',
  trade_win_recovery:'TRADE_WIN',sniper_wait:'IN_TRADE_WAITING',
  pause:'PAUSE_BETWEEN_TRADES',ask_chat:'NARRATE_ENGAGE',stream_insight:'STREAM_INSIGHT'};
const QUICK={greeting:'greeting',how_to_use:'bot',howto:'bot',cta_bio:'bot',balance_info:'bot',
  about_stream:'strategy',ask_in_chat:'engage',ask_chat_pair:'pair_request',smart_pace:'gambler',skeptics_reply:'skeptic',thanks_likes:'thanks'};
const KEYWORDS={kw_hello:'greeting',kw_howto:'bot',kw_link:'bot',kw_access:'bot',kw_analytics:'strategy',kw_scam:'skeptic',kw_bot:'bot'};
export const LEGACY_ACTIONS=['hip_groove','neko_paws','peek_closer'];
export function canonicalAction(value){
  const name=String(value||'').toLowerCase();
  return ['buy','sell','call','put'].includes(name)?'':ALIASES[name]||name;
}
export function inferIntent(comment=''){
  const text=String(comment).toLowerCase();
  if(/отыгр|ва.?банк|гарант|all.?in|recover.*loss|guarantee/.test(text))return 'gambler';
  if(/бот|ссылк|шапк|био|\bbot\b|\bbio\b|\blink\b|\baccess\b|доступ/.test(text))return 'bot';
  if(/красот|мил[а-я]*|краш|люблю|cute|pretty|beautiful|marry|love you/.test(text))return 'compliment';
  if(/скам|развод|обман|scam|fake|не верю/.test(text))return 'skeptic';
  if(/привет|салют|здаров|\b(?:hi|hey|hello)\b/.test(text))return 'greeting';
  if(/стратег|анализ|сценар|strategy|setup|analysis/.test(text))return 'strategy';
  if(/подглядыва|хитришь|шалишь|teasing|sneaky|cheeky/.test(text))return 'playful_doubt';
  if(/ха.?ха|смешно|шутк|\b(?:haha|lol|joke)\b/.test(text))return 'joke';
  if(/\?|почему|зачем|как думаешь|what|why|how/.test(text))return 'question';
  return 'general';
}
function promisedAction(text){
  if(/(?:не|don't|not|no).{0,18}(?:танц|dance|целу|kiss|лапк|paws|сердеч|heart)/iu.test(text))return '';
  if(/танцую|потанцу|лови.{0,15}танец|dancing|enjoy my dance/iu.test(text))return 'hip_groove';
  if(/поцелуй|целую|чмок|sending.{0,10}kiss|blow.{0,10}kiss/iu.test(text))return 'flirt_kiss';
  if(/лови.{0,12}лапк|neko paws|paws for you/iu.test(text))return 'neko_paws';
  if(/лови.{0,12}сердечко|sending.{0,12}heart|heart for you/iu.test(text))return 'hand_heart';
  return '';
}
export function normalizeEvent(input={}){
  const event={...input,conditions:{...(input.conditions||{})}};
  event.text=String(input.reply_text||input.text||'');
  const tag=/^\[([a-z_]+)\]\s*/i.exec(event.text);
  event.emotion=String(tag?.[1]||input.emotion||'happy').toLowerCase();
  event.emotion=({think:'thinking',kiss:'flirt_kiss',paws:'neko_paws',groove:'hip_groove',peek:'peek_closer',
    heart:'hand_heart',doubt:'playful_doubt',laugh:'quiet_laugh',greeting:'wave'})[event.emotion]||event.emotion;
  event.text=event.text.replace(/^\[[a-z_]+\]\s*/i,'');
  const originalCategory=String(input.category||(input.quick_id?'quick_'+input.quick_id:'')||input.event_type||
    (input.source==='trade_event'?input.event:'')||(input.source==='signal_announcement'?'SIGNAL_ANNOUNCEMENT':''));
  const quick=String(input.route||originalCategory).toLowerCase().replace(/^quick_/,'');
  event.category=CATEGORIES[originalCategory.toLowerCase()]||originalCategory.toUpperCase();
  if(/^trade_loss/i.test(originalCategory))event.category='TRADE_LOSS';
  if(['quick_trade_win','quick_green_streak'].includes(originalCategory.toLowerCase()))event.category='TRADE_WIN';
  if(/^quick_trade_loss/.test(originalCategory.toLowerCase()))event.category='TRADE_LOSS';
  const source=String(input.route||input.source||'').toLowerCase();
  event.chat_kind=input.chat_kind||event.conditions.chat_kind||({chat_join:'join',chat_follow:'follow',chat_gift:'gift',chat_like:'like'}[originalCategory.toLowerCase()])||'';
  if(!event.chat_kind)for(const [match,kind]of [['join','join'],['greeting','join'],['follow','follow'],['gift','gift'],['like','like']]){
    if(source.includes(match)&&!source.startsWith('bank_')){event.chat_kind=kind;break;}
  }
  const rawIntent=String(input.intent||'');
  event.intent=rawIntent&&rawIntent!=='general'?rawIntent:QUICK[quick]||KEYWORDS[input.keyword_id||originalCategory.toLowerCase()]||inferIntent(input.comment||input.user_text||'');
  if(event.chat_kind==='bot')event.intent='bot';
  if(event.chat_kind==='question')event.intent='question';
  const actionTags=['win','cheer','dance','flirt_kiss','kiss','neko_paws','paws','hip_groove','groove','peek_closer','peek','wave'];
  event.action=canonicalAction(input.action||(actionTags.includes(event.emotion)?event.emotion:''));
  event.promised_action=promisedAction(event.text);
  event.tag=tag?.[1]||'';
  return event;
}
