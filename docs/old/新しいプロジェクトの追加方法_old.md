# 新しいプロジェクトの追加方法（hf-cli ベース）

Harvestflow で新しいプロジェクトを公開するときは、ローカル環境の準備、オンチェーンの初期化、
そして Vercel への反映という順序で作業します。ここでは `scripts/hf-cli.cjs` を使った手順を説明します。

## 0. 事前準備

最初にリポジトリをそろえます。このフロントエンド（`cardano-next`）と `../../HF-cardano-backend` を同じ階層に配置し、どちらでも `pnpm install` を実行して依存関係を解決してください。

### 環境変数の設定

環境変数は2つのファイルに分けて管理します：

**1. プロジェクトルートの `.env`** 

このファイルには、アプリケーション全体で使用する環境変数を設定します。以下の内容を追加してください：

```bash
# ネットワーク設定
CARDANO_NETWORK=preprod
NEXT_PUBLIC_CARDANO_NETWORK=preprod

# Blockfrost API キー
BLOCKFROST_API_KEY=<preprod 用キー>
BLOCKFROST_MAINNET_API_KEY=<mainnet 用キー>

# ウォレット設定（ローカル開発用）
PAYMENT_MNEMONIC="<24語のニーモニック>"
# PAYMENT_ACCOUNT_INDEX=0
# PAYMENT_ADDRESS_INDEX=0
# PAYMENT_MNEMONIC_PASSPHRASE=

# プロジェクト固有のパラメータ UTXO（init コマンド実行後に追加）
# PARAM_UTXO_PROJECT_NAME='{"outputIndex": 0, "txHash": "..."}'
```

**2. scripts ディレクトリの `.env`** (`<project-root>/scripts/.env`)

このファイルには、CLI スクリプト固有の設定を記載します（通常はデフォルトのままで OK）：

```bash
# Blockfrost API キー（ルートの .env から継承される）
BLOCKFROST_API_KEY=<preprod 用キー>
BLOCKFROST_MAINNET_API_KEY=<mainnet 用キー>

# paramUtxo.json ファイルのパス
PARAM_UTXO_PATH=paramUtxo.json
```

> **Note**: `FEE_PRICE_LOVELACE`, `EXPECTED_APR_NUMERATOR`, `MAX_MINTS` などのプロジェクト設定は、`public/data/dev-projects.json` または `public/data/projects.json` で管理するため、.env ファイルには記載不要です。

Lace などで複数アカウントを運用している場合は、`PAYMENT_ACCOUNT_INDEX` と `PAYMENT_ADDRESS_INDEX` を実際の利用状況に合わせて変更します。設定が終わったら `scripts` ディレクトリに移動し、`pnpm install` を実行して CLI の依存関係も解決してください。以降のコマンドはすべて `scripts/` で実行します。

### 1 Dummyの `paramUtxo.json` を設置
RootDirectry に paramUtxo.json を設置する
```json
{"outputIndex":1,"txHash":"dd5fb7a9a0af6ae8fc215794c84a22412e1e5f383f098833333a576226c35e9f"}
```

## 2. プロジェクト JSON の編集

新しいプロジェクトを追加するときは、まず `public/data/dev-projects.json` に次のようなオブジェクトを追加します。`id` は 32 文字で一意にします。

```json
{
  "id": "00000000000000000000000000000002",
  "num": 2,
  "title": "プロジェクト名",
  "subTitle": "サブタイトル",
  "description": "プロジェクト概要",
  "apy": 8.0,
  "lendingType": "ADA",
  "network": "Cardano",
  "capacity": 300,
  "unitPrice": 1,
  "collectionName": "Harvestflow",
  "mainImage": "/images/project/2/main.png",
  "previewImage": "/images/project/2/preview.jpg",
  "tuktukImage": "/images/project/2/tuktuk.png",
  "policyId": "",
  "status": "active",
  "listing": true,
  "maxMints": 100,
  "paramUtxoEnvKey": "PARAM_UTXO_PROJECT_2",
  "mintPriceLovelace": 1969750
}
```

画像は `public/images/project/<num>/` に配置します。将来的に mainnet へ公開するときは、同じ構造を `public/data/projects.json` にコピーしてください。

## 3. hf-cli によるオンチェーン初期化

### 3.1 ウォレット残高の確認

`pnpm run hf -- balance --network=preprod`

上記のコマンドを実行すると、資金用ウォレットのアドレスと残高が表示されます。表示されたアドレスに十分な ADA が入っていることを確認し、Lace で表示される受取アドレスと一致するかどうかを必ずチェックします。

*Example
```shell
% pnpm run hf -- balance --network=preprod

> hf-cli@ hf /Users/mizuki/workspace/cardano-next/scripts
> node hf-cli.cjs "--" "balance" "--network=preprod"

[dotenv@17.2.2] injecting env (0) from ../.env.local -- tip: 🛠️  run anywhere with `dotenvx run -- yourcommand`
[dotenv@17.2.2] injecting env (31) from ../.env -- tip: 📡 auto-backup env with Radar: https://dotenvx.com/radar
[hf-cli] Using BLOCKFROST_API_KEY for preprod.
Address: addr_test1qrvr7ffc2xjxk4wn5vxflernwu76la8ruqgx4nrq5q6eplv5fpsna8q8hytqhepswuavuaqg83qtnkkrndtv3jxhd7fqtxr8p8
Total lovelace: 9955975350
Total ADA: 9955.97535
```

### 3.2 プロトコル初期化

`pnpm run hf -- init --project-id=001 --network=preprod`

初回実行では担保 UTxO を作成するトランザクションが送信されるため、完了まで 10〜30 秒ほど待つことがあります。コマンドが成功すると参照 UTxO の JSON が表示されるので、`PARAM_UTXO_PROJECT2=...` の形で `.env.local` や Vercel の環境変数に貼り付けます。同時に `public/data/dev-projects.json` の該当プロジェクトに最新の `policyId` が書き戻されます。

* Example
```shell
 % pnpm run hf -- init --project-id=001 --network=preprod

> hf-cli@ hf /Users/mizuki/workspace/cardano-next/scripts
> node hf-cli.cjs "--" "init" "--project-id=001" "--network=preprod"

[dotenv@17.2.2] injecting env (0) from ../.env.local -- tip: 🔐 encrypt with Dotenvx: https://dotenvx.com
[dotenv@17.2.2] injecting env (32) from ../.env -- tip: ⚙️  specify custom .env file path with { path: '/custom/path/.env' }
[hf-cli] Using BLOCKFROST_API_KEY for preprod.
[hf-cli] No collateral UTxO detected; creating collateral.
[hf-cli] Collateral transaction submitted: 58aa2dec5d7e3a154a93f1b37bde37dfe61e7f85d5043a670356ac2ce1ad2a8a
[hf-cli] Waiting for collateral confirmation...
[hf-cli] Waiting for collateral confirmation...
[hf-cli] Waiting for collateral confirmation...
[hf-cli] Waiting for collateral confirmation...
[hf-cli] Collateral UTxO detected.
Booting protocol with settings: {
  lovelacePrice: 1969750,
  expectedAprNumerator: 1,
  expectedAprDenominator: 10,
  maturationTime: '2338311809',
  maxMints: '100'
}
tx to be submitted:  84a700d9010281825820bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20020182a300581d70abe7765412495640682a8771ffd9d7012725e551a18646b38a5d131101821a0016c13ca1581c2560bd3de2fef494021eec0c108f30d82cd802522fa79dc4bffcc8d7a14001028201d8185869d8799f001a001e0e56d8799fd8799f581ccfe457b494114f73f1d3273994bd035a8b661d7310297e178189709affd8799fd8799fd8799f581c534415309d7feb185768d3150f09fdf810224743a1595b601826f44fffffffffd87a80d87a80010a1a8b5fce811864ff82583900cfe457b494114f73f1d3273994bd035a8b661d7310297e178189709a534415309d7feb185768d3150f09fdf810224743a1595b601826f44f821b00000002167b9320a1581c85dd6eafa499972db44906f4084597238115b2007847744e5c505a1ba94e48617276657374666c6f77202331025048617276657374666c6f772023313739015048617276657374666c6f772023313830015048617276657374666c6f772023313831015048617276657374666c6f77202331383701581848617276657374466c6f773137353437333536323236393301581a343836313732373636353733373436363663366637373233333104581c3438363137323736363537333734363636633666373732303233333103581e33303330333033303330333033303330356633303330333033303330333104021a000cb489075820bdaa99eb158414dea0a91d6c727e2268574b23efe6e08ab3b841abe8059a030c09a1581c2560bd3de2fef494021eec0c108f30d82cd802522fa79dc4bffcc8d7a140010b582011bb34b7d88c308fd3ef46f2d8d149921b47aa74ea9f9d2e6f9452323c94d4b60dd901028182582058aa2dec5d7e3a154a93f1b37bde37dfe61e7f85d5043a670356ac2ce1ad2a8a00a205a182010082d87980821a006acfc01ab2d05e0007d90102815901cc5901c901010033232323232323222533300332323232325332330093001300a37540042646464a66601860080022a66601e601c6ea8018540085854ccc030cdc3a40040022a66601e601c6ea8018540085858c030dd50028992999805980198061baa0051533300b3003300c375464660020026eb0c044c038dd50041129998080008a6103d87a800013232533300f3375e01c600a60226ea80084cdd2a40006602600497ae01330040040013014002301200114a229404c8cc004004c8cc004004dd59809180998099809980998079baa00922533301100114bd70099199911191980080080191299980b80088018991980c9ba733019375200c66032602c00266032602e00297ae033003003301b0023019001375c60200026eacc044004cc00c00cc054008c04c004894ccc040004528899299980719299980799b8f375c600a00200c266e20dd6980a180a980a800a40002944dd618098010998018018008a50301300123010001375c601c60166ea8008dc3a40002c6018601a004601600260160046012002600a6ea8004526136565734aae7555cf2ab9f5740ae855d1260127d8799f5820bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d2002ff0001f5d90103a0
associated paramUtxo:  {
  outputIndex: 2,
  txHash: 'bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20'
}
Submitting oracle/settings UTXO setup transaction
Submitted oracle mint tx hash:  4d8279c7fa84b3d333f155b19cda8871f92ad05e3c142a645a1df2d11c1cb50e
paramUtxo saved to /Users/mizuki/workspace/cardano-next/paramUtxo.json.
[hf-cli] Export the following environment variable:
PARAM_UTXO_RUMDUOL='{
  "outputIndex": 2,
  "txHash": "bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20"
}'
```

このコマンドの出力で表示された `PARAM_UTXO_xxx` の内容を、**プロジェクトルートの `.env` ファイル**にコピー&ペーストしてください。

```bash
# <project-root>/.env に追加
PARAM_UTXO_RUMDUOL='{"outputIndex": 2, "txHash": "bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20"}'
```

*Example (続き)*
```shell
getOracleNFTCbor called
this.paramUtxo
{
  outputIndex: 2,
  txHash: 'bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20'
}
this.paramUtxo.txHash bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20
this.paramUtxo.txHash.length 64
params [
  {
    alternative: 0,
    fields: [
      'bc9ec4e050ce2b0834bbcb95fee80dd8bdc59a7312b6924076d1d45a56ca0d20',
      2
    ]
  }
]
[hf-cli] Updated dev-projects.json policyId to e9491aa6d9aeabd3a266fbaa13aee963b05e9db4afb12f8795443d1a.
Note: booting the protocol submits a transaction and consumes ADA for collateral/fees.
```

### 3.3 環境変数の変更

`init` コマンドの出力で表示された paramUtxo JSON を、プロジェクトルートの `.env` ファイルに追加します。

**追加先**: `<project-root>/.env`

```bash
# プロジェクト固有のパラメータ UTXO
PARAM_UTXO_RUMDUOL_DEV3='{"outputIndex": 0, "txHash": "470d2c164b14438951311201b4c4630cc822ee9fdb0ba2ceef941bc6ef0a51f5"}'
```

この環境変数名 (`PARAM_UTXO_RUMDUOL_DEV3`) は、`public/data/dev-projects.json` の該当プロジェクトの `paramUtxoEnvKey` フィールドで指定した値と一致させてください。

> **重要**: Vercel など本番環境にデプロイする場合は、同じ環境変数を Vercel の環境変数設定にも追加してください。

### 3.4 オラクル状態の確認(option)

`pnpm run hf -- o --project-id=001 --network=preprod`

このコマンドで obtained された datum を確認し、`nft_mint_allowed` が `true` であること、価格や供給上限が期待通りであることを確かめてください。

*Example
```shell
% pnpm run hf -- o --project-id=001 --network=preprod

> hf-cli@ hf /Users/mizuki/workspace/cardano-next/scripts
> node hf-cli.cjs "--" "o" "--project-id=00000000000000000000000000000002" "--network=preprod"

[dotenv@17.2.2] injecting env (0) from ../.env.local -- tip: 📡 observe env with Radar: https://dotenvx.com/radar
[dotenv@17.2.2] injecting env (31) from ../.env -- tip: ⚙️  suppress all logs with { quiet: true }
[hf-cli] Using BLOCKFROST_API_KEY for preprod.
getOracleNFTCbor called
this.paramUtxo
{
  outputIndex: 0,
  txHash: 'a745c8b8f9b6896fe73767095981548acbc5a9092b478f63bc575899a85083a8'
}
this.paramUtxo.txHash a745c8b8f9b6896fe73767095981548acbc5a9092b478f63bc575899a85083a8
this.paramUtxo.txHash.length 64
params [
  {
    alternative: 0,
    fields: [
      'a745c8b8f9b6896fe73767095981548acbc5a9092b478f63bc575899a85083a8',
      0
    ]
  }
]
getOracleNFTCbor called
this.paramUtxo
{
  outputIndex: 0,
  txHash: 'a745c8b8f9b6896fe73767095981548acbc5a9092b478f63bc575899a85083a8'
}
this.paramUtxo.txHash a745c8b8f9b6896fe73767095981548acbc5a9092b478f63bc575899a85083a8
this.paramUtxo.txHash.length 64
params [
  {
    alternative: 0,
    fields: [
      'a745c8b8f9b6896fe73767095981548acbc5a9092b478f63bc575899a85083a8',
      0
    ]
  }
]
{
  "nftIndex": 4,
  "policyId": "edadd1b8e4701bc71abd2ed8588a3a6b8c53ed92d5fc3eb4b312c372",
  "lovelacePrice": 1969750,
  "oracleUtxo": {
    "input": {
      "outputIndex": 0,
      "txHash": "660f3d2f52264c953918429a211c1f30a2d32788d08f3146012c47a4781bee00"
    },
    "output": {
      "address": "addr_test1wz47waj5zfy4vsrg92rhrl7e6uqjwf092xscv34n3fw3xygxvx0am",
      "amount": [
        {
          "unit": "lovelace",
          "quantity": "1491260"
        },
        {
          "unit": "b47acbfe0a994111f11f3f08ece1bfec72a6472792b92f595ab71aca",
          "quantity": "1"
        }
      ],
      "dataHash": "7857e7862075582cab6fa9168ff2cf27ee7dda88376e4b8f4901b2b2a7590ad6",
      "plutusData": "d8799f041a001e0e56d8799fd8799f581cd83f253851a46b55d3a30c9fe473773daff4e3e0106acc60a03590fdffd8799fd8799fd8799f581c9448613e9c07b9160be430773ace74083c40b9dac39b56c8c8d76f92ffffffffd87a80d87a80010a1a8b5fce811864ff",
      "scriptHash": null
    }
  },
  "oracleNftPolicyId": "b47acbfe0a994111f11f3f08ece1bfec72a6472792b92f595ab71aca",
  "feeCollectorAddress": "addr_test1qrvr7ffc2xjxk4wn5vxflernwu76la8ruqgx4nrq5q6eplv5fpsna8q8hytqhepswuavuaqg83qtnkkrndtv3jxhd7fqtxr8p8",
  "feeCollectorAddressObj": {
    "constructor": 0,
    "fields": [
      {
        "constructor": 0,
        "fields": [
          {
            "bytes": "d83f253851a46b55d3a30c9fe473773daff4e3e0106acc60a03590fd"
          }
        ]
      },
      {
        "constructor": 0,
        "fields": [
          {
            "constructor": 0,
            "fields": [
              {
                "constructor": 0,
                "fields": [
                  {
                    "bytes": "9448613e9c07b9160be430773ace74083c40b9dac39b56c8c8d76f92"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "nftMintAllowed": {
    "constructor": 1,
    "fields": []
  },
  "nftTradeAllowed": {
    "constructor": 1,
    "fields": []
  },
  "expectedAprNumerator": {
    "int": 1
  },
  "expectedAprDenominator": {
    "int": 10
  },
  "maturationTime": {
    "int": 2338311809
  },
  "maxMints": {
    "int": 100
  }
}
```

### 3.5 ミント許可の切り替え(option)

ミントを一時停止したいときは `pnpm run hf -- dm --project-id=...` を、再開したいときは停止後に `pnpm run hf -- em --project-id=...` を実行します。初期状態では既にミントが許可されているため、状態を変更せずに `em` を実行するとスクリプトが失敗します。必ず `dm` → `em` の順で状態遷移を行ってください。

### 3.5 ミント実行 & PolicyID の更新

実際に NFT をミントする場合は、`npm run dev` でフロントエンドを起動するか、サーバー API を直接呼び出します。
Note: 一度Mintした上で正しいPolicyIDを取得し、これをProject.Jsonに埋め込む
```
https://preprod.cexplorer.io/tx/70240f532f64d1ce308addba676d25fcc97edc0ae26cef3cbc4051e91acecac3?tab=content
```
より
```
ceabde290bb89db1dd21a816fb1d67404373248b9861c6421eabdecd
```

### 3.6 ホルダー確認

```
% pnpm run hf -- lh  --project-id=00000000000000000000000000000003 --network=preprod

> hf-cli@ hf /Users/mizuki/workspace/cardano-next/scripts
> node hf-cli.cjs "--" "lh" "--project-id=00000000000000000000000000000003" "--network=preprod"

[dotenv@17.2.2] injecting env (0) from ../.env.local -- tip: ⚙️  enable debug logging with { debug: true }
[dotenv@17.2.2] injecting env (32) from ../.env -- tip: ⚙️  override existing env vars with { override: true }
[hf-cli] Using BLOCKFROST_API_KEY for preprod.
[hf-cli] Using project policyId ceabde290bb89db1dd21a816fb1d67404373248b9861c6421eabdecd for holder lookup.
{
  "ceabde290bb89db1dd21a816fb1d67404373248b9861c6421eabdecd000de14048617276657374666c6f7720283029": [
    "addr_test1qr87g4a5jsg57ul36vnnn99aqddgkesawvgzjlshsxyhpxjngs2np8tlavv9w6xnz58snl0czq3ywsapt9dkqxpx738sthc6ty"
  ],
  "ceabde290bb89db1dd21a816fb1d67404373248b9861c6421eabdecd000de14048617276657374666c6f7720283129": [
    "addr_test1qr87g4a5jsg57ul36vnnn99aqddgkesawvgzjlshsxyhpxjngs2np8tlavv9w6xnz58snl0czq3ywsapt9dkqxpx738sthc6ty"
  ]
}
```

## 4. 環境変数の整理

### プロジェクトルートの `.env` に設定する環境変数

| キー | 用途 | 記載先 |
| --- | --- | --- |
| `PARAM_UTXO_<PROJECT>` | `init` の出力を設定します。Vercel の環境変数にも同じ名前で登録してください。 | `.env` |
| `PAYMENT_MNEMONIC` | サーバー署名に使用する 24 語のニーモニックです。**セキュリティ上、Git にコミットしないでください**。 | `.env` |
| `PAYMENT_ACCOUNT_INDEX` | Lace で複数アカウントを扱う場合に派生パスを合わせます（デフォルト: 0）。 | `.env` |
| `PAYMENT_ADDRESS_INDEX` | Lace で複数アドレスを扱う場合に派生パスを合わせます（デフォルト: 0）。 | `.env` |
| `PAYMENT_MNEMONIC_PASSPHRASE` | BIP39 パスフレーズを利用している場合のみ設定します。 | `.env` |
| `CARDANO_NETWORK` | 使用するネットワーク (`preprod` または `mainnet`)。 | `.env` |
| `BLOCKFROST_API_KEY` | Preprod 用の Blockfrost API キー。 | `.env` |
| `BLOCKFROST_MAINNET_API_KEY` | Mainnet 用の Blockfrost API キー。 | `.env` |

### scripts/.env に設定する環境変数

通常、scripts/.env はデフォルト設定のままで問題ありませんが、以下の項目をカスタマイズできます：

| キー | 用途 | 記載先 |
| --- | --- | --- |
| `PARAM_UTXO_PATH` | paramUtxo.json ファイルのパス（デフォルト: `paramUtxo.json`）。 | `scripts/.env` |
| `BLOCKFROST_API_KEY` | CLI スクリプト用の Blockfrost API キー（ルートの .env から継承）。 | `scripts/.env` |
| `BLOCKFROST_MAINNET_API_KEY` | CLI スクリプト用の Mainnet Blockfrost API キー（ルートの .env から継承）。 | `scripts/.env` |

> **セキュリティに関する注意**:
> - `PAYMENT_MNEMONIC` は **絶対に Git にコミットしないでください**。
> - `.env` ファイルが `.gitignore` に含まれていることを確認してください。
> - 本番環境では Vercel の環境変数設定を使用してください。

## 5. 動作確認

`npm run dev` でアプリケーションを起動し、トップページに新しいプロジェクトが表示されることを確認してください。続いて `npm run lint` を実行し、静的解析をパスすることを確かめます。テストミントを行った後は `pnpm run hf -- lh` で保有者情報が取得できることを再確認し、`pnpm run hf -- balance` でウォレットに十分な ADA が残っているかもチェックします。

## 6. デプロイ

本番環境へ公開するときは、`public/data/projects.json` に同じエントリを追加します。`policyId` と `paramUtxoEnvKey` は本番用の値に置き換え、Vercel の環境変数も mainnet 用 (`BLOCKFROST_MAINNET_API_KEY` や `CARDANO_NETWORK=mainnet` など) に切り替えます。その上で `pnpm run hf -- init --project-id=... --network=mainnet` を実行し、本番用の参照 UTxO を作成してください。最後に Vercel へデプロイし、`pnpm run hf -- o --network=mainnet` で状態を確認します。

## 参考コマンド一覧

| コマンド | 説明 |
| --- | --- |
| `pnpm run hf -- balance --project-id=...` | 資金用ウォレットの残高を確認します。 |
| `pnpm run hf -- init --project-id=...` | プロトコルを初期化し、新しい param UTxO を生成します。 |
| `pnpm run hf -- o --project-id=...` | オラクルに記録されている価格や状態を確認します。 |
| `pnpm run hf -- em/dm --project-id=...` | ミントの許可状態を切り替えます。 |
| `pnpm run hf -- lh --project-id=...` | 最新の policyId に紐づく保有者一覧を表示します。 |

## トラブルシューティング

- `No collateral found` が表示された場合、担保 UTxO がまだ生成されていない可能性があります。トランザクションがブロックに含まれるまで数秒待ってから再実行してください。残高不足の場合は ADA を補充します。
- `ENOENT: open '/...{"txHash":...}'` が表示された場合、`.env` の `PARAM_UTXO_*` に余計なクォートが付いていることが原因です。純粋な JSON 文字列に修正してください。
- `Minting error: TxSignError` が表示された場合、ブラウザウォレットが必要な入力を保持していない可能性があります。正しいウォレットを選択するか、資金 UTxO を追加してください。
- `TxSubmitFail` が表示された場合、redeemer や datum の整合性に問題があります。エラーメッセージを確認し、`dm` → `em` の順で状態遷移を行ったか、価格などの設定に齟齬がないかを調べます。

上記の流れに従えば、新しいプロジェクトのオンチェーン設定から UI への反映、そしてデプロイまでを一貫した手順で行うことができます。
