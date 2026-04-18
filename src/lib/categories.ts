export type CategoryItem = {
  slug: string
  label: string
  keyword: string
  // 1〜2文の短い説明。SEO 本文とカード表示の両方で使う
  intro: string
  // 選ぶときの観点を 3〜5 個（短文）
  points: string[]
  // よくある予算帯の目安
  budgets: { label: string; range: string }[]
  // 関連キーワード（内部リンク用）
  related?: string[]
}

export type CategoryGroup = {
  title: string
  items: CategoryItem[]
}

export const categories: CategoryGroup[] = [
  {
    title: "キッチン家電",
    items: [
      {
        slug: "rice-cooker",
        label: "炊飯器",
        keyword: "炊飯器",
        intro:
          "毎日食べるごはんの味を左右する家電。容量・加熱方式・お手入れのしやすさが主な分かれ目です。",
        points: [
          "何合炊き（3合=一人暮らし、5.5合=家族）",
          "加熱方式（マイコン／IH／圧力IH で価格と味が変わる）",
          "お手入れのしやすさ（内ぶた・内釜が丸洗いできるか）",
          "予算と毎日使うかどうかのバランス"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥15,000" },
          { label: "ミドル", range: "¥15,000〜¥40,000" },
          { label: "プレミアム", range: "¥40,000〜" }
        ],
        related: ["電気圧力鍋", "電子レンジ"]
      },
      {
        slug: "pressure-cooker",
        label: "電気圧力鍋",
        keyword: "電気圧力鍋",
        intro:
          "材料を入れてボタンを押すだけで煮込み料理が完成する時短家電。容量と自動メニューの豊富さがポイントです。",
        points: [
          "容量（1人用2L / 2〜3人3L / 4人以上4L〜）",
          "自動メニュー数（レシピ本不要か）",
          "低温調理や蒸し機能の有無",
          "お手入れ（内鍋・パッキンが洗いやすいか）"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥12,000" },
          { label: "ミドル", range: "¥12,000〜¥30,000" },
          { label: "プレミアム", range: "¥30,000〜" }
        ],
        related: ["炊飯器", "フライパン"]
      },
      {
        slug: "microwave",
        label: "電子レンジ",
        keyword: "電子レンジ",
        intro:
          "温めだけなら単機能、料理にも使うならオーブンレンジ。置き場所の寸法も忘れず確認を。",
        points: [
          "単機能／オーブン／スチームオーブン",
          "庫内容量（20L=一人暮らし、26L〜=家族）",
          "設置幅と上方の放熱スペース",
          "フラットテーブル or ターンテーブル"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥15,000" },
          { label: "ミドル", range: "¥15,000〜¥40,000" },
          { label: "プレミアム", range: "¥40,000〜" }
        ],
        related: ["トースター", "コーヒーメーカー"]
      },
      {
        slug: "coffee-maker",
        label: "コーヒーメーカー",
        keyword: "コーヒーメーカー",
        intro:
          "毎日淹れるなら手軽さ、味にこだわるなら抽出方式を重視。ミル付きかどうかで体験が大きく変わります。",
        points: [
          "ドリップ／カプセル／エスプレッソの違い",
          "ミル付きで豆から挽くか",
          "保温・タイマー機能",
          "掃除のしやすさ（分解洗浄できるか）"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥8,000" },
          { label: "ミドル", range: "¥8,000〜¥25,000" },
          { label: "プレミアム", range: "¥25,000〜" }
        ],
        related: ["トースター"]
      },
      {
        slug: "toaster",
        label: "トースター",
        keyword: "オーブントースター",
        intro:
          "焼き加減と庫内サイズが選び方の中心。こんがり焼きたいならスチーム式や高温仕様が候補に。",
        points: [
          "焼き方式（ヒーター／コンベクション／スチーム）",
          "庫内の広さ（食パン2枚／4枚）",
          "温度調節の細かさ",
          "お手入れ（受け皿・網が外せるか）"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥5,000" },
          { label: "ミドル", range: "¥5,000〜¥15,000" },
          { label: "プレミアム", range: "¥15,000〜" }
        ],
        related: ["電子レンジ", "コーヒーメーカー"]
      },
      {
        slug: "frying-pan",
        label: "フライパン",
        keyword: "フライパン",
        intro:
          "コーティングの種類と直径、IH対応の有無で選ぶのが定番。一人暮らしは 20cm 前後、家族用は 26cm 前後が目安です。",
        points: [
          "サイズ（20cm／24cm／26cm 以上）",
          "コーティング（フッ素樹脂／セラミック／ダイヤモンド）",
          "IH / ガス対応",
          "重さ（女性でも扱いやすいか）"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥3,000" },
          { label: "ミドル", range: "¥3,000〜¥10,000" },
          { label: "プレミアム", range: "¥10,000〜" }
        ]
      }
    ]
  },
  {
    title: "生活家電",
    items: [
      {
        slug: "vacuum",
        label: "掃除機",
        keyword: "掃除機",
        intro:
          "吸引力・重さ・バッテリー駆動時間の 3 つで決まる家電。住まいの広さと階段の有無で最適解が変わります。",
        points: [
          "タイプ（キャニスター／スティック／ハンディ）",
          "駆動方式（コード式／充電式）",
          "集塵方式（紙パック／サイクロン）",
          "運転音とお手入れ頻度"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥15,000" },
          { label: "ミドル", range: "¥15,000〜¥50,000" },
          { label: "プレミアム", range: "¥50,000〜" }
        ],
        related: ["ロボット掃除機"]
      },
      {
        slug: "robot-vacuum",
        label: "ロボット掃除機",
        keyword: "ロボット掃除機",
        intro:
          "共働きや忙しい一人暮らしに人気。間取り認識の精度、吸引＋水拭きの有無で価格差が出ます。",
        points: [
          "マッピング精度（LiDAR／ビジョン）",
          "吸引力と水拭きの両立",
          "ダストステーションの自動ゴミ回収",
          "段差・カーペット対応"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥20,000" },
          { label: "ミドル", range: "¥20,000〜¥60,000" },
          { label: "プレミアム", range: "¥60,000〜" }
        ],
        related: ["掃除機"]
      },
      {
        slug: "air-purifier",
        label: "空気清浄機",
        keyword: "空気清浄機",
        intro:
          "花粉・PM2.5・ハウスダスト対策の定番。適用畳数を実際の部屋より広めに選ぶのがセオリーです。",
        points: [
          "適用畳数（目安は実面積の 2〜3 倍）",
          "加湿機能の有無",
          "HEPA フィルタの交換サイクル",
          "運転音（寝室なら 20dB 台）"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥15,000" },
          { label: "ミドル", range: "¥15,000〜¥40,000" },
          { label: "プレミアム", range: "¥40,000〜" }
        ],
        related: ["加湿器", "扇風機・サーキュレーター"]
      },
      {
        slug: "humidifier",
        label: "加湿器",
        keyword: "加湿器",
        intro:
          "冬の乾燥対策の必需品。方式（スチーム／超音波／ハイブリッド）で電気代と衛生性が変わります。",
        points: [
          "方式（スチーム／気化／超音波／ハイブリッド）",
          "タンク容量と運転時間",
          "手入れのしやすさ（雑菌繁殖しにくいか）",
          "静音性"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥5,000" },
          { label: "ミドル", range: "¥5,000〜¥20,000" },
          { label: "プレミアム", range: "¥20,000〜" }
        ],
        related: ["空気清浄機"]
      },
      {
        slug: "circulator",
        label: "扇風機・サーキュレーター",
        keyword: "サーキュレーター",
        intro:
          "エアコンとの併用で電気代を節約。首振り・風量・静音性・リモコンの有無が評価ポイントです。",
        points: [
          "風の到達距離（〜10m / 〜20m / 〜30m）",
          "首振りの軸数（左右／上下／3D）",
          "DCモーター（省エネ・静音）／ACモーター",
          "置き型 vs クリップ型"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥5,000" },
          { label: "ミドル", range: "¥5,000〜¥20,000" },
          { label: "プレミアム", range: "¥20,000〜" }
        ],
        related: ["空気清浄機"]
      },
      {
        slug: "washing-machine",
        label: "洗濯機",
        keyword: "洗濯機",
        intro:
          "縦型は洗浄力、ドラムは乾燥性能と節水性が強み。設置場所の蛇口高さ・搬入経路もチェックを。",
        points: [
          "縦型 or ドラム式",
          "洗濯・乾燥容量（1人4kg／家族8kg以上）",
          "乾燥方式（ヒーター／ヒートポンプ）",
          "設置可能サイズ（防水パンと搬入経路）"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥50,000" },
          { label: "ミドル", range: "¥50,000〜¥180,000" },
          { label: "プレミアム", range: "¥180,000〜" }
        ]
      }
    ]
  },
  {
    title: "美容・健康",
    items: [
      {
        slug: "hair-dryer",
        label: "ドライヤー",
        keyword: "ドライヤー",
        intro:
          "風量と髪質ケアのバランスが要。毎日使うからこそ、重さと静音性も見落とせません。",
        points: [
          "風量（m³/分）",
          "温度調節と冷風モード",
          "イオン／ナノケアなどのヘアケア機能",
          "本体の重さ・ハンドルの形状"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥5,000" },
          { label: "ミドル", range: "¥5,000〜¥20,000" },
          { label: "プレミアム", range: "¥20,000〜" }
        ]
      },
      {
        slug: "electric-toothbrush",
        label: "電動歯ブラシ",
        keyword: "電動歯ブラシ",
        intro:
          "回転式／音波式で仕組みが違います。替えブラシの価格とバッテリー寿命が長期コストを左右します。",
        points: [
          "駆動方式（回転／音波／超音波）",
          "替えブラシの入手性と価格",
          "バッテリー持続時間",
          "歯茎ケアモードの有無"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥5,000" },
          { label: "ミドル", range: "¥5,000〜¥15,000" },
          { label: "プレミアム", range: "¥15,000〜" }
        ]
      },
      {
        slug: "shaver",
        label: "シェーバー",
        keyword: "シェーバー メンズ",
        intro:
          "深剃り重視なら往復式、肌へのやさしさ重視なら回転式。お風呂場でも使える防水性もチェックを。",
        points: [
          "方式（往復式／回転式）",
          "刃の数（3枚／4枚／5枚）",
          "防水／お風呂剃り対応",
          "充電方式と洗浄機の有無"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥8,000" },
          { label: "ミドル", range: "¥8,000〜¥25,000" },
          { label: "プレミアム", range: "¥25,000〜" }
        ]
      },
      {
        slug: "facial-device",
        label: "美顔器",
        keyword: "美顔器",
        intro:
          "エイジングケア／毛穴ケア／リフトアップなど目的で機能が違います。継続利用しやすいサイズ感も重要です。",
        points: [
          "主な機能（EMS／RF／イオン導入）",
          "付属のスキンケア要否",
          "充電持続時間",
          "口コミでの体感差"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥10,000" },
          { label: "ミドル", range: "¥10,000〜¥40,000" },
          { label: "プレミアム", range: "¥40,000〜" }
        ]
      },
      {
        slug: "body-composition",
        label: "体重計・体組成計",
        keyword: "体組成計",
        intro:
          "体重だけでなく体脂肪・筋肉量まで測るなら体組成計。スマホ連携とアプリの使いやすさで差がつきます。",
        points: [
          "測定項目（体重／体脂肪／筋肉量／骨量）",
          "スマホ連携（Bluetooth／Wi-Fi）",
          "家族登録数",
          "乗った時の安定感・表示の見やすさ"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥3,000" },
          { label: "ミドル", range: "¥3,000〜¥10,000" },
          { label: "プレミアム", range: "¥10,000〜" }
        ]
      }
    ]
  },
  {
    title: "PC・ガジェット",
    items: [
      {
        slug: "laptop",
        label: "ノートPC",
        keyword: "ノートパソコン",
        intro:
          "用途（ネット／学習／仕事／クリエイティブ）でスペック要件が大きく変わります。まずは CPU と メモリから。",
        points: [
          "CPU（Core i5/Ryzen 5 以上を目安）",
          "メモリ（8GB／16GB 以上）",
          "ストレージ（SSD 256GB 以上）",
          "画面サイズ・重さ・バッテリー"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥80,000" },
          { label: "ミドル", range: "¥80,000〜¥180,000" },
          { label: "プレミアム", range: "¥180,000〜" }
        ],
        related: ["タブレット", "モニター"]
      },
      {
        slug: "tablet",
        label: "タブレット",
        keyword: "タブレット",
        intro:
          "iPadか Android／Windows かで用途が変わります。Apple Pencil や キーボード対応も確認を。",
        points: [
          "OS（iPadOS／Android／Windows）",
          "画面サイズ（10〜11型／12〜13型）",
          "ストレージ容量",
          "ペン・キーボードへの対応"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥40,000" },
          { label: "ミドル", range: "¥40,000〜¥100,000" },
          { label: "プレミアム", range: "¥100,000〜" }
        ],
        related: ["ノートPC"]
      },
      {
        slug: "earbuds",
        label: "ワイヤレスイヤホン",
        keyword: "ワイヤレスイヤホン",
        intro:
          "ノイズキャンセリング・装着感・バッテリーの 3 つがキー。通話用途も考えるならマイク性能も見ましょう。",
        points: [
          "ノイズキャンセリングの強さ",
          "装着感（カナル／インナーイヤー）",
          "連続再生時間",
          "コーデック（LDAC／aptX Adaptive）"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥8,000" },
          { label: "ミドル", range: "¥8,000〜¥25,000" },
          { label: "プレミアム", range: "¥25,000〜" }
        ],
        related: ["ヘッドホン"]
      },
      {
        slug: "headphones",
        label: "ヘッドホン",
        keyword: "ヘッドホン",
        intro:
          "長時間使うなら装着感と重さ、出先で使うなら折りたたみ機構。有線／無線両対応モデルも便利です。",
        points: [
          "有線 / 無線",
          "ノイズキャンセリング",
          "装着感（イヤーパッドの素材）",
          "ドライバーサイズとコーデック"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥10,000" },
          { label: "ミドル", range: "¥10,000〜¥40,000" },
          { label: "プレミアム", range: "¥40,000〜" }
        ],
        related: ["ワイヤレスイヤホン"]
      },
      {
        slug: "monitor",
        label: "モニター",
        keyword: "PCモニター",
        intro:
          "文字主体なら解像度、映像・ゲームならリフレッシュレート。角度調整できるスタンドは地味に効きます。",
        points: [
          "画面サイズと解像度（FHD／WQHD／4K）",
          "パネル（IPS／VA）",
          "リフレッシュレート（60/120/144Hz）",
          "接続端子（HDMI / USB-C / DP）"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥20,000" },
          { label: "ミドル", range: "¥20,000〜¥50,000" },
          { label: "プレミアム", range: "¥50,000〜" }
        ],
        related: ["ノートPC", "キーボード"]
      },
      {
        slug: "keyboard",
        label: "キーボード",
        keyword: "キーボード ワイヤレス",
        intro:
          "毎日触れるほど、キーボードは快適性に直結。打鍵感・配列・接続方式が主な違いです。",
        points: [
          "キー配列（JIS／US／テンキー有無）",
          "キースイッチ（メンブレン／メカニカル／静電容量）",
          "接続（Bluetooth／2.4GHz／有線）",
          "マルチデバイスペアリング"
        ],
        budgets: [
          { label: "エントリー", range: "〜¥5,000" },
          { label: "ミドル", range: "¥5,000〜¥20,000" },
          { label: "プレミアム", range: "¥20,000〜" }
        ],
        related: ["モニター"]
      }
    ]
  }
]

export function allCategoryItems(): CategoryItem[] {
  return categories.flatMap((g) => g.items)
}

export function findCategory(slug: string): CategoryItem | null {
  for (const g of categories) {
    const hit = g.items.find((i) => i.slug === slug)
    if (hit) return hit
  }
  return null
}
