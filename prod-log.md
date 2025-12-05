```shell
% pnpm run hf -- init --project-id=001 --network=mainnet

> hf-cli@ hf /Users/mizuki/workspace/cardano-next/scripts
> node hf-cli.cjs "--" "init" "--project-id=001" "--network=mainnet"

[dotenv@17.2.2] injecting env (0) from ../.env.local -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
[dotenv@17.2.2] injecting env (30) from ../.env -- tip: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }
[hf-cli] Using BLOCKFROST_MAINNET_API_KEY for mainnet.
Booting protocol with settings: {
  lovelacePrice: 1969750,
  expectedAprNumerator: 1,
  expectedAprDenominator: 10,
  maturationTime: '2338311809',
  maxMints: '100'
}
tx to be submitted:  84a700d9010281825820760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf000182a300581d71abe7765412495640682a8771ffd9d7012725e551a18646b38a5d131101821a0016c13ca1581cbc43a233d568908aa14033077b932a801cf230f717a7e8f6fa9ca0f4a14001028201d8185869d8799f001a001e0e56d8799fd8799f581ccfe457b494114f73f1d3273994bd035a8b661d7310297e178189709affd8799fd8799fd8799f581c534415309d7feb185768d3150f09fdf810224743a1595b601826f44fffffffffd87a80d87a80010a1a8b5fce811864ff82583901cfe457b494114f73f1d3273994bd035a8b661d7310297e178189709a534415309d7feb185768d3150f09fdf810224743a1595b601826f44f1a0028ff97021a000c8a6d075820bdaa99eb158414dea0a91d6c727e2268574b23efe6e08ab3b841abe8059a030c09a1581cbc43a233d568908aa14033077b932a801cf230f717a7e8f6fa9ca0f4a140010b582011bb34b7d88c308fd3ef46f2d8d149921b47aa74ea9f9d2e6f9452323c94d4b60dd9010281825820760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf00a205a182010082d87980821a006acfc01ab2d05e0007d90102815901cc5901c901010033232323232323222533300332323232325332330093001300a37540042646464a66601860080022a66601e601c6ea8018540085854ccc030cdc3a40040022a66601e601c6ea8018540085858c030dd50028992999805980198061baa0051533300b3003300c375464660020026eb0c044c038dd50041129998080008a6103d87a800013232533300f3375e01c600a60226ea80084cdd2a40006602600497ae01330040040013014002301200114a229404c8cc004004c8cc004004dd59809180998099809980998079baa00922533301100114bd70099199911191980080080191299980b80088018991980c9ba733019375200c66032602c00266032602e00297ae033003003301b0023019001375c60200026eacc044004cc00c00cc054008c04c004894ccc040004528899299980719299980799b8f375c600a00200c266e20dd6980a180a980a800a40002944dd618098010998018018008a50301300123010001375c601c60166ea8008dc3a40002c6018601a004601600260160046012002600a6ea8004526136565734aae7555cf2ab9f5740ae855d1260127d8799f5820760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf00ff0001f5d90103a0
associated paramUtxo:  {
  outputIndex: 0,
  txHash: '760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf'
}
Submitting oracle/settings UTXO setup transaction
Submitted oracle mint tx hash:  a9d93e05eee7fcd1d2a275e7c2c985b34e1ff45bf261c73c6fb0c8b92cb93f65
paramUtxo saved to /Users/mizuki/workspace/cardano-next/paramUtxo.json.
[hf-cli] Export the following environment variable:
PARAM_UTXO_RUMDUOL='{
  "outputIndex": 0,
  "txHash": "760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf"
}'
getOracleNFTCbor called
this.paramUtxo
{
  outputIndex: 0,
  txHash: '760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf'
}
this.paramUtxo.txHash 760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf
this.paramUtxo.txHash.length 64
params [
  {
    alternative: 0,
    fields: [
      '760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf',
      0
    ]
  }
]
[hf-cli] Updated projects.json policyId to 6ae8f7a41c070423da4d44f321f157f629f97bc3a660938b8d754bfb.
Note: booting the protocol submits a transaction and consumes ADA for collateral/fees.
```

PARAM_UTXO_RUMDUOL='{"outputIndex": 0,"txHash": "760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf"}'


```
% pnpm run hf -- o --project-id=001 --network=mainnet

> hf-cli@ hf /Users/mizuki/workspace/cardano-next/scripts
> node hf-cli.cjs "--" "o" "--project-id=001" "--network=mainnet"

[dotenv@17.2.2] injecting env (0) from ../.env.local -- tip: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }
[dotenv@17.2.2] injecting env (30) from ../.env -- tip: ⚙️  override existing env vars with { override: true }
[hf-cli] Using BLOCKFROST_MAINNET_API_KEY for mainnet.
getOracleNFTCbor called
this.paramUtxo
{
  outputIndex: 0,
  txHash: '760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf'
}
this.paramUtxo.txHash 760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf
this.paramUtxo.txHash.length 64
params [
  {
    alternative: 0,
    fields: [
      '760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf',
      0
    ]
  }
]
getOracleNFTCbor called
this.paramUtxo
{
  outputIndex: 0,
  txHash: '760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf'
}
this.paramUtxo.txHash 760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf
this.paramUtxo.txHash.length 64
params [
  {
    alternative: 0,
    fields: [
      '760e96e0c1bb405d4149a59a3137f97eedbd86c10d719856410e639a480a75cf',
      0
    ]
  }
]
{
  "nftIndex": 0,
  "policyId": "6ae8f7a41c070423da4d44f321f157f629f97bc3a660938b8d754bfb",
  "lovelacePrice": 1969750,
  "oracleUtxo": {
    "input": {
      "outputIndex": 0,
      "txHash": "a9d93e05eee7fcd1d2a275e7c2c985b34e1ff45bf261c73c6fb0c8b92cb93f65"
    },
    "output": {
      "address": "addr1wx47waj5zfy4vsrg92rhrl7e6uqjwf092xscv34n3fw3xygayjnj7",
      "amount": [
        {
          "unit": "lovelace",
          "quantity": "1491260"
        },
        {
          "unit": "bc43a233d568908aa14033077b932a801cf230f717a7e8f6fa9ca0f4",
          "quantity": "1"
        }
      ],
      "dataHash": "94cc750eda57356d35fa7751799de7bab789c72876338f5ac6a504d52fa8e6cb",
      "plutusData": "d8799f001a001e0e56d8799fd8799f581ccfe457b494114f73f1d3273994bd035a8b661d7310297e178189709affd8799fd8799fd8799f581c534415309d7feb185768d3150f09fdf810224743a1595b601826f44fffffffffd87a80d87a80010a1a8b5fce811864ff",
      "scriptHash": null
    }
  },
  "oracleNftPolicyId": "bc43a233d568908aa14033077b932a801cf230f717a7e8f6fa9ca0f4",
  "feeCollectorAddress": "addr1q887g4a5jsg57ul36vnnn99aqddgkesawvgzjlshsxyhpxjngs2np8tlavv9w6xnz58snl0czq3ywsapt9dkqxpx738sgp968m",
  "feeCollectorAddressObj": {
    "constructor": 0,
    "fields": [
      {
        "constructor": 0,
        "fields": [
          {
            "bytes": "cfe457b494114f73f1d3273994bd035a8b661d7310297e178189709a"
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
                    "bytes": "534415309d7feb185768d3150f09fdf810224743a1595b601826f44f"
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