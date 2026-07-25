/* ==================================================================
   模擬資料
   地名是真的，班次與座標是編的。欄位刻意取得跟 TDX 一樣，
   之後若要接真實資料，只要換掉這一支檔案就好。
   ================================================================== */
window.DATA = (function () {

  /* 站牌：座標大致對應新竹市實際位置，用來算「附近站牌」
     en / enRoad：介面切換英文時使用的站名／路名（示範用音譯，非官方譯名） */
  const STOPS = {
    '新竹火車站':     { lat: 24.8018, lon: 120.9718, road: '中華路二段 · 站前廣場', en: 'Hsinchu Station', enRoad: 'Zhonghua Rd. Sec. 2 · Station Plaza' },
    '東門城':         { lat: 24.8043, lon: 120.9686, road: '中正路 · 東門圓環', en: 'East Gate', enRoad: 'Zhongzheng Rd. · East Gate Roundabout' },
    '中央路口':       { lat: 24.8055, lon: 120.9670, road: '中央路 · 近中央市場', en: 'Zhongyang Rd. Junction', enRoad: 'Zhongyang Rd. · near Central Market' },
    '西大路口':       { lat: 24.8036, lon: 120.9650, road: '西大路 · 近文化街', en: 'Xida Rd. Junction', enRoad: 'Xida Rd. · near Wenhua St.' },
    '北大教堂':       { lat: 24.8060, lon: 120.9662, road: '中正路 · 北大路口', en: 'Beida Cathedral', enRoad: 'Zhongzheng Rd. · Beida Junction' },
    '水源里':         { lat: 24.8090, lon: 120.9700, road: '水源街 · 近國實中', en: 'Shuiyuan Village', enRoad: 'Shuiyuan St. · near NARL' },
    '舊港橋':         { lat: 24.8300, lon: 120.9450, road: '東大路四段', en: 'Jiugang Bridge', enRoad: 'Dongda Rd. Sec. 4' },
    '南寮漁港':       { lat: 24.8480, lon: 120.9280, road: '海濱路 · 遊客中心前', en: 'Nanliao Fishing Port', enRoad: 'Haibin Rd. · Visitor Center' },
    '新竹漁港':       { lat: 24.8500, lon: 120.9200, road: '海濱路 · 漁市場', en: 'Hsinchu Fishing Port', enRoad: 'Haibin Rd. · Fish Market' },
    '光復中學':       { lat: 24.7930, lon: 120.9880, road: '光復路二段 · 校門口', en: 'Guangfu Jr. High', enRoad: 'Guangfu Rd. Sec. 2 · School Gate' },
    '建功一路':       { lat: 24.7920, lon: 120.9940, road: '光復路二段 · 建功路口', en: 'Jiangong 1st Rd.', enRoad: 'Guangfu Rd. Sec. 2 · Jiangong Junction' },
    '清華大學':       { lat: 24.7955, lon: 120.9965, road: '光復路二段 · 校門口', en: 'Tsing Hua University', enRoad: 'Guangfu Rd. Sec. 2 · School Gate' },
    '工研院':         { lat: 24.7830, lon: 121.0050, road: '光復路二段 · 中興院區', en: 'ITRI', enRoad: 'Guangfu Rd. Sec. 2 · Zhongxing Campus' },
    '金山街口':       { lat: 24.7810, lon: 121.0110, road: '光復路一段', en: 'Jinshan St. Junction', enRoad: 'Guangfu Rd. Sec. 1' },
    '新竹科學園區':   { lat: 24.7770, lon: 121.0150, road: '園區二路 · 管理局前', en: 'Hsinchu Science Park', enRoad: 'Yuanqu 2nd Rd. · Admin Bureau' },
    '竹科實中':       { lat: 24.7800, lon: 121.0090, road: '介壽路', en: 'HSP Experimental School', enRoad: 'Jieshou Rd.' },
    '新莊車站':       { lat: 24.7860, lon: 121.0230, road: '新莊街', en: 'Xinzhuang Station', enRoad: 'Xinzhuang St.' },
    '古奇峰':         { lat: 24.7930, lon: 120.9600, road: '高峰路 · 近青草湖', en: 'Guqifeng', enRoad: 'Gaofeng Rd. · near Qingcao Lake' },
    '三民國中':       { lat: 24.7975, lon: 120.9660, road: '三民路 · 近民生路口', en: 'Sanmin Jr. High', enRoad: 'Sanmin Rd. · near Minsheng Junction' },
    '成德高中':       { lat: 24.8080, lon: 120.9760, road: '東大路一段 · 校門口', en: 'Chengde Senior High', enRoad: 'Dongda Rd. Sec. 1 · School Gate' },

    /* -------- 新竹市香山區 -------- */
    '內湖':           { lat: 24.7855, lon: 120.9505, road: '中華路五段 · 內湖庄', en: 'Neihu, Xiangshan', enRoad: 'Zhonghua Rd. Sec. 5 · Neihu' },
    '香山車站':       { lat: 24.7721, lon: 120.9421, road: '中華路五段 · 香山車站前', en: 'Xiangshan Station', enRoad: 'Zhonghua Rd. Sec. 5 · in front of Xiangshan Station' },
    '南隘':           { lat: 24.7605, lon: 120.9330, road: '海山路 · 南隘社區', en: "Nan'ai", enRoad: "Haishan Rd. · Nan'ai Community" },

    /* -------- 新竹縣竹北市 -------- */
    '竹北轉運站':     { lat: 24.8047, lon: 121.0413, road: '高鐵北路一段 · 高鐵新竹站', en: 'Zhubei Bus Terminal (THSR Hsinchu Sta.)', enRoad: 'Gaotie N. Rd. Sec. 1 · THSR Hsinchu Station' },
    '新竹縣政府':     { lat: 24.8272, lon: 121.0128, road: '光明六路 · 縣治二路口', en: 'Hsinchu County Government', enRoad: 'Guangming 6th Rd. · Xianzhi 2nd Rd. Junction' },
    '竹北文化中心':   { lat: 24.8305, lon: 121.0055, road: '文化街 · 文化中心', en: 'Zhubei Cultural Center', enRoad: 'Wenhua St. · Cultural Center' },

    /* -------- 新竹縣新豐鄉 -------- */
    '新豐車站':       { lat: 24.8865, lon: 121.0075, road: '中正路 · 新豐車站前', en: 'Xinfeng Station', enRoad: 'Zhongzheng Rd. · in front of Xinfeng Station' },
    '台元科技園區':   { lat: 24.8795, lon: 121.0045, road: '中華路 · 台元科技園區', en: 'Tai Yuan Hi-Tech Park', enRoad: 'Zhonghua Rd. · Tai Yuan Hi-Tech Park' },

    /* -------- 新竹縣湖口鄉 -------- */
    '湖口車站':       { lat: 24.8988, lon: 121.0428, road: '中山路 · 湖口車站前', en: 'Hukou Station', enRoad: 'Zhongshan Rd. · in front of Hukou Station' },
    '湖口老街':       { lat: 24.8975, lon: 121.0405, road: '湖口老街 · 三元宮', en: 'Hukou Old Street', enRoad: 'Hukou Old Street · Sanyuan Temple' },

    /* -------- 新竹縣新埔鎮 -------- */
    '新埔老街':       { lat: 24.8358, lon: 121.0742, road: '中正路 · 新埔老街', en: 'Xinpu Old Street', enRoad: 'Zhongzheng Rd. · Xinpu Old Street' },

    /* -------- 新竹縣關西鎮 -------- */
    '關西車站':       { lat: 24.7900, lon: 121.1795, road: '中山路 · 關西車站前', en: 'Guanxi Station', enRoad: 'Zhongshan Rd. · in front of Guanxi Station' },
    '關西老街':       { lat: 24.7872, lon: 121.1762, road: '正義路 · 關西老街', en: 'Guanxi Old Street', enRoad: 'Zhengyi Rd. · Guanxi Old Street' },

    /* -------- 新竹縣芎林鄉 -------- */
    '芎林市區':       { lat: 24.7692, lon: 121.1022, road: '文林路 · 芎林街上', en: 'Qionglin Town', enRoad: 'Wenlin Rd. · Qionglin town center' },

    /* -------- 新竹縣寶山鄉 -------- */
    '寶山水庫':       { lat: 24.7668, lon: 121.0082, road: '雙園街 · 寶山水庫風景區', en: 'Baoshan Reservoir', enRoad: 'Shuangyuan St. · Baoshan Reservoir Scenic Area' },

    /* -------- 新竹縣竹東鎮 -------- */
    '竹東轉運站':     { lat: 24.7375, lon: 121.0928, road: '東寧路一段 · 竹東轉運站', en: 'Zhudong Bus Terminal', enRoad: 'Dongning Rd. Sec. 1 · Zhudong Bus Terminal' },
    '竹東車站':       { lat: 24.7368, lon: 121.0902, road: '中興路一段 · 竹東車站前', en: 'Zhudong Station', enRoad: 'Zhongxing Rd. Sec. 1 · in front of Zhudong Station' },

    /* -------- 新竹縣橫山鄉 -------- */
    '橫山':           { lat: 24.7225, lon: 121.1105, road: '力行路 · 橫山車站前', en: 'Hengshan', enRoad: 'Lixing Rd. · in front of Hengshan Station' },
    '內灣老街':       { lat: 24.6873, lon: 121.1522, road: '內灣街 · 內灣老街', en: 'Neiwan Old Street', enRoad: 'Neiwan St. · Neiwan Old Street' },

    /* -------- 新竹縣尖石鄉 -------- */
    '尖石':           { lat: 24.7015, lon: 121.1985, road: '嘉樂村 · 尖石市區', en: 'Jianshi', enRoad: 'Jiale Village · Jianshi town center' },

    /* -------- 新竹縣五峰鄉 -------- */
    '清泉部落':       { lat: 24.6355, lon: 121.1448, road: '桃山村 · 清泉吊橋', en: 'Qingquan Tribal Village', enRoad: 'Taoshan Village · Qingquan Suspension Bridge' },

    /* -------- 新竹縣北埔鄉 -------- */
    '北埔老街':       { lat: 24.6972, lon: 121.0578, road: '廟前街 · 北埔老街', en: 'Beipu Old Street', enRoad: 'Miaoqian St. · Beipu Old Street' },

    /* -------- 新竹縣峨眉鄉 -------- */
    '峨眉湖':         { lat: 24.6652, lon: 121.0328, road: '峨眉街 · 峨眉湖（大埔水庫）', en: 'Emei Lake', enRoad: 'Emei St. · Emei Lake (Dabu Reservoir)' },
  };

  /* 地標／景點：不是公車站，本身沒有路線經過。
     問路功能猜到這些地名時，會改去找「離這個地標最近的公車站」來規劃，
     而不是直接當作站名比對失敗。座標一樣是大致對應，不是精準測繪。 */
  const POIS = {
    '新竹巨城':       { lat: 24.8046, lon: 120.9737, en: 'Big City (SKM Park)' },
    '新竹市政府':     { lat: 24.8062, lon: 120.9686, en: 'Hsinchu City Hall' },
    '城隍廟':         { lat: 24.8046, lon: 120.9663, en: 'City God Temple' },
    '新竹公園':       { lat: 24.8073, lon: 120.9721, en: 'Hsinchu Park' },
    '新竹市立動物園': { lat: 24.8073, lon: 120.9721, en: 'Hsinchu Zoo' },
    '馬偕醫院':       { lat: 24.8125, lon: 120.9754, en: 'MacKay Memorial Hospital Hsinchu' },
    '大魯閣新時代':   { lat: 24.8058, lon: 120.9787, en: 'Global Mall Hsinchu' },
    'IKEA新竹店':     { lat: 24.7965, lon: 120.9636, en: 'IKEA Hsinchu' },
    '新竹之心':       { lat: 24.8047, lon: 120.9683, en: 'Hsinchu Heart' },
    '南寮十七公里海岸線': { lat: 24.8480, lon: 120.9280, en: 'Nanliao 17km Coastline' },
  };

  /* 路線
     stops：去程站序
     seg：  站與站之間的行駛秒數（長度 = stops.length - 1）
     head： 發車間隔（秒）
     open / close：首末班發車時刻（當日分鐘數）
     color：路線色，讓看板一眼能分辨，官方頁面全部是同一個灰
  */
  const ROUTES = [
    {
      name: '1', color: '#A3572B',
      stops: ['新竹火車站','東門城','光復中學','建功一路','清華大學','工研院','金山街口','新竹科學園區'],
      seg:   [180, 300, 150, 130, 260, 140, 170],
      head: 900, open: 6 * 60, close: 22 * 60 + 30,
    },
    {
      name: '2', color: '#5E7A3D',
      stops: ['新竹火車站','中央路口','北大教堂','西大路口','水源里','舊港橋','南寮漁港'],
      seg:   [70, 70, 160, 200, 420, 380],
      head: 1200, open: 6 * 60 + 10, close: 22 * 60,
    },
    {
      name: '81', color: '#8C4A2E',
      stops: ['古奇峰','三民國中','東門城','新竹火車站','光復中學','清華大學','工研院','新莊車站'],
      seg:   [220, 260, 180, 300, 280, 260, 300],
      head: 1500, open: 6 * 60 + 20, close: 21 * 60 + 40,
    },
    {
      name: '83', color: '#7A4A5E',
      stops: ['成德高中','水源里','東門城','新竹火車站','光復中學','建功一路','清華大學'],
      seg:   [200, 240, 190, 300, 150, 130],
      head: 1080, open: 6 * 60 + 30, close: 22 * 60 + 10,
    },
    {
      name: '藍1', enName: 'Blue 1', color: '#3D6B7A',
      stops: ['竹科實中','新竹科學園區','金山街口','工研院','清華大學','光復中學','新竹火車站'],
      seg:   [160, 170, 140, 260, 280, 300],
      head: 720, open: 6 * 60, close: 23 * 60,
    },
    {
      name: '15', color: '#A87F1E',
      stops: ['新竹火車站','北大教堂','西大路口','舊港橋','新竹漁港'],
      seg:   [140, 160, 500, 300],
      head: 2400, open: 9 * 60, close: 20 * 60,   // 首班較晚，用來示範「尚未發車」
    },

    /* ---- 以下往新竹縣延伸，涵蓋市＋縣全區域 ---- */
    {
      name: '3', color: '#2E6B57',
      stops: ['新竹火車站','三民國中','內湖','香山車站','南隘'],
      seg:   [160, 260, 220, 220],
      head: 1100, open: 6 * 60 + 15, close: 22 * 60,
    },
    {
      name: '5700', color: '#B08A3E',
      stops: ['新竹火車站','東門城','竹北轉運站','新竹縣政府','竹北文化中心'],
      seg:   [140, 620, 380, 150],
      head: 1500, open: 6 * 60, close: 22 * 60,
    },
    {
      name: '5710', color: '#6E8C4A',
      stops: ['竹北轉運站','新豐車站','台元科技園區','湖口車站','湖口老街'],
      seg:   [760, 150, 380, 120],
      head: 1800, open: 6 * 60 + 20, close: 21 * 60 + 30,
    },
    {
      name: '5701', color: '#9C6B2E',
      stops: ['竹北轉運站','新竹縣政府','新埔老街','關西車站','關西老街'],
      seg:   [380, 520, 900, 130],
      head: 2100, open: 6 * 60 + 30, close: 20 * 60 + 30,
    },
    {
      name: '5901', color: '#5C4A32',
      stops: ['新竹火車站','東門城','竹東轉運站','竹東車站','芎林市區'],
      seg:   [140, 1100, 120, 350],
      head: 1200, open: 6 * 60, close: 22 * 60,
    },
    {
      name: '5902', color: '#C97B3D',
      stops: ['竹東轉運站','橫山','內灣老街'],
      seg:   [260, 450],
      head: 1500, open: 6 * 60 + 40, close: 21 * 60,
    },
    {
      name: '5903', color: '#7A6B3D',
      stops: ['竹東轉運站','寶山水庫','北埔老街','峨眉湖'],
      seg:   [780, 740, 380],
      head: 2400, open: 6 * 60 + 50, close: 19 * 60 + 30,
    },
    {
      name: '5904', color: '#4A6B6B',
      stops: ['竹東轉運站','清泉部落'],
      seg:   [2250],
      // 山區路線，一天只有幾班，示範「班距很長」的情境
      head: 10800, open: 7 * 60, close: 18 * 60,
    },
    {
      name: '5905', color: '#5E4A6B',
      stops: ['竹東轉運站','尖石'],
      seg:   [2000],
      head: 9000, open: 7 * 60 + 10, close: 18 * 60 + 30,
    },
  ];

  /* 站牌 -> 有哪些路線經過（含方向），建索引省得每次全掃 */
  const STOP_INDEX = {};
  ROUTES.forEach((r) => {
    [0, 1].forEach((dir) => {
      const seq = dir === 0 ? r.stops : [...r.stops].reverse();
      seq.forEach((s, i) => {
        (STOP_INDEX[s] ||= []).push({ route: r.name, direction: dir, index: i });
      });
    });
  });

  const ROUTE_BY_NAME = Object.fromEntries(ROUTES.map((r) => [r.name, r]));

  /* 某條路線某個方向的站序 */
  function sequence(routeName, direction) {
    const r = ROUTE_BY_NAME[routeName];
    return direction === 0 ? r.stops : [...r.stops].reverse();
  }

  /* 站與站之間的行駛秒數，方向相反時整條反過來 */
  function segments(routeName, direction) {
    const r = ROUTE_BY_NAME[routeName];
    return direction === 0 ? r.seg : [...r.seg].reverse();
  }

  /* 該方向的終點站名，用來顯示「往 ○○」 */
  function headsign(routeName, direction) {
    const seq = sequence(routeName, direction);
    return seq[seq.length - 1];
  }

  /* 站名 / 路名 / 路線名的顯示用字，依目前語言取英文或中文 */
  function stopLabel(stopName, lang) {
    const s = STOPS[stopName];
    if (lang === 'en' && s?.en) return s.en;
    return stopName;
  }
  function roadLabel(stopName, lang) {
    const s = STOPS[stopName];
    if (!s) return '';
    return lang === 'en' ? (s.enRoad || s.road) : s.road;
  }
  function routeLabel(routeName, lang) {
    const r = ROUTE_BY_NAME[routeName];
    if (lang === 'en' && r?.enName) return r.enName;
    return routeName;
  }
  function poiLabel(poiName, lang) {
    const p = POIS[poiName];
    if (lang === 'en' && p?.en) return p.en;
    return poiName;
  }

  return {
    STOPS, ROUTES, ROUTE_BY_NAME, STOP_INDEX, POIS,
    sequence, segments, headsign, stopLabel, roadLabel, routeLabel, poiLabel,
  };
})();
