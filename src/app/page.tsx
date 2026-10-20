'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import styles from './page.module.css';

export type Product = {
  id: string;
  category: string;
  name: string;
  basePrice: number; // 標準単価
  unit: string;      // 単位（式、ライセンス、本、年額、月額、人日、台など）
  remarks: string;   // 備考（標準の摘要テキスト）
  type: 'tiered' | 'flat';
  hidePrice?: boolean;
};

export const DEFAULT_CATEGORIES = [
  'CAD・BIM系',
  '計画・管理系',
  '加工・最適化系',
  'クラウド・サポート系',
  'その他',
  'DL Care保守内訳',
] as const;

export const UNIT_OPTIONS = [
  '式',
  'ライセンス',
  '本',
  '年額',
  '月額',
  '人日',
  '台',
  'セット',
];

export const DEFAULT_PRODUCT_MASTER: Product[] = [
  // --- CAD・BIM系 ---
  {
    id: 'dl_cad_1',
    category: 'CAD・BIM系',
    name: 'S/F REAL4',
    basePrice: 2500000,
    unit: 'ライセンス',
    remarks: '鉄骨専用3次元CADシステム 基本パッケージ',
    type: 'flat',
  },
  {
    id: 'dl_cad_2',
    category: 'CAD・BIM系',
    name: 'BIM/Revit連携システム',
    basePrice: 500000,
    unit: '式',
    remarks: 'IFC・Autodesk Revit双方向データ連携モジュール',
    type: 'flat',
  },
  {
    id: 'dl_cad_3',
    category: 'CAD・BIM系',
    name: 'S/F Arris4',
    basePrice: 800000,
    unit: 'ライセンス',
    remarks: '鉄骨2次元汎用CADシステム',
    type: 'flat',
  },

  // --- 計画・管理系 ---
  {
    id: 'dl_plan_1',
    category: '計画・管理系',
    name: 'S/F 生産計画',
    basePrice: 1200000,
    unit: '式',
    remarks: '工場工程・負荷計画管理システム',
    type: 'flat',
  },
  {
    id: 'dl_plan_2',
    category: '計画・管理系',
    name: 'S/F 出荷計画',
    basePrice: 800000,
    unit: '式',
    remarks: '車両積込・出荷管理システム',
    type: 'flat',
  },
  {
    id: 'dl_plan_3',
    category: '計画・管理系',
    name: 'S/F 出来高管理',
    basePrice: 800000,
    unit: '式',
    remarks: '加工進捗・出来高集計管理システム',
    type: 'flat',
  },
  {
    id: 'dl_plan_4',
    category: '計画・管理系',
    name: 'S/F 原価管理4',
    basePrice: 1000000,
    unit: '式',
    remarks: '工事別原価・実行予算管理システム',
    type: 'flat',
  },
  {
    id: 'dl_plan_5',
    category: '計画・管理系',
    name: 'S/F 見積積算4',
    basePrice: 900000,
    unit: 'ライセンス',
    remarks: '鉄骨工事見積・積算システム',
    type: 'flat',
  },

  // --- 加工・最適化系 ---
  {
    id: 'dl_opt_1',
    category: '加工・最適化系',
    name: 'S/F 最適取合4',
    basePrice: 700000,
    unit: 'ライセンス',
    remarks: '鋼材自動取合・発注最適化システム',
    type: 'flat',
  },
  {
    id: 'dl_opt_2',
    category: '加工・最適化系',
    name: 'S/F NCあなあけ3',
    basePrice: 900000,
    unit: '式',
    remarks: '工作機械向けNC加工データ自動出力システム',
    type: 'flat',
  },

  // --- クラウド・サポート系 ---
  {
    id: 'dl_cloud_1',
    category: 'クラウド・サポート系',
    name: 'S/F Com-Pass',
    basePrice: 180000,
    unit: '年額',
    remarks: 'クラウド型3Dモデル・図面共有サービス',
    type: 'flat',
  },
  {
    id: 'dl_cloud_2',
    category: 'クラウド・サポート系',
    name: 'DL Care',
    basePrice: 120000,
    unit: '年額',
    remarks: 'ソフトウェア保守サービス（年間契約）',
    type: 'tiered',
  },
  {
    id: 'dl_cloud_3',
    category: 'クラウド・サポート系',
    name: '保守サポート',
    basePrice: 60000,
    unit: '年額',
    remarks: '各種システム年間保守サポート費用',
    type: 'flat',
  },

  // --- その他 ---
  {
    id: 'dl_other_1',
    category: 'その他',
    name: 'オプションモジュール',
    basePrice: 300000,
    unit: '式',
    remarks: '各種拡張オプションモジュール一式',
    type: 'flat',
  },
  {
    id: 'dl_other_2',
    category: 'その他',
    name: '導入指導・セットアップ費用',
    basePrice: 100000,
    unit: '人日',
    remarks: 'インストール・初期設定・操作指導費',
    type: 'flat',
  },
  {
    id: 'dl_other_3',
    category: 'その他',
    name: 'ハードウェア・諸経費',
    basePrice: 150000,
    unit: '式',
    remarks: 'システム推奨機器・導入諸経費一式',
    type: 'flat',
  },

  // --- 既存ショキミツ互換：DL Care保守内訳用マスタ ---
  {
    id: '1_1',
    category: 'DL Care保守内訳',
    name: 'S/F REAL4 Type1',
    basePrice: 120000,
    unit: '台',
    remarks: '',
    type: 'tiered',
  },
  {
    id: '1_2',
    category: 'DL Care保守内訳',
    name: 'S/F REAL4 Type2',
    basePrice: 120000,
    unit: '台',
    remarks: '',
    type: 'tiered',
  },
  {
    id: '1_3',
    category: 'DL Care保守内訳',
    name: 'S/F REAL4 Type3',
    basePrice: 120000,
    unit: '台',
    remarks: '',
    type: 'tiered',
  },
  {
    id: '1_4',
    category: 'DL Care保守内訳',
    name: 'S/F REAL4 Type4',
    basePrice: 120000,
    unit: '台',
    remarks: '',
    type: 'tiered',
  },
  {
    id: '1_5',
    category: 'DL Care保守内訳',
    name: 'S/F REAL4 Type5',
    basePrice: 120000,
    unit: '台',
    remarks: '',
    type: 'tiered',
  },
  {
    id: '2',
    category: 'DL Care保守内訳',
    name: 'S/F NCあなあけ',
    basePrice: 60000,
    unit: '台',
    remarks: '',
    type: 'flat',
  },
  {
    id: '3',
    category: 'DL Care保守内訳',
    name: 'S/F Arris',
    basePrice: 36000,
    unit: '台',
    remarks: '',
    type: 'flat',
    hidePrice: true,
  },
  {
    id: '4',
    category: 'DL Care保守内訳',
    name: 'S/F 最適取合・見積積算',
    basePrice: 36000,
    unit: '台',
    remarks: '',
    type: 'flat',
  },
  {
    id: '5',
    category: 'DL Care保守内訳',
    name: 'OAシステム(見積積算・原価管理含む)',
    basePrice: 60000,
    unit: '台',
    remarks: '',
    type: 'flat',
  },
  {
    id: '6',
    category: 'DL Care保守内訳',
    name: '出荷計画',
    basePrice: 60000,
    unit: '台',
    remarks: '',
    type: 'flat',
  },
  {
    id: '7',
    category: 'DL Care保守内訳',
    name: '溶接ロボット連携',
    basePrice: 60000,
    unit: '台',
    remarks: '',
    type: 'flat',
  },
];

const DLCARE_LEGACY_IDS = new Set([
  '1_1',
  '1_2',
  '1_3',
  '1_4',
  '1_5',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
]);

const isDlCareProduct = (prod: Product): boolean => {
  return prod.category === 'DL Care保守内訳' || DLCARE_LEGACY_IDS.has(prod.id);
};

const generateDlCareItemName = (prod: Product, qty: number, price: number) => {
  if (prod.hidePrice) {
    return qty > 1 ? `┣${prod.name}(${qty}台分)` : `┣${prod.name}`;
  }
  const isTiered = prod.type === 'tiered' || prod.name.toUpperCase().includes('REAL');
  if (isTiered && qty > 1) {
    return `┣${prod.name} (${qty}台分: \\${price.toLocaleString()})`;
  }
  return `┣${prod.name} (${price.toLocaleString()})`;
};

const stripDlCareDecorations = (rawName: string): string => {
  return (rawName || '')
    .replace(/^[┣┗]\s*/, '')
    .replace(/\(\d+台分:\s*\\?[\d,]+\)/g, '')
    .replace(/\(\d+台分\)/g, '')
    .replace(/\([\d,]+\)/g, '')
    .replace(/\(金額手入力\)/g, '')
    .trim();
};

const formatDlCareRowName = (rawName: string, isLastRow: boolean): string => {
  if (!rawName) return '';
  if (/^[┣┗]/.test(rawName)) {
    return (isLastRow ? '┗' : '┣') + rawName.slice(1);
  }
  return rawName;
};

export type LineItem = {
  id: string;
  productId: string;
  categoryFilter: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  price: number;
  remarks: string;
  rowType: 'normal' | 'discount' | 'free';
  isAutoCalculated: boolean;
};

const normalizeSoftwareName = (text: string) => {
  return (text || '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[Ⅰⅰ]/g, '1')
    .replace(/[Ⅱⅱ]/g, '2')
    .replace(/[Ⅲⅲ]/g, '3')
    .replace(/[Ⅳⅳ]/g, '4')
    .replace(/[Ⅴⅴ]/g, '5')
    .toLowerCase()
    .replace(/【分離可能】/gi, '')
    .replace(/\s+/g, '')
    .replace('s/f', '')
    .trim();
};

const formatCompanyName = (name: string) => {
  let formatted = (name || '')
    .replace(/㈱/g, '株式会社')
    .replace(/㈲/g, '有限会社')
    .replace(/\(株\)/g, '株式会社')
    .replace(/\(有\)/g, '有限会社');
  return formatted.replace(/(株式会社|有限会社)(?![ 　])/g, '$1 ').trim();
};

const mergeOwnedSoftware = (softwareList: { name: string; count: string }[]) => {
  return softwareList.reduce((acc: { name: string; count: string }[], curr) => {
    const qty = parseInt(curr.count.replace(/[^0-9]/g, ''), 10) || 1;

    let displayName = curr.name;
    const tempName = displayName
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .toUpperCase();

    if (tempName.includes('REAL4') || tempName.includes('REAL 4') || tempName.includes('REAL４')) {
      displayName = displayName.replace(/Type\s*[1-5Ⅰ-Ⅴ]/gi, '').trim();
    }
    if (tempName.includes('NCあなあけ') || tempName.includes('NC穴開け')) {
      displayName = displayName.replace(/[3Ⅲ]\s*$/g, '').trim();
    }

    const normalizedCurr = normalizeSoftwareName(displayName);
    const existing = acc.find((item) => normalizeSoftwareName(item.name) === normalizedCurr);
    if (existing) {
      existing.count =
        (parseInt(existing.count.replace(/[^0-9]/g, ''), 10) + qty).toString() + '台';
      existing.name = displayName;
    } else {
      acc.push({ name: displayName, count: qty.toString() + '台' });
    }
    return acc;
  }, []);
};

const MASTER_STORAGE_KEY = 'sofurimitsu_product_master_v2';
const LEGACY_MASTER_STORAGE_KEY = 'estimate_product_master';
const PREF_STAFF_STORAGE_KEY = 'sofurimitsu_prefecture_staff_map_v1';

export type PrefectureRule = {
  prefecture: string;
  region: string;
  defaultStaff: string;
};

export const PREFECTURE_RULES: PrefectureRule[] = [
  { prefecture: '北海道', region: '北海道・東北', defaultStaff: '坂倉' },
  { prefecture: '青森県', region: '東北地方', defaultStaff: '坂倉' },
  { prefecture: '岩手県', region: '東北地方', defaultStaff: '坂倉' },
  { prefecture: '宮城県', region: '東北地方', defaultStaff: '坂倉' },
  { prefecture: '秋田県', region: '東北地方', defaultStaff: '坂倉' },
  { prefecture: '山形県', region: '東北地方', defaultStaff: '坂倉' },
  { prefecture: '福島県', region: '東北地方', defaultStaff: '坂倉' },
  { prefecture: '茨城県', region: '関東地方', defaultStaff: '林' },
  { prefecture: '栃木県', region: '関東地方', defaultStaff: '林' },
  { prefecture: '群馬県', region: '関東地方', defaultStaff: '倉増' },
  { prefecture: '埼玉県', region: '関東地方', defaultStaff: '林' },
  { prefecture: '千葉県', region: '関東地方', defaultStaff: '林' },
  { prefecture: '東京都', region: '関東地方', defaultStaff: '林' },
  { prefecture: '神奈川県', region: '関東地方', defaultStaff: '林' },
  { prefecture: '新潟県', region: '中部地方', defaultStaff: '林' },
  { prefecture: '富山県', region: '北陸三県', defaultStaff: '野上' },
  { prefecture: '石川県', region: '北陸三県', defaultStaff: '野上' },
  { prefecture: '福井県', region: '北陸三県', defaultStaff: '野上' },
  { prefecture: '山梨県', region: '中部地方', defaultStaff: '林' },
  { prefecture: '長野県', region: '中部地方', defaultStaff: '坂下' },
  { prefecture: '岐阜県', region: '中部地方', defaultStaff: '坂下' },
  { prefecture: '静岡県', region: '中部地方', defaultStaff: '倉増' },
  { prefecture: '愛知県', region: '中部地方', defaultStaff: '坂下' },
  { prefecture: '三重県', region: '近畿地方', defaultStaff: '坂下' },
  { prefecture: '滋賀県', region: '近畿地方', defaultStaff: '野上' },
  { prefecture: '京都府', region: '近畿地方', defaultStaff: '野上' },
  { prefecture: '大阪府', region: '近畿地方', defaultStaff: '野上' },
  { prefecture: '兵庫県', region: '近畿地方', defaultStaff: '野上' },
  { prefecture: '奈良県', region: '近畿地方', defaultStaff: '野上' },
  { prefecture: '和歌山県', region: '近畿地方', defaultStaff: '野上' },
  { prefecture: '鳥取県', region: '中国地方', defaultStaff: '' },
  { prefecture: '島根県', region: '中国地方', defaultStaff: '' },
  { prefecture: '岡山県', region: '中国地方', defaultStaff: '倉増' },
  { prefecture: '広島県', region: '中国地方', defaultStaff: '倉増' },
  { prefecture: '山口県', region: '中国地方', defaultStaff: '' },
  { prefecture: '徳島県', region: '四国', defaultStaff: '倉増' },
  { prefecture: '香川県', region: '四国', defaultStaff: '倉増' },
  { prefecture: '愛媛県', region: '四国', defaultStaff: '倉増' },
  { prefecture: '高知県', region: '四国', defaultStaff: '倉増' },
  { prefecture: '福岡県', region: '九州', defaultStaff: '永井' },
  { prefecture: '佐賀県', region: '九州', defaultStaff: '永井' },
  { prefecture: '長崎県', region: '九州', defaultStaff: '永井' },
  { prefecture: '熊本県', region: '九州', defaultStaff: '永井' },
  { prefecture: '大分県', region: '九州', defaultStaff: '永井' },
  { prefecture: '宮崎県', region: '九州', defaultStaff: '永井' },
  { prefecture: '鹿児島県', region: '九州', defaultStaff: '永井' },
  { prefecture: '沖縄県', region: '九州', defaultStaff: '永井' },
];

export const DEFAULT_PREFECTURE_STAFF_MAP: Record<string, string> = Object.fromEntries(
  PREFECTURE_RULES.map((r) => [r.prefecture, r.defaultStaff])
);

const detectPrefectureFromAddress = (address: string): string | null => {
  if (!address) return null;
  const clean = address.trim();
  let matchedPref: string | null = null;
  let earliestIdx = Infinity;

  // 「東京都府中市」の中に「京都府」が含まれるようなケースを防ぐため、
  // 住所文字列内で最も先頭に近い都道府県名を採用する
  for (const rule of PREFECTURE_RULES) {
    const idx = clean.indexOf(rule.prefecture);
    if (idx !== -1 && idx < earliestIdx) {
      earliestIdx = idx;
      matchedPref = rule.prefecture;
    }
  }
  return matchedPref;
};

export default function Home() {
  // メイン画面タブ ('estimate' = 見積書作成, 'master' = 金額マスター・設定, 'preview' = 見積書プレビュー, 'calculator' = 保守一本化電卓)
  const [activeWorkspace, setActiveWorkspace] = useState<
    'estimate' | 'master' | 'preview' | 'calculator'
  >('estimate');

  const [customerInfo, setCustomerInfo] = useState({
    companyName: '株式会社〇〇',
    postalCode: '000-0000',
    address: '〇〇県○○市〇丁目〇-〇',
    deliveryPlace: '貴社事務所',
    validity: '１ヶ月',
    paymentTerms: '現金振り込み',
    personInCharge: '',
  });
  const [autoDiscountNotes, setAutoDiscountNotes] = useState<string>('');

  // 見積表示モード: 'standard' = 通常製品見積モード / 'dlcare' = DL Care保守内訳モード
  const [estimateMode, setEstimateMode] = useState<'standard' | 'dlcare'>('standard');

  const [fileNo, setFileNo] = useState('');
  const [ownedSoftware, setOwnedSoftware] = useState<{ name: string; count: string }[]>([]);

  const [productMaster, setProductMaster] = useState<Product[]>(DEFAULT_PRODUCT_MASTER);
  const [staffMaster, setStaffMaster] = useState<string[]>([
    '坂下',
    '林',
    '野上',
    '永井',
    '坂倉',
    '倉増',
  ]);
  const [newStaffName, setNewStaffName] = useState<string>('');
  const [prefectureStaffMap, setPrefectureStaffMap] = useState<Record<string, string>>(
    DEFAULT_PREFECTURE_STAFF_MAP
  );

  // マスター設定画面内のサブタブ
  const [masterModalTab, setMasterModalTab] = useState<'list' | 'import' | 'staff'>('list');

  // マスター新規クイック登録フォーム
  const [newMasterDraft, setNewMasterDraft] = useState<{
    category: string;
    name: string;
    basePrice: number;
    unit: string;
    remarks: string;
  }>({
    category: 'CAD・BIM系',
    name: '',
    basePrice: 0,
    unit: '式',
    remarks: '',
  });

  // マスター管理内のフィルタ・一括取込状態
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('すべて');
  const [masterSearchQuery, setMasterSearchQuery] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [pasteText, setPasteText] = useState<string>('');
  const [importMessage, setImportMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 見積作成画面の左ペイン「製品カタログ」フィルタ状態
  const [quickCategory, setQuickCategory] = useState<string>('すべて');
  const [quickSearch, setQuickSearch] = useState<string>('');

  // --- Calculator States ---
  const [calcBaseSystem, setCalcBaseSystem] = useState({
    productId: '1_1',
    licenseCount: 1,
    orderYear: new Date().getFullYear(),
    orderMonth: 7,
    contractYear: new Date().getFullYear(),
    contractMonth: 7,
  });
  const [calcSubSystems, setCalcSubSystems] = useState([
    {
      id: Date.now().toString(),
      productId: '',
      licenseCount: 1,
      orderYear: new Date().getFullYear(),
      orderMonth: 6,
    },
  ]);
  const [showOverlapReference, setShowOverlapReference] = useState(true);

  // ローカルストレージからのマスター読み込みと初期データ統合
  useEffect(() => {
    const savedNew = localStorage.getItem(MASTER_STORAGE_KEY);
    if (savedNew) {
      try {
        const parsed = JSON.parse(savedNew);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 以前保存されたDL Care保守内訳マスタの不要な備考文字列をクリーンアップ
          const cleaned = parsed.map((p: Product) => {
            if (
              isDlCareProduct(p) &&
              p.remarks &&
              p.remarks.startsWith('DL Care保守内訳')
            ) {
              return { ...p, remarks: '', unit: p.unit === '年額' ? '台' : p.unit };
            }
            return p;
          });
          setProductMaster(cleaned);
          localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(cleaned));
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const savedLegacy = localStorage.getItem(LEGACY_MASTER_STORAGE_KEY);
      if (savedLegacy) {
        try {
          const legacyList: any[] = JSON.parse(savedLegacy);
          const merged = [...DEFAULT_PRODUCT_MASTER];
          legacyList.forEach((leg) => {
            if (!merged.some((m) => m.name === leg.name)) {
              merged.push({
                id: leg.id || `leg_${Date.now()}_${Math.random()}`,
                category: 'DL Care保守内訳',
                name: leg.name,
                basePrice: Number(leg.basePrice) || 0,
                unit: '台',
                remarks: '',
                type: leg.type === 'tiered' ? 'tiered' : 'flat',
                hidePrice: !!leg.hidePrice,
              });
            }
          });
          setProductMaster(merged);
          localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {}
      } else {
        localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCT_MASTER));
      }
    }

    const savedStaff = localStorage.getItem('estimate_staff_master');
    if (savedStaff) {
      try {
        setStaffMaster(JSON.parse(savedStaff));
      } catch (e) {}
    }

    const savedPrefStaff = localStorage.getItem(PREF_STAFF_STORAGE_KEY);
    if (savedPrefStaff) {
      try {
        const parsed = JSON.parse(savedPrefStaff);
        if (parsed && typeof parsed === 'object') {
          setPrefectureStaffMap({ ...DEFAULT_PREFECTURE_STAFF_MAP, ...parsed });
        }
      } catch (e) {}
    }
  }, []);

  const saveProductMaster = (newMaster: Product[]) => {
    setProductMaster(newMaster);
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(newMaster));
  };

  const saveStaffMaster = (newMaster: string[]) => {
    setStaffMaster(newMaster);
    localStorage.setItem('estimate_staff_master', JSON.stringify(newMaster));
  };

  const savePrefectureStaffMap = (newMap: Record<string, string>) => {
    setPrefectureStaffMap(newMap);
    localStorage.setItem(PREF_STAFF_STORAGE_KEY, JSON.stringify(newMap));
  };

  // 住所に含まれる都道府県名から担当者を判定（鳥取・島根・山口など未設定県の場合は '' を返す）
  const resolveStaffFromAddress = (
    address: string,
    fallbackStaff: string
  ): { detectedPref: string | null; staff: string } => {
    const pref = detectPrefectureFromAddress(address);
    if (!pref) {
      return { detectedPref: null, staff: fallbackStaff };
    }
    const mapped =
      pref in prefectureStaffMap
        ? prefectureStaffMap[pref]
        : DEFAULT_PREFECTURE_STAFF_MAP[pref] ?? '';
    return { detectedPref: pref, staff: mapped };
  };

  // DL Care保守内訳専用マスタリスト と 通常製品販売マスタリスト
  const dlCareMasterList = useMemo(
    () => productMaster.filter((p) => isDlCareProduct(p)),
    [productMaster]
  );

  const standardMasterList = useMemo(
    () => productMaster.filter((p) => !isDlCareProduct(p)),
    [productMaster]
  );

  // 利用可能なカテゴリ一覧
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    productMaster.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [productMaster]);

  const [date] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  });

  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setCustomers(data.data);
        }
      })
      .catch((err) => console.error('Error fetching customers:', err));
  }, []);

  const [items, setItems] = useState<LineItem[]>([]);

  const updateCustomerInfo = (field: string, value: string) => {
    setCustomerInfo((prev) => {
      if (field === 'address') {
        const { detectedPref, staff } = resolveStaffFromAddress(value, prev.personInCharge);
        return {
          ...prev,
          address: value,
          personInCharge: detectedPref !== null ? staff : prev.personInCharge,
        };
      }
      return { ...prev, [field]: value };
    });
  };

  // --- DL Care保守価格計算ロジック（ショキミツ完全互換） ---
  const calculateDlCarePrice = (
    prod: Product | undefined,
    quantity: number | string,
    ignoreHidePrice: boolean = false
  ): number => {
    if (!prod) return 0;
    if (prod.hidePrice && !ignoreHidePrice) return 0;

    const base = Number(prod.basePrice) || 0;
    const qty = Number(quantity) || 1;
    const isTiered = prod.type === 'tiered' || prod.name.toUpperCase().includes('REAL');

    if (isTiered) {
      if (qty <= 1) return base;
      if (qty === 2) return base + 30000;
      if (qty === 3) return base + 60000;
      if (qty === 4) return base + 90000;
      return base + 120000; // 5台目以降
    } else {
      // 台数による増額無しのソフトウェアは台数に関係なく基本料金を適用
      return base;
    }
  };

  // --- 価格計算ロジック ---
  const calculatePrice = (
    productId: string,
    quantity: number | string,
    ignoreHidePrice: boolean = false,
    overrideUnitPrice?: number,
    modeOverride?: 'standard' | 'dlcare'
  ): number => {
    const activeMode = modeOverride ?? estimateMode;
    const qty = Number(quantity) || 1;
    if (!productId) {
      return (Number(overrideUnitPrice) || 0) * qty;
    }
    const product = productMaster.find((p) => p.id === productId);
    if (!product) {
      return (Number(overrideUnitPrice) || 0) * qty;
    }
    if (product.hidePrice && !ignoreHidePrice) return 0;

    if (activeMode === 'dlcare' || isDlCareProduct(product)) {
      return calculateDlCarePrice(product, qty, ignoreHidePrice);
    }

    const base =
      overrideUnitPrice !== undefined ? Number(overrideUnitPrice) : Number(product.basePrice) || 0;

    if (product.type === 'tiered') {
      if (qty <= 1) return base;
      if (qty === 2) return base + 30000;
      if (qty === 3) return base + 60000;
      if (qty === 4) return base + 90000;
      return base + 120000;
    }

    return base * qty;
  };

  // --- ソフトウェア名からDL Care保守マスタを最適マッチングする関数 ---
  const findBestDlCareProduct = (rawSoftwareName: string): Product | undefined => {
    const cleanName = stripDlCareDecorations(rawSoftwareName);
    const normalizedSwName = normalizeSoftwareName(cleanName);
    if (!normalizedSwName) return undefined;

    let bestMatch: Product | undefined = undefined;
    let bestScore = -1;

    // 必ず DL Care保守内訳マスタの中から検索する（製品販売用の250万円REAL4等に誤爆しないようにする）
    const pool = dlCareMasterList.length > 0 ? dlCareMasterList : productMaster;

    for (const p of pool) {
      const normalizedMaster = normalizeSoftwareName(p.name);

      if (normalizedSwName === normalizedMaster) {
        bestMatch = p;
        bestScore = 9999;
        break;
      }

      if (normalizedSwName.includes(normalizedMaster)) {
        if (normalizedMaster.length > bestScore) {
          bestMatch = p;
          bestScore = normalizedMaster.length;
        }
      } else if (normalizedMaster.includes(normalizedSwName)) {
        if (normalizedSwName.length > bestScore) {
          bestMatch = p;
          bestScore = normalizedSwName.length;
        }
      }
    }

    return bestMatch;
  };

  // --- ソフトウェア名から通常製品販売マスタを最適マッチングする関数 ---
  const findBestStandardProduct = (rawSoftwareName: string): Product | undefined => {
    const cleanName = stripDlCareDecorations(rawSoftwareName).replace(/Type\s*[1-5Ⅰ-Ⅴ]/gi, '').trim();
    const normalizedSwName = normalizeSoftwareName(cleanName);
    if (!normalizedSwName) return undefined;

    let bestMatch: Product | undefined = undefined;
    let bestScore = -1;

    for (const p of standardMasterList) {
      const normalizedMaster = normalizeSoftwareName(p.name);
      if (normalizedSwName === normalizedMaster) {
        bestMatch = p;
        bestScore = 9999;
        break;
      }
      if (normalizedSwName.includes(normalizedMaster)) {
        if (normalizedMaster.length > bestScore) {
          bestMatch = p;
          bestScore = normalizedMaster.length;
        }
      } else if (normalizedMaster.includes(normalizedSwName)) {
        if (normalizedSwName.length > bestScore) {
          bestMatch = p;
          bestScore = normalizedSwName.length;
        }
      }
    }

    return bestMatch;
  };

  // --- モード切替時に既存の明細行も自動的に変換する関数 ---
  const handleSwitchEstimateMode = (nextMode: 'standard' | 'dlcare') => {
    setEstimateMode(nextMode);
    if (nextMode === 'dlcare') {
      setQuickCategory('DL Care保守内訳');
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.rowType === 'discount') return item;
          const cleanBaseName = stripDlCareDecorations(item.name);
          const currentProd = productMaster.find((p) => p.id === item.productId);
          const dlProd =
            currentProd && isDlCareProduct(currentProd)
              ? currentProd
              : findBestDlCareProduct(cleanBaseName || currentProd?.name || '');

          const qty = item.quantity || 1;
          if (dlProd) {
            const price = calculateDlCarePrice(dlProd, qty);
            const isMergedRealOrNc =
              cleanBaseName === 'S/F REAL4' || cleanBaseName === 'S/F NCあなあけ';
            const displayProdName = isMergedRealOrNc ? cleanBaseName : dlProd.name;
            const tempProd = { ...dlProd, name: displayProdName };
            return {
              ...item,
              productId: dlProd.id,
              categoryFilter: 'DL Care保守内訳',
              name: generateDlCareItemName(tempProd, qty, price),
              unit: '台',
              unitPrice: price,
              price,
              remarks: '',
              isAutoCalculated: true,
            };
          } else if (cleanBaseName) {
            return {
              ...item,
              name: item.name.startsWith('┣') ? item.name : `┣${cleanBaseName} (${item.price.toLocaleString()})`,
              remarks: '',
            };
          }
          return item;
        })
      );
    } else {
      if (quickCategory === 'DL Care保守内訳') {
        setQuickCategory('すべて');
      }
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.rowType === 'discount') return item;
          const cleanBaseName = stripDlCareDecorations(item.name);
          const currentProd = productMaster.find((p) => p.id === item.productId);
          const stdProd =
            currentProd && !isDlCareProduct(currentProd)
              ? currentProd
              : findBestStandardProduct(cleanBaseName || currentProd?.name || '');

          const qty = item.quantity || 1;
          if (stdProd) {
            const uPrice = stdProd.basePrice;
            const calcPrice = uPrice * qty;
            return {
              ...item,
              productId: stdProd.id,
              categoryFilter: stdProd.category,
              name: stdProd.name,
              unit: stdProd.unit || '式',
              unitPrice: uPrice,
              price: calcPrice,
              remarks: stdProd.remarks || '',
              isAutoCalculated: true,
            };
          } else {
            return {
              ...item,
              name: cleanBaseName,
            };
          }
        })
      );
    }
  };

  // --- 電卓（保守契約一本化）ロジック ---
  const getSubCalcResult = (sub: (typeof calcSubSystems)[0]) => {
    const basePrice = calculatePrice(sub.productId, sub.licenseCount, true, undefined, 'dlcare') || 0;
    const monthlyPrice = Math.floor(basePrice / 12);

    const baseUnifyStart = calcBaseSystem.orderYear * 12 + calcBaseSystem.orderMonth + 12;
    const subEnd = sub.orderYear * 12 + sub.orderMonth + 12;
    const diff = subEnd - baseUnifyStart;

    let overlapMonths = 0;
    let gapMonths = 0;
    let discountAmount = 0;
    let bridgeAmount = 0;
    let isDiscountApplied = false;
    let isBridgeFree = false;

    if (diff > 0) {
      overlapMonths = diff;
      discountAmount = monthlyPrice * overlapMonths;
      isDiscountApplied = true;
    } else if (diff < 0) {
      gapMonths = Math.abs(diff);
      if (gapMonths <= 3) {
        bridgeAmount = 0;
        isBridgeFree = true;
      } else {
        bridgeAmount = monthlyPrice * gapMonths;
      }
    }

    let newYearPrice = basePrice;
    if (overlapMonths > 0) {
      newYearPrice = Math.max(0, basePrice - discountAmount);
    } else if (gapMonths >= 4) {
      newYearPrice = basePrice + bridgeAmount;
    } else if (isBridgeFree) {
      newYearPrice = basePrice;
    }

    const prod = productMaster.find((p) => p.id === sub.productId);
    const productName = prod ? prod.name : '';

    return {
      basePrice,
      monthlyPrice,
      overlapMonths,
      gapMonths,
      discountAmount,
      bridgeAmount,
      newYearPrice,
      isDiscountApplied,
      isBridgeFree,
      productName,
    };
  };

  const getTotalRequestAmount = () => {
    const mainPrice =
      calculatePrice(calcBaseSystem.productId, calcBaseSystem.licenseCount, true, undefined, 'dlcare') || 0;
    const subsPrice = calcSubSystems.reduce(
      (acc, sub) => acc + getSubCalcResult(sub).newYearPrice,
      0
    );
    return mainPrice + subsPrice;
  };

  // --- 明細行の操作ロジック ---
  const applyProductToLineItem = (
    item: LineItem,
    prod: Product,
    mode: 'standard' | 'dlcare' = estimateMode
  ): LineItem => {
    const qty = item.quantity || 1;
    const effectiveDlCare = mode === 'dlcare' || isDlCareProduct(prod);

    if (effectiveDlCare) {
      const calcPrice = calculateDlCarePrice(prod, qty);
      const displayName = generateDlCareItemName(prod, qty, calcPrice);
      return {
        ...item,
        productId: prod.id,
        categoryFilter: prod.category || 'DL Care保守内訳',
        name: displayName,
        unit: '台',
        unitPrice: calcPrice,
        price: calcPrice,
        remarks: '',
        rowType: 'normal',
        isAutoCalculated: true,
      };
    }

    const unitPrice = prod.hidePrice ? 0 : prod.basePrice;
    const calcPrice =
      prod.type === 'tiered'
        ? calculatePrice(prod.id, qty, false, unitPrice, 'standard')
        : unitPrice * qty;

    return {
      ...item,
      productId: prod.id,
      categoryFilter: prod.category || item.categoryFilter,
      name: prod.name,
      unit: prod.unit || '式',
      unitPrice: prod.type === 'tiered' ? calcPrice : unitPrice,
      price: calcPrice,
      remarks: prod.remarks || '',
      rowType: 'normal',
      isAutoCalculated: true,
    };
  };

  const updateItem = (
    id: string,
    field: keyof LineItem | 'productSelect',
    value: string | number | boolean
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;

        if (field === 'productSelect') {
          const prod = productMaster.find((p) => p.id === value);
          if (prod) {
            return applyProductToLineItem(item, prod);
          }
          return { ...item, productId: '' };
        }

        const updatedItem: LineItem = { ...item, [field]: value } as LineItem;

        if (field === 'quantity') {
          const qty = Number(value) || 0;
          updatedItem.quantity = qty;
          const prod = productMaster.find((p) => p.id === updatedItem.productId);
          if (prod && (estimateMode === 'dlcare' || isDlCareProduct(prod))) {
            const newPrice = calculateDlCarePrice(prod, qty);
            updatedItem.unitPrice = newPrice;
            updatedItem.price = newPrice;
            const cleanBaseName = stripDlCareDecorations(updatedItem.name);
            const isMergedRealOrNc =
              cleanBaseName === 'S/F REAL4' || cleanBaseName === 'S/F NCあなあけ';
            const tempProd = isMergedRealOrNc ? { ...prod, name: cleanBaseName } : prod;
            updatedItem.name = generateDlCareItemName(tempProd, qty, newPrice);
            updatedItem.isAutoCalculated = true;
          } else if (prod && prod.type === 'tiered' && updatedItem.isAutoCalculated) {
            const newPrice = calculatePrice(prod.id, qty);
            updatedItem.unitPrice = newPrice;
            updatedItem.price = newPrice;
          } else if (updatedItem.isAutoCalculated) {
            updatedItem.price = updatedItem.unitPrice * qty;
          }
        }

        if (field === 'unitPrice') {
          let uPrice = Number(value) || 0;
          if (updatedItem.rowType === 'discount' && uPrice > 0) {
            uPrice = -Math.abs(uPrice);
          }
          updatedItem.unitPrice = uPrice;
          updatedItem.price =
            estimateMode === 'dlcare'
              ? uPrice
              : uPrice * (Number(updatedItem.quantity) || 1);
        }

        if (field === 'price') {
          let pVal = Number(value) || 0;
          if (updatedItem.rowType === 'discount' && pVal > 0) {
            pVal = -Math.abs(pVal);
          }
          updatedItem.price = pVal;
          if (estimateMode === 'dlcare') {
            updatedItem.unitPrice = pVal;
          }
          updatedItem.isAutoCalculated = false;
        }

        return updatedItem;
      })
    );
  };

  // カタログからワンクリックで明細に追加
  const addMasterProductToEstimate = (prod: Product) => {
    const blankItem: LineItem = {
      id: `${Date.now()}_${Math.random()}`,
      productId: prod.id,
      categoryFilter: prod.category || 'すべて',
      name: prod.name,
      quantity: 1,
      unit: prod.unit || '式',
      unitPrice: prod.basePrice,
      price: prod.basePrice,
      remarks: prod.remarks || '',
      rowType: 'normal',
      isAutoCalculated: true,
    };
    const populated = applyProductToLineItem(blankItem, prod);
    setItems((prev) => [...prev, populated]);
  };

  // 空の自由入力行を追加
  const addFreeItem = () => {
    setItems((prevItems) => [
      ...prevItems,
      {
        id: `${Date.now()}_${Math.random()}`,
        productId: '',
        categoryFilter: '',
        name: estimateMode === 'dlcare' ? '┣' : '',
        quantity: 1,
        unit: estimateMode === 'dlcare' ? '台' : '式',
        unitPrice: 0,
        price: 0,
        remarks: '',
        rowType: 'free',
        isAutoCalculated: true,
      },
    ]);
  };

  // 一式値引き行を追加
  const addDiscountItem = () => {
    setItems((prevItems) => [
      ...prevItems,
      {
        id: `${Date.now()}_${Math.random()}`,
        productId: '',
        categoryFilter: '',
        name: '一式お値引き',
        quantity: 1,
        unit: '式',
        unitPrice: -50000,
        price: -50000,
        remarks: '出精値引き',
        rowType: 'discount',
        isAutoCalculated: true,
      },
    ]);
  };

  // 所持ソフト1件からDL Care保守明細アイテムを生成するヘルパー
  const buildDlCareItemFromOwnedSoftware = (sw: { name: string; count: string }): LineItem => {
    let parsedQty = parseInt(sw.count.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsedQty) || parsedQty <= 0) parsedQty = 1;

    const matchedProduct = findBestDlCareProduct(sw.name);
    const productId = matchedProduct ? matchedProduct.id : '';
    const isAuto = !!matchedProduct;
    const price = isAuto && matchedProduct ? calculateDlCarePrice(matchedProduct, parsedQty) : 0;

    let name = '';
    if (matchedProduct) {
      const displayProdName =
        sw.name === 'S/F REAL4' || sw.name === 'S/F NCあなあけ'
          ? sw.name
          : matchedProduct.name;
      const tempProd = { ...matchedProduct, name: displayProdName };
      name = generateDlCareItemName(tempProd, parsedQty, price);
    } else {
      name = `┣${sw.name} (金額手入力)`;
    }

    return {
      id: `${Date.now()}_${Math.random()}`,
      productId,
      categoryFilter: 'DL Care保守内訳',
      name,
      quantity: parsedQty,
      unit: '台',
      unitPrice: price,
      price,
      remarks: '',
      rowType: 'normal',
      isAutoCalculated: isAuto,
    };
  };

  // 所持ソフトメモからの追加（自動的にDL Care保守内訳モードに切り替えてDL Care保守項目として追加）
  const addSoftwareToEstimate = (sw: { name: string; count: string }) => {
    if (estimateMode !== 'dlcare') {
      handleSwitchEstimateMode('dlcare');
    }
    const newItem = buildDlCareItemFromOwnedSoftware(sw);
    setItems((prev) => [...prev, newItem]);
  };

  // 顧客の所持ソフトをすべてDL Care保守見積へ一括セット
  const addAllOwnedSoftwareToDlCare = () => {
    if (ownedSoftware.length === 0) return;
    setEstimateMode('dlcare');
    setQuickCategory('DL Care保守内訳');
    const builtItems = ownedSoftware.map((sw) => buildDlCareItemFromOwnedSoftware(sw));
    setItems(builtItems);
  };

  const removeItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    setItems((prevItems) => {
      const copy = [...prevItems];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveItemDown = (index: number) => {
    setItems((prevItems) => {
      if (index >= prevItems.length - 1) return prevItems;
      const copy = [...prevItems];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // --- マスター項目の操作・一括取込ロジック ---
  const handleQuickAddMaster = () => {
    if (!newMasterDraft.name.trim()) return;
    const newItem: Product = {
      id: `custom_${Date.now()}`,
      category: newMasterDraft.category.trim() || 'その他',
      name: newMasterDraft.name.trim(),
      basePrice: Number(newMasterDraft.basePrice) || 0,
      unit: newMasterDraft.unit.trim() || '式',
      remarks: newMasterDraft.remarks.trim(),
      type: 'flat',
    };
    saveProductMaster([newItem, ...productMaster]);
    setNewMasterDraft((prev) => ({
      ...prev,
      name: '',
      basePrice: 0,
      remarks: '',
    }));
  };

  const moveMasterUp = (id: string) => {
    const idx = productMaster.findIndex((p) => p.id === id);
    if (idx <= 0) return;
    const copy = [...productMaster];
    const tmp = copy[idx];
    copy[idx] = copy[idx - 1];
    copy[idx - 1] = tmp;
    saveProductMaster(copy);
  };

  const moveMasterDown = (id: string) => {
    const idx = productMaster.findIndex((p) => p.id === id);
    if (idx < 0 || idx >= productMaster.length - 1) return;
    const copy = [...productMaster];
    const tmp = copy[idx];
    copy[idx] = copy[idx + 1];
    copy[idx + 1] = tmp;
    saveProductMaster(copy);
  };

  const updateMasterField = (id: string, field: keyof Product, value: any) => {
    const next = productMaster.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    saveProductMaster(next);
  };

  const parseRawRowsToMasterItems = (rawText: string): Product[] => {
    const cleaned = rawText.trim();
    if (!cleaned) return [];

    const parsed = Papa.parse<string[]>(cleaned, {
      skipEmptyLines: true,
    });
    const rows = parsed.data;
    if (!rows || rows.length === 0) return [];

    const parsePriceNumber = (val: string | undefined): number => {
      if (!val) return 0;
      const normalized = val
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[,，¥￥円\s]/g, '');
      const num = Number(normalized);
      return isNaN(num) ? 0 : num;
    };

    const firstRowJoined = rows[0].join(',').toLowerCase();
    const hasHeader =
      firstRowJoined.includes('カテゴリ') ||
      firstRowJoined.includes('品目') ||
      firstRowJoined.includes('製品') ||
      firstRowJoined.includes('単価') ||
      firstRowJoined.includes('category') ||
      firstRowJoined.includes('name') ||
      firstRowJoined.includes('price');

    const colMap = {
      category: 0,
      name: 1,
      basePrice: 2,
      unit: 3,
      remarks: 4,
      type: 5,
    };

    if (hasHeader) {
      const headers = rows[0].map((h) => (h || '').trim());
      headers.forEach((h, i) => {
        if (h.includes('カテゴリ') || h.toLowerCase() === 'category' || h.includes('分類')) {
          colMap.category = i;
        } else if (
          h.includes('製品') ||
          h.includes('品目') ||
          h.includes('品名') ||
          h.toLowerCase() === 'name'
        ) {
          colMap.name = i;
        } else if (
          h.includes('単価') ||
          h.includes('価格') ||
          h.includes('金額') ||
          h.toLowerCase().includes('price')
        ) {
          colMap.basePrice = i;
        } else if (h.includes('単位') || h.toLowerCase() === 'unit') {
          colMap.unit = i;
        } else if (
          h.includes('備考') ||
          h.includes('摘要') ||
          h.includes('説明') ||
          h.toLowerCase() === 'remarks'
        ) {
          colMap.remarks = i;
        } else if (h.includes('計算') || h.toLowerCase() === 'type') {
          colMap.type = i;
        }
      });
    }

    const dataRows = (hasHeader ? rows.slice(1) : rows).slice(0, 2000);
    const result: Product[] = [];

    // CSV/Excel数式インジェクション防止（先頭の =, +, -, @ 等を無害化）
    const cleanCellStr = (raw: string | undefined, maxLen = 150): string => {
      const s = (raw || '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()
        .slice(0, maxLen);
      if (/^[=+\-@]/.test(s)) {
        return s.replace(/^[=+\-@]+/, '').trim();
      }
      return s;
    };

    dataRows.forEach((cols, idx) => {
      if (!cols || cols.length === 0) return;
      let category = 'その他';
      let name = '';
      let basePrice = 0;
      let unit = '式';
      let remarks = '';
      let calcType: 'flat' | 'tiered' = 'flat';

      if (!hasHeader && cols.length === 2) {
        name = cleanCellStr(cols[0], 120);
        basePrice = parsePriceNumber(cols[1]);
      } else if (!hasHeader && cols.length === 3) {
        const secondAsPrice = parsePriceNumber(cols[1]);
        if (secondAsPrice > 0 && !isNaN(Number((cols[1] || '').replace(/[,¥￥円\s]/g, '')))) {
          name = cleanCellStr(cols[0], 120);
          basePrice = secondAsPrice;
          unit = cleanCellStr(cols[2] || '式', 20) || '式';
        } else {
          category = cleanCellStr(cols[0] || 'その他', 60) || 'その他';
          name = cleanCellStr(cols[1], 120);
          basePrice = parsePriceNumber(cols[2]);
        }
      } else {
        category = cleanCellStr(cols[colMap.category] || 'その他', 60) || 'その他';
        name = cleanCellStr(cols[colMap.name], 120);
        basePrice = parsePriceNumber(cols[colMap.basePrice]);
        unit = cleanCellStr(cols[colMap.unit] || '式', 20) || '式';
        remarks = cleanCellStr(cols[colMap.remarks], 200);
        const typeStr = cleanCellStr(cols[colMap.type], 30).toLowerCase();
        if (typeStr === 'tiered' || typeStr.includes('階段')) {
          calcType = 'tiered';
        }
      }

      if (!name) return;

      result.push({
        id: `imp_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        category,
        name,
        basePrice: Math.max(0, Math.min(1_000_000_000, basePrice)),
        unit,
        remarks,
        type: calcType,
      });
    });

    return result;
  };

  // コピペテキストのリアルタイムプレビュー
  const pastedPreviewItems = useMemo(() => {
    if (!pasteText.trim()) return [];
    return parseRawRowsToMasterItems(pasteText);
  }, [pasteText]);

  const applyImportedMasterItems = (imported: Product[]) => {
    if (imported.length === 0) {
      setImportMessage({
        type: 'error',
        text: '有効な製品データが見つかりませんでした。列名や入力形式をご確認ください。',
      });
      return;
    }

    if (importMode === 'replace') {
      saveProductMaster(imported);
      setImportMessage({
        type: 'success',
        text: `${imported.length}件のマスターデータで一括置換しました。`,
      });
    } else {
      const updated = [...productMaster];
      let addedCount = 0;
      let updatedCount = 0;

      imported.forEach((imp) => {
        const existingIdx = updated.findIndex(
          (p) => p.name.trim().toLowerCase() === imp.name.trim().toLowerCase()
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            category: imp.category || updated[existingIdx].category,
            basePrice: imp.basePrice,
            unit: imp.unit || updated[existingIdx].unit,
            remarks: imp.remarks || updated[existingIdx].remarks,
            type: imp.type || updated[existingIdx].type,
          };
          updatedCount++;
        } else {
          updated.push(imp);
          addedCount++;
        }
      });

      saveProductMaster(updated);
      setImportMessage({
        type: 'success',
        text: `一括取込完了：新規追加 ${addedCount}件 / 既存更新 ${updatedCount}件（計 ${updated.length}件）`,
      });
    }
  };

  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);

    // ファイルサイズ上限チェック（2MB超の巨大ファイルによるブラウザクラッシュ・DoS防止）
    if (file.size > 2 * 1024 * 1024) {
      setImportMessage({
        type: 'error',
        text: 'ファイルサイズが大きすぎます（上限 2MB まで）。',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('\uFFFD')) {
        text = new TextDecoder('shift-jis').decode(buffer);
      }
      const imported = parseRawRowsToMasterItems(text);
      applyImportedMasterItems(imported);
    } catch (err: any) {
      setImportMessage({
        type: 'error',
        text: `CSVファイルの読み込みに失敗しました: ${err.message || String(err)}`,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasteImport = () => {
    setImportMessage(null);
    const imported = parseRawRowsToMasterItems(pasteText);
    applyImportedMasterItems(imported);
    if (imported.length > 0) {
      setPasteText('');
    }
  };

  const handleExportMasterCsv = () => {
    const safeCsvCell = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
    const csvRows = [
      ['カテゴリ', '製品・品目名', '標準単価', '単位', '備考', '計算方式'],
      ...productMaster.map((p) => [
        safeCsvCell(p.category || 'その他'),
        safeCsvCell(p.name),
        String(p.basePrice),
        safeCsvCell(p.unit || '式'),
        safeCsvCell(p.remarks || ''),
        p.type === 'tiered' ? '階段価格' : '通常',
      ]),
    ];
    const csvStr = Papa.unparse(csvRows);
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csvStr], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `データロジック製品金額マスター_${date}.csv`);
  };

  const handleDownloadSampleCsv = () => {
    const sampleRows = [
      ['カテゴリ', '製品・品目名', '標準単価', '単位', '備考'],
      ['CAD・BIM系', 'S/F REAL4', '2500000', 'ライセンス', '鉄骨専用3次元CADシステム'],
      ['CAD・BIM系', 'BIM/Revit連携システム', '500000', '式', 'IFC・Revit双方向連携モジュール'],
      ['計画・管理系', 'S/F 生産計画', '1200000', '式', '工場工程・負荷計画管理システム'],
      ['加工・最適化系', 'S/F 最適取合4', '700000', 'ライセンス', '鋼材自動取合・発注最適化システム'],
      ['クラウド・サポート系', 'S/F Com-Pass', '180000', '年額', 'クラウド型3Dモデル・図面共有サービス'],
      ['その他', '導入指導・セットアップ費用', '100000', '人日', '初期設定・操作指導費'],
    ];
    const csvStr = Papa.unparse(sampleRows);
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csvStr], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, '金額マスター_インポート用サンプル.csv');
  };

  // --- フィルタ済みマスター一覧 ---
  const filteredMasterForModal = useMemo(() => {
    return productMaster.filter((p) => {
      const catMatch =
        masterCategoryFilter === 'すべて' || p.category === masterCategoryFilter;
      if (!catMatch) return false;
      if (!masterSearchQuery.trim()) return true;
      const q = masterSearchQuery.trim().toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.remarks || '').toLowerCase().includes(q)
      );
    });
  }, [productMaster, masterCategoryFilter, masterSearchQuery]);

  const filteredMasterForQuickBar = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (estimateMode === 'dlcare') {
      return dlCareMasterList.filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.remarks || '').toLowerCase().includes(q)
        );
      });
    }
    return standardMasterList.filter((p) => {
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.remarks || '').toLowerCase().includes(q)
        );
      }
      return quickCategory === 'すべて' || p.category === quickCategory;
    });
  }, [dlCareMasterList, standardMasterList, quickCategory, quickSearch, estimateMode]);

  // --- 小計・値引き・消費税・合計金額計算 ---
  const positiveSubtotal = items
    .filter((i) => i.price > 0)
    .reduce((acc, item) => acc + item.price, 0);
  const discountTotal = items
    .filter((i) => i.price < 0)
    .reduce((acc, item) => acc + item.price, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    const maxAllowed = estimateMode === 'dlcare' ? 14 : 16;
    if (items.length > maxAllowed) {
      alert(
        `Excelテンプレートの明細行数上限（${
          estimateMode === 'dlcare' ? 'DL Careモードは最大14行' : '通常モードは最大16行'
        }）を超えています（現在 ${items.length} 行）。\n明細行を ${maxAllowed} 行以下にまとめてから出力してください。`
      );
      return;
    }

    try {
      const defaultRemarksLines = [
        '・DL Careは年間契約（1年ごとの自動更新）となります。',
        '※正式なご契約は、別途契約書にて取り交わさせていただきます。',
        '・カスタム講習、入力代行サービスは都度お見積りの上、別途費用を頂きます。',
      ];
      const extraLines = autoDiscountNotes
        ? autoDiscountNotes
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        : [];
      const customRemarksPayload =
        extraLines.length > 0 ? [...defaultRemarksLines, ...extraLines] : undefined;

      const response = await fetch('/api/export-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerInfo,
          items,
          total,
          subtotal,
          tax,
          date,
          estimateMode,
          customRemarks: customRemarksPayload,
        }),
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {}
        throw new Error(
          errData?.error || errData?.details || 'テンプレートの出力に失敗しました'
        );
      }

      const blob = await response.blob();
      saveAs(blob, `御見積書_${customerInfo.companyName}.xlsx`);
    } catch (err: any) {
      console.error(err);
      alert('Excelの生成に失敗しました。\n詳細: ' + (err.message || String(err)));
    }
  };

  const syncReal4CountToCalculator = () => {
    const isRealName = (name: string) => {
      const clean = (name || '')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .toUpperCase();
      return clean.includes('REAL');
    };
    const realItem = items.find((it) => isRealName(it.name));
    if (realItem) {
      let count = realItem.quantity || 1;
      const match = (realItem.name || '').match(/(\d+)\s*台/);
      if (match) {
        count = parseInt(match[1], 10);
      }
      if (count > 0) {
        setCalcBaseSystem((prev) => ({
          ...prev,
          licenseCount: count,
        }));
      }
    }
  };

  useEffect(() => {
    syncReal4CountToCalculator();
  }, [items]);

  const handleExportContract = async () => {
    try {
      const baseOrderTotal = calcBaseSystem.orderYear * 12 + calcBaseSystem.orderMonth;
      const baseUnifyTotal = baseOrderTotal + 12;

      const subsData = calcSubSystems
        .filter((sub) => sub.productId)
        .map((sub) => {
          const result = getSubCalcResult(sub);
          const p = productMaster.find((p) => p.id === sub.productId);
          const subOrderTotal = sub.orderYear * 12 + sub.orderMonth;
          const subEndTotal = subOrderTotal + 12;
          const bridgeStartMonth = ((subEndTotal - 1) % 12) + 1;
          const bridgeEndMonth = ((baseUnifyTotal - 2) % 12) + 1;

          return {
            name: p ? p.name : '未選択',
            discountAmount: result.discountAmount,
            gapMonths: result.gapMonths,
            bridgeAmount: result.bridgeAmount,
            bridgeStartMonth,
            bridgeEndMonth,
          };
        });

      const totalDiscount = subsData.reduce((acc, s) => acc + s.discountAmount, 0);
      let specialNotesText = '';

      if (totalDiscount > 0) {
        specialNotesText += `更新月の調整に伴い、初年度に限り${totalDiscount.toLocaleString()}円（税抜）の値引きを適用いたします。`;
      }

      subsData
        .filter((s) => s.bridgeAmount > 0)
        .forEach((s) => {
          if (specialNotesText) specialNotesText += '\n';
          specialNotesText += `初年度は更新月調整のため、${s.name}${s.gapMonths}か月(${s.bridgeStartMonth}～${s.bridgeEndMonth}月末)分の${s.bridgeAmount.toLocaleString()}円（税別）のご請求させていただきます。`;
        });

      const totalReq = getTotalRequestAmount();

      const baseProd = productMaster.find((p) => p.id === calcBaseSystem.productId);
      const subProds = calcSubSystems
        .map((s) => {
          const p = productMaster.find((p) => p.id === s.productId);
          return p ? { name: `${p.name} (${s.licenseCount || 1}台)` } : null;
        })
        .filter(Boolean);

      const allItemsPayload = [
        ...items,
        ...(baseProd ? [{ name: `${baseProd.name} (${calcBaseSystem.licenseCount}台)` }] : []),
        ...subProds,
      ];

      let real4CountVal: number | null = null;
      const isRealName = (name: string) => {
        const clean = (name || '')
          .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
          .toUpperCase();
        return clean.includes('REAL');
      };

      if (baseProd && isRealName(baseProd.name)) {
        real4CountVal = calcBaseSystem.licenseCount;
      } else {
        const realInSub = calcSubSystems.find((s) => {
          const p = productMaster.find((pm) => pm.id === s.productId);
          return p && isRealName(p.name);
        });
        if (realInSub) {
          real4CountVal = realInSub.licenseCount;
        }
      }

      const response = await fetch('/api/export-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerInfo,
          items: allItemsPayload,
          contractYear: calcBaseSystem.contractYear ?? calcBaseSystem.orderYear,
          contractMonth: calcBaseSystem.contractMonth ?? calcBaseSystem.orderMonth,
          contractAmount: totalReq,
          specialNotes: specialNotesText,
          real4Count: real4CountVal,
        }),
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {}
        throw new Error(
          errData?.error || errData?.details || '契約書の出力に失敗しました'
        );
      }

      const blob = await response.blob();
      const cYear = calcBaseSystem.contractYear ?? calcBaseSystem.orderYear;
      const cMonth = calcBaseSystem.contractMonth ?? calcBaseSystem.orderMonth;
      let compName = (customerInfo.companyName || '〇〇').trim();
      if (!compName.endsWith('様')) {
        compName = `${compName}様`;
      }
      saveAs(blob, `DL Care契約書_${compName}_${cYear}年${cMonth}月.docx`);
    } catch (err: any) {
      console.error(err);
      alert('契約書(Word)の生成に失敗しました。\n詳細: ' + (err.message || String(err)));
    }
  };

  // 見積書内容レンダリング関数（印刷時＆画面プレビュー共通）
  const renderEstimateSheet = () => (
    <>
      <div className={styles.printHeaderWrap} style={{ marginBottom: '20px' }}>
        <div
          className={styles.printDocTitle}
          style={{
            textAlign: 'center',
            fontSize: '22pt',
            letterSpacing: '0.8em',
            fontWeight: 'normal',
            marginBottom: '40px',
            marginTop: '10px',
          }}
        >
          御　見　積　書
        </div>

        <div
          className={styles.printInfoGrid}
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <div className={styles.printCustomerBlock} style={{ width: '55%' }}>
            <div
              className={styles.customerName}
              style={{
                fontSize: '16pt',
                borderBottom: '1px solid black',
                paddingBottom: '4px',
                marginBottom: '12px',
              }}
            >
              {customerInfo.companyName} 御中
            </div>
            <table
              className={styles.customerMetaTable}
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '15px',
                fontSize: '10.5pt',
              }}
            >
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', width: '110px', padding: '3px 0' }}>
                    住所
                  </td>
                  <td style={{ padding: '3px 0' }}>
                    〒{customerInfo.postalCode}
                    <br />
                    {customerInfo.address}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>納入場所</td>
                  <td style={{ padding: '3px 0' }}>{customerInfo.deliveryPlace}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>見積有効期限</td>
                  <td style={{ padding: '3px 0' }}>{customerInfo.validity}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>納入期限</td>
                  <td style={{ padding: '3px 0' }}>別途御打合わせ</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>支払条件</td>
                  <td style={{ padding: '3px 0' }}>{customerInfo.paymentTerms}</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.greetingText} style={{ marginTop: '20px', fontSize: '11pt' }}>
              下記の通りお見積申し上げます。
            </div>
          </div>
          <div
            className={styles.printSenderBlock}
            style={{ width: '40%', textAlign: 'right' }}
          >
            <div
              className={styles.printDateLine}
              style={{ textAlign: 'right', fontSize: '10pt', marginBottom: '20px' }}
            >
              <span style={{ marginRight: '16px' }}>NO. </span>
              <span>日付 {date}</span>
            </div>
            <img
              src="/会社名.png"
              alt="会社名"
              className={styles.printCompanyLogo}
              style={{ maxWidth: '220px', maxHeight: '100px', objectFit: 'contain' }}
            />
            {customerInfo.personInCharge && (
              <div
                className={styles.printPersonInCharge}
                style={{ marginTop: '20px', fontSize: '11pt' }}
              >
                担当：{customerInfo.personInCharge}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={styles.printTotalEstimate}
        style={{
          margin: '30px 0 10px',
          display: 'flex',
          alignItems: 'flex-end',
          borderBottom: '1px solid black',
          paddingBottom: '4px',
        }}
      >
        <div style={{ fontSize: '14pt', marginRight: '30px', marginBottom: '2px' }}>
          御見積金額 (税込)
        </div>
        <div
          className={styles.printTotalAmount}
          style={{
            fontSize: '20pt',
            fontWeight: 'bold',
            letterSpacing: '2px',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          ¥{total.toLocaleString()}-
        </div>
      </div>

      <table
        className={styles.printMainTable}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
          borderTop: '1.5px solid black',
          borderBottom: '1.5px solid black',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                width: '5%',
                border: '0.5pt solid #555',
                padding: '6px 8px',
                backgroundColor: '#f3f3f3',
                textAlign: 'center',
                fontWeight: 'normal',
              }}
            >
              NO
            </th>
            <th
              style={{
                width: '45%',
                border: '0.5pt solid #555',
                padding: '6px 8px',
                backgroundColor: '#f3f3f3',
                textAlign: 'center',
                fontWeight: 'normal',
              }}
            >
              品　　　　名
            </th>
            <th
              style={{
                width: '8%',
                border: '0.5pt solid #555',
                padding: '6px 8px',
                backgroundColor: '#f3f3f3',
                textAlign: 'center',
                fontWeight: 'normal',
              }}
            >
              数　量
            </th>
            <th
              style={{
                width: '13%',
                border: '0.5pt solid #555',
                padding: '6px 8px',
                backgroundColor: '#f3f3f3',
                textAlign: 'center',
                fontWeight: 'normal',
              }}
            >
              単　　価
            </th>
            <th
              style={{
                width: '14%',
                border: '0.5pt solid #555',
                padding: '6px 8px',
                backgroundColor: '#f3f3f3',
                textAlign: 'center',
                fontWeight: 'normal',
              }}
            >
              金　　額
            </th>
            <th
              style={{
                width: '15%',
                border: '0.5pt solid #555',
                padding: '6px 8px',
                backgroundColor: '#f3f3f3',
                textAlign: 'center',
                fontWeight: 'normal',
              }}
            >
              備　考
            </th>
          </tr>
        </thead>
        <tbody>
          {estimateMode === 'dlcare' ? (
            <>
              <tr>
                <td
                  className={styles.textCenter}
                  style={{ border: '0.5pt solid #555', padding: '6px 8px', textAlign: 'center' }}
                >
                  1
                </td>
                <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}>
                  ソフトウェア保守サービス DL Care(年額）
                </td>
                <td
                  className={styles.textCenter}
                  style={{ border: '0.5pt solid #555', padding: '6px 8px', textAlign: 'center' }}
                >
                  1
                </td>
                <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}></td>
                <td
                  className={styles.textRight}
                  style={{ border: '0.5pt solid #555', padding: '6px 8px', textAlign: 'right' }}
                ></td>
                <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}></td>
              </tr>
              <tr>
                <td
                  className={styles.textCenter}
                  style={{ border: '0.5pt solid #555', padding: '6px 8px', textAlign: 'center' }}
                >
                  2
                </td>
                <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}>
                  【内訳（対象ソフトウェア）】
                </td>
                <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}></td>
                <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}></td>
                <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}></td>
                <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}></td>
              </tr>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td
                    className={styles.textCenter}
                    style={{
                      border: '0.5pt solid #555',
                      padding: '6px 8px',
                      textAlign: 'center',
                    }}
                  >
                    {index + 3}
                  </td>
                  <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}>
                    {formatDlCareRowName(item.name, index === items.length - 1)}
                  </td>
                  <td
                    className={styles.textCenter}
                    style={{
                      border: '0.5pt solid #555',
                      padding: '6px 8px',
                      textAlign: 'center',
                    }}
                  ></td>
                  <td
                    className={styles.textRight}
                    style={{
                      border: '0.5pt solid #555',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {item.price !== 0 ? item.price.toLocaleString() : ''}
                  </td>
                  <td
                    className={styles.textRight}
                    style={{
                      border: '0.5pt solid #555',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {item.price !== 0 ? item.price.toLocaleString() : ''}
                  </td>
                  <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}>
                    {item.remarks || ''}
                  </td>
                </tr>
              ))}
            </>
          ) : (
            items.map((item, index) => {
              const qtyDisplay =
                item.quantity && item.quantity > 0
                  ? `${item.quantity}${item.unit || ''}`
                  : '';
              const formatPrintNum = (n: number) => {
                if (!n) return '';
                if (n < 0) return `▲${Math.abs(n).toLocaleString()}`;
                return n.toLocaleString();
              };
              return (
                <tr key={item.id}>
                  <td
                    className={styles.textCenter}
                    style={{
                      border: '0.5pt solid #555',
                      padding: '6px 8px',
                      textAlign: 'center',
                    }}
                  >
                    {index + 1}
                  </td>
                  <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}>
                    {formatDlCareRowName(item.name, index === items.length - 1)}
                  </td>
                  <td
                    className={styles.textCenter}
                    style={{
                      border: '0.5pt solid #555',
                      padding: '6px 8px',
                      textAlign: 'center',
                    }}
                  >
                    {qtyDisplay}
                  </td>
                  <td
                    className={styles.textRight}
                    style={{
                      border: '0.5pt solid #555',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {formatPrintNum(item.unitPrice)}
                  </td>
                  <td
                    className={styles.textRight}
                    style={{
                      border: '0.5pt solid #555',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {formatPrintNum(item.price)}
                  </td>
                  <td style={{ border: '0.5pt solid #555', padding: '6px 8px' }}>
                    {item.remarks || ''}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div
        className={styles.printCalculations}
        style={{ width: '300px', marginLeft: 'auto', marginBottom: '30px' }}
      >
        <div
          className={styles.calcRow}
          style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}
        >
          <span>小　　　計</span>
          <span>{subtotal.toLocaleString()}円</span>
        </div>
        <div
          className={styles.calcRow}
          style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}
        >
          <span>消　費　税</span>
          <span>{tax.toLocaleString()}円</span>
        </div>
        <div
          className={styles.calcRowTotal}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '2px solid black',
            paddingTop: '8px',
            marginTop: '4px',
            fontWeight: 'bold',
          }}
        >
          <span>合　　　計</span>
          <span>{total.toLocaleString()}円</span>
        </div>
      </div>

      <div className={styles.printRemarksBox} style={{ marginTop: '40px' }}>
        <div className={styles.remarksTitle} style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          備　　考
        </div>
        <div className={styles.remarksContent} style={{ fontSize: '9.5pt', lineHeight: 1.6 }}>
          ・DL Careは年間契約（1年ごとの自動更新）となります。
          <br />
          ※正式なご契約は、別途契約書にて取り交わさせていただきます。
          <br />
          ・カスタム講習、入力代行サービスは都度お見積りの上、別途費用を頂きます。
          {autoDiscountNotes && (
            <div style={{ marginTop: '8px' }}>
              {autoDiscountNotes.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <main className={styles.container}>
      {/* --- Screen UI (Hidden in Print) --- */}
      <div className={styles.uiSection}>
        {/* 1. Sticky Top App Bar */}
        <nav className={styles.topNavbar}>
          <div className={styles.brandBlock}>
            <img
              src="/shokimitsu2-icon.svg"
              alt="ショキミツ2 アイコン"
              className={styles.brandLogoImg}
              width={40}
              height={40}
            />
            <div>
              <div className={styles.brandTitle}>ショキミツ2</div>
              <div className={styles.brandSub}>株式会社データロジック 見積・マスター管理</div>
            </div>
          </div>

          {/* Main Workspace Switcher Tabs */}
          <div className={styles.mainNavTabs}>
            <button
              type="button"
              className={`${styles.mainNavTab} ${
                activeWorkspace === 'estimate' ? styles.mainNavTabActive : ''
              }`}
              onClick={() => setActiveWorkspace('estimate')}
            >
              <span>📝 見積書作成</span>
              {items.length > 0 && <span className={styles.navBadge}>{items.length}</span>}
            </button>

            <button
              type="button"
              className={`${styles.mainNavTab} ${
                activeWorkspace === 'master' ? styles.mainNavTabActive : ''
              }`}
              onClick={() => {
                setImportMessage(null);
                setActiveWorkspace('master');
              }}
            >
              <span>🗂️ 金額マスター・設定</span>
              <span className={styles.navBadge}>{productMaster.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.mainNavTab} ${
                activeWorkspace === 'preview' ? styles.mainNavTabActive : ''
              }`}
              onClick={() => setActiveWorkspace('preview')}
            >
              <span>👁️ 見積書プレビュー</span>
            </button>

            <button
              type="button"
              className={`${styles.mainNavTab} ${
                activeWorkspace === 'calculator' ? styles.mainNavTabActive : ''
              }`}
              onClick={() => {
                syncReal4CountToCalculator();
                setActiveWorkspace('calculator');
              }}
            >
              <span>🧮 保守一本化電卓</span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className={styles.topBarActions}>
            <div className={styles.liveTotalBadge}>
              <span className={styles.liveTotalLabel}>合計(税込)</span>
              <span className={styles.liveTotalValue}>¥{total.toLocaleString()}</span>
            </div>

            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnPrimary}`}
              onClick={handlePrint}
            >
              🖨️ 印刷 / PDF出力
            </button>

            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnSuccess}`}
              onClick={handleExportExcel}
            >
              📊 Excel出力
            </button>

            <a
              href="https://docs.google.com/spreadsheets/d/1bJjoseWQniJzagf4AwawYiD4zHXR3Rf8pBmnrrZyFOU/edit"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.navBtn} ${styles.navBtnGhost}`}
              title="顧客マスタのGoogleスプレッドシートを開く"
            >
              🔗 顧客シート
            </a>

            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnGhost}`}
              onClick={() => {
                import('next-auth/react').then((m) => m.signOut({ callbackUrl: '/login' }));
              }}
              title="ログアウト"
            >
              🚪
            </button>
          </div>
        </nav>

        {/* =========================================================
            WORKSPACE 1: 📝 見積書作成 (Estimate Builder)
           ========================================================= */}
        {activeWorkspace === 'estimate' && (
          <div>
            {/* STEP 1: 宛先・見積基本情報カード（横並びで見やすいグリッド） */}
            <section className={styles.customerBannerCard}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.cardHeaderTitle}>
                  <span className={styles.stepBadge}>STEP 1</span>
                  <span>宛先・見積条件の設定</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div className={styles.modeSwitchGroup}>
                    <button
                      type="button"
                      className={`${styles.modeSwitchBtn} ${
                        estimateMode === 'standard' ? styles.modeSwitchBtnActive : ''
                      }`}
                      onClick={() => handleSwitchEstimateMode('standard')}
                    >
                      📄 通常見積モード（製品見積）
                    </button>
                    <button
                      type="button"
                      className={`${styles.modeSwitchBtn} ${
                        estimateMode === 'dlcare' ? styles.modeSwitchBtnActive : ''
                      }`}
                      onClick={() => handleSwitchEstimateMode('dlcare')}
                    >
                      🛡️ DL Care保守内訳モード
                    </button>
                  </div>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    発行日: {date}
                  </span>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => {
                      setMasterModalTab('staff');
                      setActiveWorkspace('master');
                    }}
                  >
                    👤 担当者リストを編集
                  </button>
                </div>
              </div>

              <div className={styles.customerFormGrid}>
                <div className={styles.fieldItem}>
                  <label className={styles.fieldLabel}>
                    <span>ファイルNo.</span>
                    <span className={styles.fieldHint}>自動検索</span>
                  </label>
                  <input
                    type="text"
                    className={styles.compactInput}
                    value={fileNo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFileNo(val);
                      setItems([]);
                      setAutoDiscountNotes('');
                      const matched = customers.find((c) => c.id === val);
                      if (matched) {
                        setCustomerInfo((prev) => {
                          const nextAddress = matched.address || prev.address;
                          const { detectedPref, staff } = resolveStaffFromAddress(
                            nextAddress,
                            prev.personInCharge
                          );
                          return {
                            ...prev,
                            companyName: formatCompanyName(matched.companyName),
                            postalCode: matched.postalCode || prev.postalCode,
                            address: nextAddress,
                            personInCharge: detectedPref !== null ? staff : prev.personInCharge,
                          };
                        });
                        setOwnedSoftware(mergeOwnedSoftware(matched.ownedSoftware || []));
                      }
                    }}
                    list="file-no-list"
                    placeholder="例: 1001"
                  />
                  <datalist id="file-no-list">
                    {customers.map((c, i) => (
                      <option key={`f-${i}`} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className={styles.fieldItem}>
                  <label className={styles.fieldLabel}>
                    <span>会社名（宛名）</span>
                    <span className={styles.fieldHint}>マスタ連携</span>
                  </label>
                  <input
                    type="text"
                    className={styles.compactInput}
                    value={customerInfo.companyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = customers.find((c) => c.companyName === val);
                      setCustomerInfo((prev) => {
                        const nextAddress = matched ? matched.address : prev.address;
                        const { detectedPref, staff } = matched
                          ? resolveStaffFromAddress(nextAddress, prev.personInCharge)
                          : { detectedPref: null, staff: prev.personInCharge };
                        return {
                          ...prev,
                          companyName: formatCompanyName(val),
                          postalCode: matched ? matched.postalCode : prev.postalCode,
                          address: nextAddress,
                          personInCharge: detectedPref !== null ? staff : prev.personInCharge,
                        };
                      });
                      if (matched) {
                        setFileNo(matched.id || '');
                        setOwnedSoftware(mergeOwnedSoftware(matched.ownedSoftware || []));
                        setItems([]);
                        setAutoDiscountNotes('');
                      }
                    }}
                    list="customer-list"
                  />
                  <datalist id="customer-list">
                    {customers.map((c, i) => (
                      <option key={i} value={c.companyName}>
                        {c.furigana ? `(${c.furigana})` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className={styles.fieldItem}>
                  <label className={styles.fieldLabel}>郵便番号</label>
                  <input
                    type="text"
                    className={styles.compactInput}
                    value={customerInfo.postalCode}
                    onChange={(e) => updateCustomerInfo('postalCode', e.target.value)}
                  />
                </div>

                <div className={styles.fieldItem}>
                  <label className={styles.fieldLabel}>
                    <span>住所</span>
                    <span className={styles.fieldHint}>担当者自動判定</span>
                  </label>
                  <input
                    type="text"
                    className={styles.compactInput}
                    value={customerInfo.address}
                    onChange={(e) => updateCustomerInfo('address', e.target.value)}
                  />
                </div>

                <div className={styles.fieldItem}>
                  <label className={styles.fieldLabel}>納入場所</label>
                  <input
                    type="text"
                    className={styles.compactInput}
                    value={customerInfo.deliveryPlace}
                    onChange={(e) => updateCustomerInfo('deliveryPlace', e.target.value)}
                  />
                </div>

                <div className={styles.fieldItem}>
                  <label className={styles.fieldLabel}>有効期限</label>
                  <input
                    type="text"
                    className={styles.compactInput}
                    value={customerInfo.validity}
                    onChange={(e) => updateCustomerInfo('validity', e.target.value)}
                  />
                </div>

                <div className={styles.fieldItem}>
                  <label className={styles.fieldLabel}>支払条件</label>
                  <input
                    type="text"
                    className={styles.compactInput}
                    value={customerInfo.paymentTerms}
                    onChange={(e) => updateCustomerInfo('paymentTerms', e.target.value)}
                  />
                </div>

                <div className={styles.fieldItem}>
                  <label className={styles.fieldLabel}>
                    <span>担当者</span>
                    <span className={styles.fieldHint}>
                      {detectPrefectureFromAddress(customerInfo.address)
                        ? `${detectPrefectureFromAddress(customerInfo.address)}連動`
                        : '住所連動'}
                    </span>
                  </label>
                  <select
                    className={styles.compactInput}
                    value={customerInfo.personInCharge}
                    onChange={(e) => updateCustomerInfo('personInCharge', e.target.value)}
                  >
                    <option value="">未選択</option>
                    {staffMaster.map((staff, idx) => (
                      <option key={idx} value={staff}>
                        {staff}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 顧客の所持ソフト・台数バー（DL Care保守内訳追加） */}
              {ownedSoftware.length > 0 && (
                <div className={styles.ownedSoftwareBar}>
                  <span className={styles.ownedSoftwareTitle}>
                    💡 顧客の所持ソフト（クリックでDL Care保守内訳に追加）：
                  </span>
                  {ownedSoftware.map((sw, i) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.ownedSwChip}
                      onClick={() => addSoftwareToEstimate(sw)}
                    >
                      <span>
                        ＋ {sw.name} ({sw.count}
                        {sw.count.includes('台') ? '' : '台'})
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                    style={{ padding: '4px 12px', fontSize: '0.76rem', marginLeft: 'auto' }}
                    onClick={addAllOwnedSoftwareToDlCare}
                  >
                    🛡️ 所持ソフトをすべてDL Care保守内訳に一括セット
                  </button>
                </div>
              )}
            </section>

            {/* STEP 2: 2ペイン構成（左：製品カタログ / 右：見積明細テーブル） */}
            <div className={styles.builderSplitGrid}>
              {/* 左ペイン：製品カタログ（ワンクリック追加） */}
              <aside className={styles.catalogPanel}>
                <div className={styles.catalogHeader}>
                  <span className={styles.catalogHeaderTitle}>
                    {estimateMode === 'dlcare'
                      ? '🛡️ DL Care保守内訳マスタ'
                      : '📦 製品カタログ（クリックで追加）'}
                  </span>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    onClick={() => {
                      setMasterModalTab('list');
                      setActiveWorkspace('master');
                    }}
                  >
                    ⚙️ 単価設定
                  </button>
                </div>

                <div className={styles.catalogSearchBox}>
                  <input
                    type="text"
                    className={styles.compactInput}
                    placeholder={
                      estimateMode === 'dlcare'
                        ? '🔍 保守対象ソフトを検索（REAL4, NC...）'
                        : '🔍 製品名・備考で検索（REAL4, 生産計画...）'
                    }
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                  />
                </div>

                {estimateMode === 'dlcare' ? (
                  <div className={styles.catalogCatList}>
                    <span className={`${styles.catFilterBtn} ${styles.catFilterBtnActive}`}>
                      🛡️ DL Care 保守対象ソフトウェア（年額保守）
                    </span>
                  </div>
                ) : (
                  <div className={styles.catalogCatList}>
                    {['すべて', ...allCategories]
                      .filter((cat) => cat !== 'DL Care保守内訳')
                      .map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`${styles.catFilterBtn} ${
                            quickCategory === cat ? styles.catFilterBtnActive : ''
                          }`}
                          onClick={() => setQuickCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                  </div>
                )}

                <div className={styles.catalogItemList}>
                  {filteredMasterForQuickBar.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      className={styles.catalogItemBtn}
                      onClick={() => addMasterProductToEstimate(prod)}
                    >
                      <div className={styles.catalogItemLeft}>
                        <span className={styles.catalogItemCatBadge}>
                          {isDlCareProduct(prod)
                            ? prod.type === 'tiered'
                              ? 'DL Care（階段価格 +3万/台）'
                              : prod.hidePrice
                              ? 'DL Care（金額非表示）'
                              : 'DL Care（年額固定）'
                            : prod.category}
                        </span>
                        <div className={styles.catalogItemName}>
                          ＋ {isDlCareProduct(prod) ? `┣${prod.name}` : prod.name}
                        </div>
                        {prod.remarks && (
                          <div className={styles.catalogItemRemarks}>{prod.remarks}</div>
                        )}
                      </div>
                      <div className={styles.catalogItemRight}>
                        <div className={styles.catalogItemPrice}>
                          {prod.hidePrice ? '¥0 (非表示)' : `¥${prod.basePrice.toLocaleString()}`}
                        </div>
                        <div className={styles.catalogItemUnit}>
                          {isDlCareProduct(prod) ? '/ 年額' : `/ ${prod.unit}`}
                        </div>
                      </div>
                    </button>
                  ))}

                  {filteredMasterForQuickBar.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '24px 12px',
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                      }}
                    >
                      該当する製品がありません
                    </div>
                  )}
                </div>

                <div className={styles.catalogFooter}>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
                    onClick={() => {
                      setMasterModalTab('import');
                      setActiveWorkspace('master');
                    }}
                  >
                    📥 CSV / Excelコピペで金額リストを一括登録
                  </button>
                </div>
              </aside>

              {/* 右ペイン：見積り明細テーブル */}
              <section className={styles.estimateMainCard}>
                <div className={styles.estimateCardTopBar}>
                  <div className={styles.cardHeaderTitle}>
                    <span className={styles.stepBadge}>STEP 2</span>
                    <span>
                      {estimateMode === 'dlcare'
                        ? '見積り明細の編集（DL Care保守内訳モード）'
                        : '見積り明細の編集（通常製品見積モード）'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div className={styles.modeSwitchGroup}>
                      <button
                        type="button"
                        className={`${styles.modeSwitchBtn} ${
                          estimateMode === 'standard' ? styles.modeSwitchBtnActive : ''
                        }`}
                        onClick={() => handleSwitchEstimateMode('standard')}
                      >
                        📄 通常見積モード（製品見積）
                      </button>
                      <button
                        type="button"
                        className={`${styles.modeSwitchBtn} ${
                          estimateMode === 'dlcare' ? styles.modeSwitchBtnActive : ''
                        }`}
                        onClick={() => handleSwitchEstimateMode('dlcare')}
                      >
                        🛡️ DL Care保守内訳モード
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.toolbarBtn}
                      onClick={() => setActiveWorkspace('preview')}
                    >
                      👁️ 見積書イメージを確認
                    </button>
                  </div>
                </div>

                {/* 明細ヘッダー */}
                <div className={styles.estimateTableHeader}>
                  <div>No.</div>
                  <div>品目・製品名 / 備考（摘要）</div>
                  <div style={{ textAlign: 'center' }}>
                    {estimateMode === 'dlcare' ? '台数 (計算用)' : '数量・単位'}
                  </div>
                  <div style={{ textAlign: 'right' }}>単価 (税抜)</div>
                  <div style={{ textAlign: 'right' }}>金額 (税抜)</div>
                  <div style={{ textAlign: 'right' }}>操作</div>
                </div>

                {/* DL Care保守内訳モード時の1・2行目固定見出しプレビュー */}
                {estimateMode === 'dlcare' && (
                  <div
                    style={{
                      background: '#f0f7ff',
                      borderBottom: '1px solid #bfdbfe',
                      fontSize: '0.82rem',
                      color: '#1e3a8a',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '48px 1fr 125px 135px 135px 72px',
                        padding: '8px 16px',
                        borderBottom: '1px dashed #bfdbfe',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div style={{ textAlign: 'center', fontWeight: 700 }}>1</div>
                      <div style={{ fontWeight: 700 }}>
                        ソフトウェア保守サービス DL Care(年額）
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '0.72rem',
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          見積書1行目に自動印字
                        </span>
                      </div>
                      <div style={{ textAlign: 'center', fontWeight: 700 }}>1</div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '48px 1fr 125px 135px 135px 72px',
                        padding: '8px 16px',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div style={{ textAlign: 'center', fontWeight: 700 }}>2</div>
                      <div style={{ fontWeight: 700 }}>
                        【内訳（対象ソフトウェア）】
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '0.72rem',
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          見積書2行目に自動印字
                        </span>
                      </div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                  </div>
                )}

                {/* 明細行 */}
                {items.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '48px 20px',
                      color: 'var(--text-muted)',
                      fontSize: '0.9rem',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>👈</div>
                    {estimateMode === 'dlcare' ? (
                      <>
                        上の「💡 顧客の所持ソフト」または左側の「🛡️ DL Care保守内訳マスタ」をクリックして
                        <br />
                        保守対象ソフトウェアを追加してください。
                      </>
                    ) : (
                      <>
                        左側の「📦 製品カタログ」をクリックして製品を追加するか、
                        <br />
                        下の「＋ 自由入力行を追加」ボタンから明細を作成してください。
                      </>
                    )}
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`${styles.estimateRow} ${
                        item.rowType === 'discount' ? styles.estimateRowDiscount : ''
                      }`}
                    >
                      {/* No. & 上下移動 */}
                      <div className={styles.rowIndexCell}>
                        <div className={styles.moveControls}>
                          <button
                            className={styles.moveBtn}
                            onClick={() => moveItemUp(index)}
                            disabled={index === 0}
                            title="上へ移動"
                          >
                            ▲
                          </button>
                          <button
                            className={styles.moveBtn}
                            onClick={() => moveItemDown(index)}
                            disabled={index === items.length - 1}
                            title="下へ移動"
                          >
                            ▼
                          </button>
                        </div>
                        <span className={styles.rowNumberBadge}>
                          {estimateMode === 'dlcare' ? index + 3 : index + 1}
                        </span>
                      </div>

                      {/* 品目名 & マスタ選択 + 備考 */}
                      <div className={styles.itemMainCell}>
                        <div className={styles.itemTitleLine}>
                          <select
                            className={styles.masterQuickSelect}
                            value={item.productId}
                            onChange={(e) =>
                              updateItem(item.id, 'productSelect', e.target.value)
                            }
                            title="マスターから製品を選択して自動セット"
                          >
                            <option value="">
                              {item.rowType === 'discount'
                                ? '🔻 値引き行'
                                : estimateMode === 'dlcare'
                                ? '🛡️ 保守マスタ選択...'
                                : '📚 マスタ選択...'}
                            </option>
                            {estimateMode === 'dlcare' ? (
                              <optgroup label="DL Care保守内訳マスタ">
                                {dlCareMasterList.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (
                                    {p.hidePrice
                                      ? '金額非表示'
                                      : `年額¥${p.basePrice.toLocaleString()}`}
                                    )
                                  </option>
                                ))}
                              </optgroup>
                            ) : (
                              allCategories
                                .filter((cat) => cat !== 'DL Care保守内訳')
                                .map((cat) => {
                                  const catProducts = standardMasterList.filter(
                                    (p) => p.category === cat
                                  );
                                  if (catProducts.length === 0) return null;
                                  return (
                                    <optgroup key={cat} label={cat}>
                                      {catProducts.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name} (¥{p.basePrice.toLocaleString()}/{p.unit})
                                        </option>
                                      ))}
                                    </optgroup>
                                  );
                                })
                            )}
                          </select>

                          <input
                            type="text"
                            className={styles.cleanInput}
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder={
                              item.rowType === 'discount'
                                ? '一式お値引き'
                                : estimateMode === 'dlcare'
                                ? '┣S/F REAL4 (120,000)'
                                : '品目・製品名を入力（自由編集可）'
                            }
                          />
                        </div>

                        <input
                          type="text"
                          className={styles.remarksInlineInput}
                          value={item.remarks}
                          onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                          placeholder="備考・摘要テキスト（見積書の備考欄に印字されます）"
                        />
                      </div>

                      {/* 数量・単位 */}
                      <div className={styles.qtyUnitGroup}>
                        <input
                          type="number"
                          className={styles.qtyInput}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, 'quantity', Number(e.target.value))
                          }
                          min="0"
                          max="10000"
                          title="数量"
                        />
                        <input
                          type="text"
                          className={styles.unitInput}
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                          list="unit-options-list"
                          placeholder="式"
                          title="単位"
                        />
                      </div>

                      {/* 単価 */}
                      <div className={styles.currencyInputWrap}>
                        <span className={styles.currencySymbol}>¥</span>
                        <input
                          type="number"
                          className={styles.currencyInput}
                          style={{
                            color: item.unitPrice < 0 ? '#dc2626' : undefined,
                          }}
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.id, 'unitPrice', Number(e.target.value))
                          }
                          title="単価（変更すると金額も自動更新されます）"
                        />
                      </div>

                      {/* 金額 */}
                      <div className={styles.currencyInputWrap}>
                        <span className={styles.currencySymbol}>¥</span>
                        <input
                          type="number"
                          className={`${styles.currencyInput} ${
                            item.isAutoCalculated ? styles.autoCalcValue : ''
                          }`}
                          style={{
                            color: item.price < 0 ? '#dc2626' : undefined,
                          }}
                          value={item.price}
                          onChange={(e) =>
                            updateItem(item.id, 'price', Number(e.target.value))
                          }
                          title="金額（直接手入力で個別調整も可能）"
                        />
                      </div>

                      {/* 操作 */}
                      <div className={styles.rowActionsCell}>
                        <button
                          type="button"
                          className={`${styles.iconActionBtn} ${
                            item.price < 0 ? styles.iconActionBtnActive : ''
                          }`}
                          onClick={() => {
                            const invertedUnit = -item.unitPrice;
                            const invertedPrice = -item.price;
                            setItems((prev) =>
                              prev.map((it) =>
                                it.id === item.id
                                  ? {
                                      ...it,
                                      unitPrice: invertedUnit,
                                      price: invertedPrice,
                                      rowType: invertedPrice < 0 ? 'discount' : 'normal',
                                    }
                                  : it
                              )
                            );
                          }}
                          title={
                            item.price < 0
                              ? '値引きを解除して通常金額に戻す'
                              : 'この行を値引き（マイナス金額）にする'
                          }
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className={styles.iconDeleteBtn}
                          onClick={() => removeItem(item.id)}
                          title="この行を削除"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* 明細追加ツールバー */}
                <div className={styles.tableFooterToolbar}>
                  <div className={styles.toolbarBtnGroup}>
                    <button type="button" className={styles.toolbarBtn} onClick={addFreeItem}>
                      ＋ 自由入力行を追加
                    </button>
                    <button
                      type="button"
                      className={`${styles.toolbarBtn} ${styles.toolbarBtnDiscount}`}
                      onClick={addDiscountItem}
                    >
                      🔻 一式値引き行を追加
                    </button>
                  </div>

                  {items.length > 0 && (
                    <button
                      type="button"
                      className={styles.toolbarBtn}
                      style={{ color: '#64748b', fontSize: '0.76rem' }}
                      onClick={() => {
                        if (window.confirm('見積り明細をすべてクリアしますか？')) {
                          setItems([]);
                        }
                      }}
                    >
                      🗑️ 明細をすべてクリア
                    </button>
                  )}
                </div>

                {/* 合計金額サマリー */}
                <div className={styles.estimateSummaryFooter}>
                  <div className={styles.summaryBox}>
                    {discountTotal < 0 && (
                      <>
                        <div className={styles.summaryRow}>
                          <span>明細計（値引前）</span>
                          <span>¥{positiveSubtotal.toLocaleString()}</span>
                        </div>
                        <div
                          className={styles.summaryRow}
                          style={{ color: '#dc2626', fontWeight: 700 }}
                        >
                          <span>お値引き合計</span>
                          <span>▲¥{Math.abs(discountTotal).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div className={styles.summaryRow}>
                      <span>小計 (税抜)</span>
                      <span style={{ fontWeight: 700 }}>¥{subtotal.toLocaleString()}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>消費税 (10%)</span>
                      <span>¥{tax.toLocaleString()}</span>
                    </div>
                    <div className={styles.summaryTotal}>
                      <span>御見積合計 (税込)</span>
                      <span>¥{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* =========================================================
            WORKSPACE 2: 🗂️ 金額マスター・設定 (Full-Screen Master & Settings)
           ========================================================= */}
        {activeWorkspace === 'master' && (
          <div className={styles.settingsWorkspace}>
            <div className={styles.settingsSubNav}>
              <div className={styles.modalTabs}>
                <button
                  type="button"
                  className={`${styles.modalTabBtn} ${
                    masterModalTab === 'list' ? styles.modalTabBtnActive : ''
                  }`}
                  onClick={() => setMasterModalTab('list')}
                >
                  📦 製品・金額マスター管理 ({productMaster.length}件)
                </button>
                <button
                  type="button"
                  className={`${styles.modalTabBtn} ${
                    masterModalTab === 'import' ? styles.modalTabBtnActive : ''
                  }`}
                  onClick={() => setMasterModalTab('import')}
                >
                  📥 CSVファイル / Excelコピペ一括登録
                </button>
                <button
                  type="button"
                  className={`${styles.modalTabBtn} ${
                    masterModalTab === 'staff' ? styles.modalTabBtnActive : ''
                  }`}
                  onClick={() => setMasterModalTab('staff')}
                >
                  👤 担当者マスター設定 ({staffMaster.length}名)
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#059669',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '4px 10px',
                    borderRadius: '99px',
                    fontWeight: 600,
                  }}
                >
                  ✓ 変更内容はブラウザに自動保存されます
                </span>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                  onClick={() => setActiveWorkspace('estimate')}
                >
                  ← 見積作成画面へ戻る
                </button>
              </div>
            </div>

            <div className={styles.settingsBody}>
              {/* Sub-tab 1: 製品・金額マスター一覧＆編集 */}
              {masterModalTab === 'list' && (
                <div>
                  {/* クイック新規追加バー */}
                  <div className={styles.quickAddMasterBar}>
                    <div className={styles.quickAddMasterTitle}>
                      <span>➕ 新しい製品・品目をマスターへ追加</span>
                    </div>
                    <div className={styles.quickAddMasterGrid}>
                      <input
                        type="text"
                        className={styles.compactInput}
                        list="master-category-list"
                        placeholder="カテゴリ（例: CAD・BIM系）"
                        value={newMasterDraft.category}
                        onChange={(e) =>
                          setNewMasterDraft({ ...newMasterDraft, category: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className={styles.compactInput}
                        placeholder="製品・品目名（例: S/F REAL4 オプション）"
                        value={newMasterDraft.name}
                        onChange={(e) =>
                          setNewMasterDraft({ ...newMasterDraft, name: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        className={styles.compactInput}
                        placeholder="標準単価 (¥)"
                        value={newMasterDraft.basePrice || ''}
                        onChange={(e) =>
                          setNewMasterDraft({
                            ...newMasterDraft,
                            basePrice: Number(e.target.value),
                          })
                        }
                      />
                      <input
                        type="text"
                        className={styles.compactInput}
                        list="unit-options-list"
                        placeholder="単位（式/本）"
                        value={newMasterDraft.unit}
                        onChange={(e) =>
                          setNewMasterDraft({ ...newMasterDraft, unit: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className={styles.compactInput}
                        placeholder="標準の備考・摘要テキスト"
                        value={newMasterDraft.remarks}
                        onChange={(e) =>
                          setNewMasterDraft({ ...newMasterDraft, remarks: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                        style={{ justifyContent: 'center' }}
                        onClick={handleQuickAddMaster}
                        disabled={!newMasterDraft.name.trim()}
                      >
                        ＋ 追加登録
                      </button>
                    </div>
                  </div>

                  {/* カテゴリフィルタ & 検索・アクションバー */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <div className={styles.categoryPills}>
                      {['すべて', ...allCategories].map((cat) => {
                        const count =
                          cat === 'すべて'
                            ? productMaster.length
                            : productMaster.filter((p) => p.category === cat).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            className={`${styles.categoryPill} ${
                              masterCategoryFilter === cat ? styles.categoryPillActive : ''
                            }`}
                            onClick={() => setMasterCategoryFilter(cat)}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className={styles.compactInput}
                        style={{ width: '240px' }}
                        placeholder="🔍 製品名・備考で絞り込み..."
                        value={masterSearchQuery}
                        onChange={(e) => setMasterSearchQuery(e.target.value)}
                      />

                      <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={handleExportMasterCsv}
                      >
                        📤 CSVエクスポート
                      </button>

                      <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={() => {
                          if (
                            window.confirm(
                              '金額マスターを初期サンプルデータ（データロジック製品一式）にリセットしますか？'
                            )
                          ) {
                            saveProductMaster(DEFAULT_PRODUCT_MASTER);
                          }
                        }}
                      >
                        🔄 初期データに戻す
                      </button>
                    </div>
                  </div>

                  {/* マスター編集テーブル */}
                  <div className={styles.masterTableWrapper}>
                    <table className={styles.masterTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '48px' }}>順序</th>
                          <th style={{ width: '175px' }}>カテゴリ</th>
                          <th style={{ width: '240px' }}>製品・品目名</th>
                          <th style={{ width: '145px' }}>標準単価 (税抜)</th>
                          <th style={{ width: '110px' }}>単位</th>
                          <th>備考（標準の摘要テキスト）</th>
                          <th style={{ width: '150px' }}>計算方式</th>
                          <th style={{ width: '56px', textAlign: 'center' }}>削除</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMasterForModal.map((prod) => (
                          <tr key={prod.id}>
                            <td>
                              <div className={styles.moveControls}>
                                <button
                                  type="button"
                                  className={styles.moveBtn}
                                  onClick={() => moveMasterUp(prod.id)}
                                  title="上へ移動"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  className={styles.moveBtn}
                                  onClick={() => moveMasterDown(prod.id)}
                                  title="下へ移動"
                                >
                                  ▼
                                </button>
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.compactInput}
                                value={prod.category || ''}
                                list="master-category-list"
                                onChange={(e) =>
                                  updateMasterField(prod.id, 'category', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.compactInput}
                                style={{ fontWeight: 600 }}
                                value={prod.name}
                                onChange={(e) =>
                                  updateMasterField(prod.id, 'name', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <div className={styles.currencyInputWrap}>
                                <span className={styles.currencySymbol}>¥</span>
                                <input
                                  type="number"
                                  className={styles.currencyInput}
                                  value={prod.basePrice}
                                  onChange={(e) =>
                                    updateMasterField(
                                      prod.id,
                                      'basePrice',
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.compactInput}
                                style={{ textAlign: 'center' }}
                                value={prod.unit || '式'}
                                list="unit-options-list"
                                onChange={(e) =>
                                  updateMasterField(prod.id, 'unit', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.compactInput}
                                value={prod.remarks || ''}
                                placeholder="標準の摘要テキスト..."
                                onChange={(e) =>
                                  updateMasterField(prod.id, 'remarks', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <select
                                className={styles.compactInput}
                                value={prod.hidePrice ? 'hide' : prod.type}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const next = productMaster.map((p) => {
                                    if (p.id !== prod.id) return p;
                                    if (val === 'hide') {
                                      return { ...p, type: 'flat' as const, hidePrice: true };
                                    }
                                    return {
                                      ...p,
                                      type: val as 'flat' | 'tiered',
                                      hidePrice: false,
                                    };
                                  });
                                  saveProductMaster(next);
                                }}
                              >
                                <option value="flat">標準 (単価×数量)</option>
                                <option value="tiered">階段価格 (+3万/台)</option>
                                <option value="hide">金額非表示 (0円)</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => {
                                  saveProductMaster(
                                    productMaster.filter((p) => p.id !== prod.id)
                                  );
                                }}
                                title="削除"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: CSV / Excelコピペ一括登録 */}
              {masterModalTab === 'import' && (
                <div>
                  {importMessage && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        backgroundColor:
                          importMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        border: `1px solid ${
                          importMessage.type === 'success' ? '#10b981' : '#ef4444'
                        }`,
                        color: importMessage.type === 'success' ? '#047857' : '#b91c1c',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                      }}
                    >
                      {importMessage.text}
                    </div>
                  )}

                  <div className={styles.importBox}>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: '10px', fontWeight: 700 }}>
                      ① 反映モードの選択
                    </h3>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          fontSize: '0.88rem',
                        }}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                        />
                        <span>
                          <strong>既存マスターに追記・同名品目を更新（推奨）</strong>
                        </span>
                      </label>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          fontSize: '0.88rem',
                        }}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                        />
                        <span>
                          <strong>既存マスターをすべてクリアして入れ替え</strong>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.importSplitGrid}>
                    <div>
                      <div className={styles.importBox}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}
                        >
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                            ② CSVファイルから一括アップロード
                          </h3>
                          <button
                            type="button"
                            className={styles.toolbarBtn}
                            onClick={handleDownloadSampleCsv}
                          >
                            📄 ひな形CSVをダウンロード
                          </button>
                        </div>
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                          }}
                        >
                          Excelから保存したCSV（Shift-JIS / UTF-8）を選択すると即座に取り込まれます。
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.tsv,.txt"
                          className={styles.compactInput}
                          onChange={handleCsvFileUpload}
                        />
                      </div>

                      <div className={styles.importBox} style={{ marginBottom: 0 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>
                          ③ Excel・スプレッドシートからコピー＆ペースト
                        </h3>
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            marginBottom: '10px',
                          }}
                        >
                          Excelの表（<code>カテゴリ / 製品・品目名 / 標準単価 / 単位 / 備考</code>
                          ）をコピーして下に貼り付けると、右側にプレビューが表示されます。
                        </p>
                        <textarea
                          className={styles.compactInput}
                          rows={7}
                          style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
                          placeholder={`CAD・BIM系\tS/F REAL4\t2500000\tライセンス\t鉄骨専用3次元CADシステム\n計画・管理系\tS/F 生産計画\t1200000\t式\t工場工程・負荷計画管理システム`}
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                        />
                        <div
                          style={{
                            marginTop: '12px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            type="button"
                            className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                            onClick={handlePasteImport}
                            disabled={pastedPreviewItems.length === 0}
                          >
                            📥 プレビュー中の {pastedPreviewItems.length} 件を一括登録する
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 右側：リアルタイム取込プレビュー */}
                    <div className={styles.importBox} style={{ marginBottom: 0 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>
                        🔍 コピペ取込プレビュー ({pastedPreviewItems.length}件認識)
                      </h3>
                      {pastedPreviewItems.length === 0 ? (
                        <div
                          style={{
                            padding: '48px 20px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.84rem',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '8px',
                            background: '#ffffff',
                          }}
                        >
                          左のテキスト枠にExcelやスプレッドシートの行を貼り付けると、ここに認識結果がリアルタイム表示されます。
                        </div>
                      ) : (
                        <div
                          className={styles.masterTableWrapper}
                          style={{ maxHeight: '340px', overflowY: 'auto' }}
                        >
                          <table className={styles.masterTable} style={{ minWidth: '500px' }}>
                            <thead>
                              <tr>
                                <th>カテゴリ</th>
                                <th>製品・品目名</th>
                                <th style={{ textAlign: 'right' }}>標準単価</th>
                                <th>単位</th>
                                <th>備考</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pastedPreviewItems.map((p, idx) => (
                                <tr key={idx}>
                                  <td>{p.category}</td>
                                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                                  <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>
                                    ¥{p.basePrice.toLocaleString()}
                                  </td>
                                  <td>{p.unit}</td>
                                  <td>{p.remarks}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: 担当者マスタ設定 */}
              {masterModalTab === 'staff' && (
                <div className={styles.staffSplitGrid}>
                  <div>
                    <div className={styles.quickAddMasterBar}>
                      <div className={styles.quickAddMasterTitle}>➕ 新しい担当者を追加</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className={styles.compactInput}
                          placeholder="担当者名を入力（例: 山田）"
                          value={newStaffName}
                          onChange={(e) => setNewStaffName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newStaffName.trim()) {
                              saveStaffMaster([...staffMaster, newStaffName.trim()]);
                              setNewStaffName('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                          onClick={() => {
                            if (!newStaffName.trim()) return;
                            saveStaffMaster([...staffMaster, newStaffName.trim()]);
                            setNewStaffName('');
                          }}
                        >
                          ＋ 追加
                        </button>
                      </div>
                    </div>

                    <div className={styles.masterTableWrapper}>
                      <table className={styles.masterTable} style={{ minWidth: '280px' }}>
                        <thead>
                          <tr>
                            <th>担当者名（プルダウン表示）</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>削除</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffMaster.map((staff, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  type="text"
                                  className={styles.compactInput}
                                  value={staff}
                                  onChange={(e) => {
                                    const oldName = staffMaster[idx];
                                    const nextName = e.target.value;
                                    const newM = [...staffMaster];
                                    newM[idx] = nextName;
                                    saveStaffMaster(newM);

                                    if (oldName && oldName !== nextName) {
                                      const updatedMap = { ...prefectureStaffMap };
                                      let mapChanged = false;
                                      for (const k of Object.keys(updatedMap)) {
                                        if (updatedMap[k] === oldName) {
                                          updatedMap[k] = nextName;
                                          mapChanged = true;
                                        }
                                      }
                                      if (mapChanged) {
                                        savePrefectureStaffMap(updatedMap);
                                      }
                                      if (customerInfo.personInCharge === oldName) {
                                        setCustomerInfo((prev) => ({
                                          ...prev,
                                          personInCharge: nextName,
                                        }));
                                      }
                                    }
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  className={styles.removeBtn}
                                  onClick={() => {
                                    const removedName = staffMaster[idx];
                                    const newM = staffMaster.filter((_, i) => i !== idx);
                                    saveStaffMaster(newM);

                                    if (removedName) {
                                      const updatedMap = { ...prefectureStaffMap };
                                      let mapChanged = false;
                                      for (const k of Object.keys(updatedMap)) {
                                        if (updatedMap[k] === removedName) {
                                          updatedMap[k] = '';
                                          mapChanged = true;
                                        }
                                      }
                                      if (mapChanged) {
                                        savePrefectureStaffMap(updatedMap);
                                      }
                                      if (customerInfo.personInCharge === removedName) {
                                        setCustomerInfo((prev) => ({
                                          ...prev,
                                          personInCharge: '',
                                        }));
                                      }
                                    }
                                  }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 右側：都道府県別の担当者自動割当マスタ */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          🗺️ 都道府県別の担当者自動割当（住所連動）
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          顧客選択や住所入力時に、住所内の都道府県を見て自動で担当者をセットします。
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={() => {
                          if (
                            window.confirm('都道府県別の担当者割当を初期設定に戻しますか？')
                          ) {
                            savePrefectureStaffMap(DEFAULT_PREFECTURE_STAFF_MAP);
                          }
                        }}
                      >
                        🔄 初期割当に戻す
                      </button>
                    </div>

                    <div
                      className={styles.masterTableWrapper}
                      style={{ maxHeight: '540px', overflowY: 'auto' }}
                    >
                      <table className={styles.masterTable} style={{ minWidth: '420px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '130px' }}>地方区分</th>
                            <th style={{ width: '130px' }}>都道府県</th>
                            <th>自動セットされる担当者</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PREFECTURE_RULES.map((rule) => {
                            const currentStaff =
                              rule.prefecture in prefectureStaffMap
                                ? prefectureStaffMap[rule.prefecture]
                                : rule.defaultStaff;
                            return (
                              <tr key={rule.prefecture}>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                  {rule.region}
                                </td>
                                <td style={{ fontWeight: 700 }}>{rule.prefecture}</td>
                                <td>
                                  <select
                                    className={styles.compactInput}
                                    value={currentStaff}
                                    onChange={(e) => {
                                      const nextMap = {
                                        ...prefectureStaffMap,
                                        [rule.prefecture]: e.target.value,
                                      };
                                      savePrefectureStaffMap(nextMap);
                                    }}
                                  >
                                    <option value="">（未設定・空欄）</option>
                                    {staffMaster.map((s, idx) => (
                                      <option key={idx} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            WORKSPACE 3: 👁️ 見積書プレビュー (On-Screen Live A4 Preview)
           ========================================================= */}
        {activeWorkspace === 'preview' && (
          <div>
            <div
              style={{
                maxWidth: '860px',
                margin: '0 auto 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <button
                type="button"
                className={styles.navBtn}
                onClick={() => setActiveWorkspace('estimate')}
              >
                ← 明細の編集に戻る
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                  onClick={handlePrint}
                >
                  🖨️ この内容で印刷 / PDF出力
                </button>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.navBtnSuccess}`}
                  onClick={handleExportExcel}
                >
                  📊 Excelテンプレート出力
                </button>
              </div>
            </div>

            <div className={styles.previewPaperWrapper}>
              <div className={styles.previewPaperContainer}>{renderEstimateSheet()}</div>
            </div>
          </div>
        )}

        {/* =========================================================
            WORKSPACE 4: 🧮 保守一本化電卓 (DL Care Contract Calculator)
           ========================================================= */}
        {activeWorkspace === 'calculator' && (
          <div className={styles.settingsWorkspace}>
            <div className={styles.settingsSubNav}>
              <div style={{ padding: '14px 0' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  🧮 DL Care 保守契約一本化・充当額計算機
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                  onClick={handleExportContract}
                >
                  📝 契約書出力 (Word)
                </button>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => setActiveWorkspace('estimate')}
                >
                  ← 見積作成画面へ戻る
                </button>
              </div>
            </div>

            <div className={styles.settingsBody}>
              <div className={styles.calculatorSplitGrid}>
                {/* 基準システム */}
                <div className={styles.importBox} style={{ background: '#ffffff' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', fontWeight: 700 }}>
                    【基準システム】 (新契約)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className={styles.formGroup}>
                      <label>対象システム</label>
                      <select
                        className={styles.compactInput}
                        value={calcBaseSystem.productId}
                        onChange={(e) =>
                          setCalcBaseSystem({ ...calcBaseSystem, productId: e.target.value })
                        }
                      >
                        <option value="">-- 未選択 --</option>
                        {dlCareMasterList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (年額: ¥{p.basePrice.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>ライセンス数 (台数)</label>
                      <input
                        type="number"
                        className={styles.compactInput}
                        value={calcBaseSystem.licenseCount}
                        onChange={(e) =>
                          setCalcBaseSystem({
                            ...calcBaseSystem,
                            licenseCount: Math.max(1, Number(e.target.value)),
                          })
                        }
                        min="1"
                      />
                    </div>
                    <div className={styles.calcDatePairRow}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>最新受注年月</label>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="number"
                            className={styles.compactInput}
                            value={calcBaseSystem.orderYear}
                            onChange={(e) =>
                              setCalcBaseSystem({
                                ...calcBaseSystem,
                                orderYear: Number(e.target.value),
                              })
                            }
                          />
                          <span>年</span>
                          <input
                            type="number"
                            className={styles.compactInput}
                            value={calcBaseSystem.orderMonth}
                            min="1"
                            max="12"
                            onChange={(e) =>
                              setCalcBaseSystem({
                                ...calcBaseSystem,
                                orderMonth: Number(e.target.value),
                              })
                            }
                          />
                          <span>月</span>
                        </div>
                      </div>

                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>契約年月</label>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="number"
                            className={styles.compactInput}
                            value={calcBaseSystem.contractYear ?? calcBaseSystem.orderYear}
                            onChange={(e) =>
                              setCalcBaseSystem({
                                ...calcBaseSystem,
                                contractYear: Number(e.target.value),
                              })
                            }
                          />
                          <span>年</span>
                          <input
                            type="number"
                            className={styles.compactInput}
                            value={calcBaseSystem.contractMonth ?? calcBaseSystem.orderMonth}
                            min="1"
                            max="12"
                            onChange={(e) =>
                              setCalcBaseSystem({
                                ...calcBaseSystem,
                                contractMonth: Number(e.target.value),
                              })
                            }
                          />
                          <span>月</span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '14px',
                        background: '#eff6ff',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600 }}>
                        新年度分 年額
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>
                        ¥
                        {(
                          calculatePrice(
                            calcBaseSystem.productId,
                            calcBaseSystem.licenseCount,
                            true,
                            undefined,
                            'dlcare'
                          ) || 0
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 統合対象システム */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {calcSubSystems.map((sub, idx) => {
                    const result = getSubCalcResult(sub);
                    return (
                      <div
                        key={sub.id}
                        className={styles.importBox}
                        style={{ background: '#ffffff', position: 'relative', marginBottom: 0 }}
                      >
                        {calcSubSystems.length > 1 && (
                          <button
                            className={styles.removeBtn}
                            style={{ position: 'absolute', top: '12px', right: '12px' }}
                            onClick={() =>
                              setCalcSubSystems(calcSubSystems.filter((s) => s.id !== sub.id))
                            }
                          >
                            ✕
                          </button>
                        )}
                        <h3
                          style={{
                            fontSize: '0.95rem',
                            marginBottom: '12px',
                            color: '#2563eb',
                            fontWeight: 700,
                          }}
                        >
                          【統合対象】 システム {idx + 1}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className={styles.formGroup}>
                            <label>対象システム</label>
                            <select
                              className={styles.compactInput}
                              value={sub.productId}
                              onChange={(e) => {
                                const newSubs = [...calcSubSystems];
                                newSubs[idx].productId = e.target.value;
                                setCalcSubSystems(newSubs);
                              }}
                            >
                              <option value="">-- 未選択 --</option>
                              {dlCareMasterList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (年額: ¥{p.basePrice.toLocaleString()})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.formGroup}>
                            <label>ライセンス数 (台数)</label>
                            <input
                              type="number"
                              className={styles.compactInput}
                              value={sub.licenseCount}
                              min="1"
                              onChange={(e) => {
                                const newSubs = [...calcSubSystems];
                                newSubs[idx].licenseCount = Math.max(1, Number(e.target.value));
                                setCalcSubSystems(newSubs);
                              }}
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>最新受注年月</label>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="number"
                                className={styles.compactInput}
                                value={sub.orderYear}
                                onChange={(e) => {
                                  const newSubs = [...calcSubSystems];
                                  newSubs[idx].orderYear = Number(e.target.value);
                                  setCalcSubSystems(newSubs);
                                }}
                              />
                              <span>年</span>
                              <input
                                type="number"
                                className={styles.compactInput}
                                value={sub.orderMonth}
                                min="1"
                                max="12"
                                onChange={(e) => {
                                  const newSubs = [...calcSubSystems];
                                  newSubs[idx].orderMonth = Number(e.target.value);
                                  setCalcSubSystems(newSubs);
                                }}
                              />
                              <span>月</span>
                            </div>
                          </div>

                          {sub.productId && (
                            <div
                              style={{
                                padding: '12px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.85rem',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  marginBottom: '4px',
                                }}
                              >
                                <span>・月単価:</span>
                                <span>¥{result.monthlyPrice.toLocaleString()} / 月</span>
                              </div>
                              {result.overlapMonths > 0 && (
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    color: '#dc2626',
                                    fontWeight: 700,
                                  }}
                                >
                                  <span>・重複期間 ({result.overlapMonths}ヶ月) 充当額:</span>
                                  <span>△ ¥{result.discountAmount.toLocaleString()}</span>
                                </div>
                              )}
                              {result.gapMonths > 0 && (
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    color: result.isBridgeFree ? '#059669' : '#2563eb',
                                    fontWeight: 700,
                                  }}
                                >
                                  <span>・調整期間 ({result.gapMonths}ヶ月) 加算額:</span>
                                  <span>
                                    {result.isBridgeFree
                                      ? '無償 (0円)'
                                      : `¥${result.bridgeAmount.toLocaleString()}`}
                                  </span>
                                </div>
                              )}
                              <div
                                style={{
                                  borderTop: '1px dashed var(--border-color)',
                                  marginTop: '8px',
                                  paddingTop: '8px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontWeight: 800,
                                  fontSize: '1rem',
                                  color: '#2563eb',
                                }}
                              >
                                <span>新年度分 見積額:</span>
                                <span>¥{result.newYearPrice.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => {
                      setCalcSubSystems([
                        ...calcSubSystems,
                        {
                          id: Date.now().toString(),
                          productId: '',
                          licenseCount: 1,
                          orderYear: new Date().getFullYear(),
                          orderMonth: 6,
                        },
                      ]);
                    }}
                  >
                    ＋ 統合対象システムを追加
                  </button>
                </div>
              </div>

              {/* 【参考】保守統合による値引き計算と図解 */}
              <div
                style={{
                  marginTop: '24px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 18px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onClick={() => setShowOverlapReference(!showOverlapReference)}
                >
                  <span>📊 【参考】保守統合による値引き計算と図解</span>
                  <span>{showOverlapReference ? '▲' : '▼'}</span>
                </button>

                {showOverlapReference &&
                  (() => {
                    const baseP = productMaster.find(
                      (p) => p.id === calcBaseSystem.productId
                    ) || { name: '基準システム' };
                    const baseOrderTotal =
                      calcBaseSystem.orderYear * 12 + calcBaseSystem.orderMonth;
                    const baseUnifyTotal = baseOrderTotal + 12;

                    let maxTotal = baseUnifyTotal + 12;
                    const subsData = calcSubSystems
                      .filter((sub) => sub.productId)
                      .map((sub) => {
                        const p = productMaster.find((pm) => pm.id === sub.productId);
                        const subOrderTotal = sub.orderYear * 12 + sub.orderMonth;
                        const subEndTotal = subOrderTotal + 12;
                        if (subEndTotal > maxTotal) maxTotal = subEndTotal;

                        const basePrice = p
                          ? calculatePrice(p.id, sub.licenseCount, true, undefined, 'dlcare')
                          : 0;
                        const monthlyPrice = Math.floor(basePrice / 12);
                        const diff = subEndTotal - baseUnifyTotal;

                        const overlapMonths = Math.max(0, diff);
                        const discountAmount = overlapMonths * monthlyPrice;

                        let gapMonths = 0;
                        let bridgeAmount = 0;
                        let bridgeStartMonth = 0;
                        let bridgeEndMonth = 0;

                        if (diff < 0) {
                          gapMonths = Math.abs(diff);
                          if (gapMonths > 3) {
                            bridgeAmount = gapMonths * monthlyPrice;
                          }
                          bridgeStartMonth = ((subEndTotal - 1) % 12) + 1;
                          bridgeEndMonth = ((baseUnifyTotal - 2) % 12) + 1;
                        }

                        return {
                          name: p ? p.name : '未選択',
                          subOrderTotal,
                          subEndTotal,
                          overlapMonths,
                          monthlyPrice,
                          discountAmount,
                          gapMonths,
                          bridgeAmount,
                          bridgeStartMonth,
                          bridgeEndMonth,
                        };
                      });

                    const duration = Math.max(24, maxTotal - baseOrderTotal);
                    const getPct = (tot: number) =>
                      Math.max(0, Math.min(100, ((tot - baseOrderTotal) / duration) * 100));
                    const fmtYm = (tot: number) => {
                      const y = Math.floor((tot - 1) / 12);
                      const m = ((tot - 1) % 12) + 1;
                      return `${y.toString().slice(-2)}/${m}`;
                    };

                    const totalDiscount = subsData.reduce(
                      (acc, s) => acc + s.discountAmount,
                      0
                    );

                    return (
                      <div
                        style={{
                          padding: '16px 18px',
                          borderTop: '1px solid var(--border-subtle)',
                        }}
                      >
                        {/* タイムライン図解 */}
                        <div
                          style={{
                            padding: '16px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            marginBottom: '16px',
                            overflowX: 'auto',
                          }}
                        >
                          <div
                            style={{
                              minWidth: '580px',
                              display: 'grid',
                              gridTemplateColumns: 'minmax(120px, auto) 1fr',
                              gap: '8px',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div></div>
                            <div
                              style={{
                                position: 'relative',
                                height: '20px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <span style={{ position: 'absolute', left: '0%' }}>
                                {fmtYm(baseOrderTotal)}
                              </span>
                              <span
                                style={{
                                  position: 'absolute',
                                  left: `${getPct(baseUnifyTotal)}%`,
                                  color: '#ef4444',
                                  fontWeight: 700,
                                  transform: 'translateX(-50%)',
                                }}
                              >
                                {fmtYm(baseUnifyTotal)}(統合)
                              </span>
                              {subsData.map((s, i) => (
                                <span
                                  key={i}
                                  style={{
                                    position: 'absolute',
                                    left: `${getPct(s.subOrderTotal)}%`,
                                  }}
                                >
                                  {fmtYm(s.subOrderTotal)}
                                </span>
                              ))}
                              {subsData.map((s, i) => (
                                <span
                                  key={'end' + i}
                                  style={{
                                    position: 'absolute',
                                    left: `${Math.min(95, getPct(s.subEndTotal))}%`,
                                  }}
                                >
                                  {fmtYm(s.subEndTotal)}
                                </span>
                              ))}
                            </div>

                            <div></div>
                            <div style={{ position: 'relative', height: '100%' }}>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${getPct(baseUnifyTotal)}%`,
                                  top: '-20px',
                                  width: '2px',
                                  height: `${100 + subsData.length * 70}px`,
                                  background: 'rgba(239, 68, 68, 0.35)',
                                  zIndex: 0,
                                }}
                              ></div>
                            </div>

                            <div
                              style={{
                                fontWeight: 700,
                                color: '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {baseP.name} <br />
                              (基準)
                            </div>
                            <div style={{ position: 'relative', height: '48px' }}>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '0%',
                                  top: '12px',
                                  width: `${getPct(baseUnifyTotal)}%`,
                                  height: '24px',
                                  background: '#94a3b8',
                                  borderRadius: '4px',
                                  color: '#fff',
                                  textAlign: 'center',
                                  lineHeight: '24px',
                                  zIndex: 1,
                                  overflow: 'hidden',
                                }}
                              >
                                既存契約
                              </div>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${getPct(baseUnifyTotal)}%`,
                                  top: '12px',
                                  width: `${
                                    getPct(baseUnifyTotal + 12) - getPct(baseUnifyTotal)
                                  }%`,
                                  height: '24px',
                                  background: '#2563eb',
                                  borderRadius: '4px',
                                  color: '#fff',
                                  textAlign: 'center',
                                  lineHeight: '24px',
                                  zIndex: 1,
                                  overflow: 'hidden',
                                }}
                              >
                                次期契約
                              </div>
                            </div>

                            {subsData.map((s, i) => {
                              const existingWidth =
                                getPct(baseUnifyTotal) - getPct(s.subOrderTotal);
                              const overlapWidth =
                                getPct(s.subEndTotal) - getPct(baseUnifyTotal);
                              return (
                                <div key={i} style={{ display: 'contents' }}>
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      color: '#0f172a',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {s.name}
                                  </div>
                                  <div style={{ position: 'relative', height: '64px' }}>
                                    {s.subOrderTotal < baseUnifyTotal && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${getPct(s.subOrderTotal)}%`,
                                          top: '4px',
                                          width: `${existingWidth}%`,
                                          height: '24px',
                                          background: '#cbd5e1',
                                          color: '#1e293b',
                                          borderRadius: '4px',
                                          textAlign: 'center',
                                          lineHeight: '24px',
                                          zIndex: 1,
                                          border: '1px dashed #64748b',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        既存
                                      </div>
                                    )}
                                    {s.overlapMonths > 0 && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${getPct(baseUnifyTotal)}%`,
                                          top: '4px',
                                          width: `${overlapWidth}%`,
                                          height: '24px',
                                          background: '#fca5a5',
                                          borderRadius: '4px',
                                          color: '#7f1d1d',
                                          textAlign: 'center',
                                          lineHeight: '24px',
                                          fontWeight: 700,
                                          zIndex: 2,
                                          overflow: 'hidden',
                                        }}
                                      >
                                        値引: {s.overlapMonths}ヶ月
                                      </div>
                                    )}
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: `${getPct(baseUnifyTotal)}%`,
                                        top: '32px',
                                        width: `${
                                          getPct(baseUnifyTotal + 12) - getPct(baseUnifyTotal)
                                        }%`,
                                        height: '24px',
                                        background: '#2563eb',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        textAlign: 'center',
                                        lineHeight: '24px',
                                        zIndex: 1,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      次期契約
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 内訳表＆契約書特約記載例 */}
                        <div style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                          <div className={styles.masterTableWrapper} style={{ marginBottom: '12px' }}>
                            <table
                              className={styles.masterTable}
                              style={{ minWidth: '500px' }}
                            >
                              <thead>
                                <tr>
                                  <th>対象システム</th>
                                  <th>重複期間 ({fmtYm(baseUnifyTotal)}〜)</th>
                                  <th>月単価</th>
                                  <th>充当（値引き）額</th>
                                </tr>
                              </thead>
                              <tbody>
                                {subsData.map((s, i) => (
                                  <tr key={i}>
                                    <td>{s.name}</td>
                                    <td>
                                      {s.overlapMonths}ヶ月分 (〜{fmtYm(s.subEndTotal)})
                                    </td>
                                    <td>¥{s.monthlyPrice.toLocaleString()}</td>
                                    <td style={{ color: '#dc2626', fontWeight: 700 }}>
                                      ¥{s.discountAmount.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                                <tr style={{ background: '#fef2f2' }}>
                                  <td
                                    colSpan={3}
                                    style={{ textAlign: 'right', fontWeight: 700 }}
                                  >
                                    合計充当額
                                  </td>
                                  <td
                                    style={{
                                      color: '#dc2626',
                                      fontWeight: 800,
                                      fontSize: '1rem',
                                    }}
                                  >
                                    ¥{totalDiscount.toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div
                            style={{
                              background: '#f8fafc',
                              padding: '12px 14px',
                              borderLeft: '4px solid #2563eb',
                              borderRadius: '0 6px 6px 0',
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                              【契約書の特約記載例】
                            </div>
                            {totalDiscount > 0 && (
                              <div
                                style={{
                                  marginBottom: subsData.some((s) => s.bridgeAmount > 0)
                                    ? '10px'
                                    : '0',
                                }}
                              >
                                <div>
                                  「更新月の調整に伴い、初年度に限り
                                  {totalDiscount.toLocaleString()}
                                  円（税抜）の値引きを適用いたします。」
                                </div>
                                <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                                  （※内訳：
                                  {subsData
                                    .filter((s) => s.discountAmount > 0)
                                    .map(
                                      (s) =>
                                        `${s.name}重複分 ${s.discountAmount.toLocaleString()}円`
                                    )
                                    .join('、')}
                                  ）
                                </div>
                              </div>
                            )}
                            {totalDiscount === 0 &&
                              !subsData.some((s) => s.bridgeAmount > 0) && (
                                <div style={{ color: 'var(--text-muted)' }}>
                                  特記事項はありません。
                                </div>
                              )}
                            {subsData
                              .filter((s) => s.bridgeAmount > 0)
                              .map((s, i) => (
                                <div key={i} style={{ marginTop: i > 0 ? '8px' : '0' }}>
                                  「初年度は更新月調整のため、{s.name}
                                  {s.gapMonths}か月({s.bridgeStartMonth}～{s.bridgeEndMonth}
                                  月末)分の{s.bridgeAmount.toLocaleString()}
                                  円（税別）のご請求させていただきます。」
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
              </div>

              <div
                style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af' }}>
                    {(() => {
                      const uTot =
                        calcBaseSystem.orderYear * 12 + calcBaseSystem.orderMonth + 12;
                      const uY = Math.floor((uTot - 1) / 12);
                      const uM = ((uTot - 1) % 12) + 1;
                      return `${uY}年${uM}月度 保守統合後 請求合計金額（税抜）`;
                    })()}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb' }}>
                    ¥{getTotalRequestAmount().toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                  style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                  onClick={handleExportContract}
                >
                  📝 DL Care保守契約書 (Word) を出力する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 共通データリスト */}
        <datalist id="unit-options-list">
          {UNIT_OPTIONS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <datalist id="master-category-list">
          {allCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* --- Print Section (ショキミツの見積テンプレート・CSS完全維持) --- */}
      <div className={styles.printSection}>{renderEstimateSheet()}</div>
    </main>
  );
}
