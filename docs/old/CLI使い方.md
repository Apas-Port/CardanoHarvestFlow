# hf-cli 利用ガイド

`HF-cardano-backend` が提供していた `node dist/index.cjs` と同じ操作を、`cardano-next/scripts/hf-cli.cjs` から実行するための手順をまとめています。

## 1. 事前準備

### 1.1 依存パッケージのインストール

```bash
cd scripts
pnpm install
```

Note: CLI は `HF-cardano-backend` のソースをそのまま読み込むため、親ディレクトリに `../HF-cardano-backend` が存在し、そこで `pnpm install` 済みである必要があります。
```
../HF-cardano-backend
../cardano-next
```

### 1.2 環境変数の設定

プロジェクト直下（`cardano-next/`）の `.env` または `.env.local` に下記を追加します。

```
COLLECTION_NAME=<コレクション名>
PAYMENT_MNEMONIC="<24語のニーモニック>"
PAYMENT_ACCOUNT_INDEX=0          # Lace で 2 つ目以降のアカウントを使っている場合に変更
PAYMENT_ADDRESS_INDEX=0          # 外部チェーンのアドレス番号（初期値 0）
# PAYMENT_CHANGE_INDEX=0         # 変更アドレスを使う場合のみ設定
# PAYMENT_MNEMONIC_PASSPHRASE=   # BIP39 パスフレーズを設定している場合のみ入力
FEE_PRICE_LOVELACE=1969750
EXPECTED_APR_NUMERATOR=1
EXPECTED_APR_DENOMINATOR=10
MATURATION_TIME=2338311809
MAX_MINTS=100
PARAM_UTXO_ENV_KEY=PARAM_UTXO_DEFAULT   # --project-id を使わない場合のフォールバック
PARAM_UTXO_PATH=./paramUtxo.json

# Blockfrost API キー
BLOCKFROST_API_KEY=<preprod 用デフォルト>
BLOCKFROST_PREPROD_API_KEY=<任意>
BLOCKFROST_MAINNET_API_KEY=<任意>
```

> `--network=mainnet` を指定すると `BLOCKFROST_MAINNET_API_KEY` が優先されます。preprod では `BLOCKFROST_PREPROD_API_KEY` を優先し、未設定の場合は `BLOCKFROST_API_KEY` を利用します。

`PAYMENT_MNEMONIC` には Lace でバックアップした 24 語をそのまま設定してください。空白の種類（全角/半角）を混在させると分割に失敗するので、半角スペースで区切られた文字列になっていることを確認します。

## 2. コマンドの実行方法

常に `scripts/` ディレクトリで実行します。

```bash
cd scripts
pnpm run hf -- <command> [--network=preprod|mainnet] [--project-id=<projectId>] [--param-env=<ENV_KEY>]
```

利用可能なコマンド一覧は次のとおりです。

| コマンド | 説明 |
|----------|------|
| `init` | プロトコルを初期化して参照 UTxO を生成します（トランザクション送信が行われるため ADA が必要）。|
| `balance` | `1852H/1815H/<account>/0/<address>` で導出される支払いアドレスの残高を表示します。|
| `o` | オラクルデータを表示します。|
| `l` | 資金用ウォレットが保有する NFT を一覧表示します。|
| `lh` | Blockfrost API 経由で NFT 保有者一覧を取得します。|
| `em` | ミントを有効化します。|
| `dm` | ミントを無効化します。|

使用例:

```bash
# preprod で初期化
pnpm run hf -- init

# mainnet を明示して保有者を取得
pnpm run hf -- lh --network=mainnet

# mainnet の残高確認
pnpm run hf -- balance --network=mainnet
```

`init` 実行後は `paramUtxo` が JSON で出力されます。`--project-id` を指定していれば、プロジェクトの `paramUtxoEnvKey` に合わせた環境変数名が表示されるので、そのまま Vercel や `.env.local` に登録してください。ファイル保存を併用したい場合は `PARAM_UTXO_PATH` を設定するとローカルにも書き出されます。

### 2.2 環境変数で paramUtxo を管理する

- `--project-id=<projectId>` を付けると、`public/data/*.json` から該当プロジェクトを読み込み、`paramUtxoEnvKey` を自動で解決します。例: `pnpm run hf -- init --network=mainnet --project-id=00000000000000000000000000000001`
- もしくは `--param-env=PARAM_UTXO_FOO` や `PARAM_UTXO_ENV_KEY` を使って手動で環境変数名を指定できます。
- 生成された JSON はそのまま環境変数に設定してください（例: `PARAM_UTXO_RUMDUOL='{"txHash":"...","outputIndex":1}'`）。Vercel ではダッシュボードにコピー＆ペーストするだけでファイル不要になります。
- すでに環境変数が設定されていれば、`l` / `lh` / `em` / `dm` など参照 UTxO を要するコマンドは `--project-id` か `--param-env` を付けて実行するだけで動作します。
- 初回実行時に担保 UTxO が無い場合は CLI が自動で作成します。そのトランザクションがブロックに載るまで数秒かかるため、初回の `init` は少し待ち時間が発生します。

### 2.1 Lace のアドレスと一致しないとき

- Lace で複数のアカウント（アカウント #2 など）を作成している場合、CLI 側では `PAYMENT_ACCOUNT_INDEX` を同じ番号に設定してください（最初のアカウントが 0、次が 1 です）。
- Lace で BIP39 パスフレーズ（いわゆる 25 語目）を設定している場合は `PAYMENT_MNEMONIC_PASSPHRASE` に同じ文字列を設定してください。未入力だと別のアドレスになります。
- 調整後に `pnpm run hf -- balance --network=mainnet` を再実行し、出力されるアドレスが Lace の「受け取り」画面と一致することを確認してください。
- CLI が導出しているアドレスを手動で検証したい場合は `cardano-address` を使用します。
  ```bash
  export LACE_MNEMONIC="<24語>"
  cardano-address key from-recovery-phrase Shelley <<< "$LACE_MNEMONIC" \
    | cardano-address key child 1852H/1815H/${PAYMENT_ACCOUNT_INDEX:-0}H/0/${PAYMENT_ADDRESS_INDEX:-0} \
    | cardano-address address payment --network mainnet
  ```
  `--network testnet` に切り替えるとテストネット用のアドレスが得られます。

## 3. Lace ニーモニックから `payment.skey` を作成する

CLI はニーモニックから直接 `MeshWallet` を構築しますが、ほかのツールと鍵を共有したい場合は以下の手順で `payment.skey` / `stake.skey` を生成できます。

1. `cardano-address` と `cardano-cli` をインストールします（macOS の例）。
   ```bash
   brew install cardano-address cardano-cli
   ```
   Linux では [IOG リリース](https://github.com/input-output-hk/cardano-node/releases) から取得するか、`nix`/`ghcup` を利用してください。
2. Lace の 24 語を環境変数にセットします。
   ```bash
   export LACE_MNEMONIC="<24語>"
   ```
3. 支払い鍵とステーク鍵を導出します。
   ```bash
   cardano-address key from-recovery-phrase Shelley <<< "$LACE_MNEMONIC" > root.prv
   cardano-address key child 1852H/1815H/${PAYMENT_ACCOUNT_INDEX:-0}H <<< root.prv > account.prv
   cardano-address key child 0/${PAYMENT_ADDRESS_INDEX:-0} <<< account.prv > payment.prv
   cardano-address key child 2/0 <<< account.prv > stake.prv
   cardano-address key public --with-chain-code <<< payment.prv > payment.pub
   cardano-address key public --with-chain-code <<< stake.prv > stake.pub
   ```
4. `cardano-cli` 形式に変換します。
   ```bash
   cardano-cli key convert-cardano-address-key \
     --signing-key-file payment.prv \
     --out-file payment.skey \
     --signing-key-style Extended

   cardano-cli key convert-cardano-address-key \
     --signing-key-file stake.prv \
     --out-file stake.skey \
     --signing-key-style Extended
   ```
5. 生成した鍵は Git 管理外に移し、必要に応じて `.env.local` にパスを控えてください。

## 4. 残高確認とトラブルシューティング

- `pnpm run hf -- balance --network=<net>` で ADA 残高を確認できます。`Error: No utxos found` は残高不足か、ネットワーク指定が誤っているときに発生します。
- `MeshPlutusNFTContract is not a constructor` は `HF-cardano-backend` 側の依存が未インストールなときに発生します。`../HF-cardano-backend` で `pnpm install` を実行してください。
- `TxSignError` や `TxSubmitFail` はブロックチェーン検証エラーです。CLI が表示するスタックトレースをもとにパラメータや価格差分を確認してください。

## 5. 運用上の注意

- `lh` コマンドは Blockfrost API を多数呼び出します。mainnet では時間がかかる場合があります。
- `init`/`em`/`dm` はトランザクション送信を伴うため、十分な ADA を確保してください。
- `hf-cli.cjs` は `../HF-cardano-backend` を参照する設計です。別パスに設置している場合はスクリプトの `backendDir` を編集してください。

以上で CLI の利用準備は完了です。`
