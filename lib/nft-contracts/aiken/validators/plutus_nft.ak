use aiken/collection/list.{at}
use aiken/math/rational.{Rational}
use aiken/primitive/bytearray.{concat}
use cardano/assets.{PolicyId, Value, add, flatten, from_asset, policies}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction,
}
use mocktail.{
  complete, mint, mocktail_tx, ref_tx_in, ref_tx_in_inline_datum, tx_in,
  tx_in_inline_datum, tx_out, required_signer_hash,
}
use mocktail/virgin_address.{mock_pub_key_address, mock_script_address}
use mocktail/virgin_key_hash.{mock_policy_id, mock_pub_key_hash}
use mocktail/virgin_output_reference.{mock_tx_hash, mock_utxo_ref}
use oracle.{OracleDatum, OracleRedeemer}
use util.{cip68_100, cip68_222}
use vodka_converter.{convert_int_to_bytes}
use vodka_inputs.{inputs_with_policy}
use vodka_mints.{check_policy_only_burn, only_minted_token, token_minted}
use vodka_address.{address_payment_key}
use vodka_extra_signatories.{key_signed}

pub type MintPolarity {
  RMint
  RBurn
  RMintCip68 { nft_index: Int }
  RBulkMint { quantity: Int }
}

// Helper function to validate bulk minting
fn validate_bulk_mint(
  mint: Value,
  policy_id: PolicyId,
  collection_name: ByteArray,
  start_index: Int,
  quantity: Int,
) -> Bool {
  // Check that we're minting exactly 'quantity' NFTs with correct names
  let expected_tokens = generate_expected_tokens(
    policy_id,
    collection_name,
    start_index,
    quantity,
  )
  
  // Convert Value to list and filter for our policy
  let mint_list = flatten(mint)
  let policy_mint = list.filter(
    mint_list,
    fn(item) {
      let (pid, _, _) = item
      pid == policy_id
    },
  )
  
  // Check that the minted tokens match expected tokens
  list.length(policy_mint) == quantity && 
  list.all(
    expected_tokens,
    fn(expected) {
      let (expected_name, expected_quantity) = expected
      list.any(
        policy_mint,
        fn(minted) {
          let (_, name, quantity) = minted
          name == expected_name && quantity == expected_quantity
        },
      )
    },
  )
}

// Generate list of expected token names and quantities for bulk mint
fn generate_expected_tokens(
  policy_id: PolicyId,
  collection_name: ByteArray,
  start_index: Int,
  quantity: Int,
) -> List<(ByteArray, Int)> {
  generate_tokens_recursive(collection_name, start_index, quantity, [])
}

fn generate_tokens_recursive(
  collection_name: ByteArray,
  current_index: Int,
  remaining: Int,
  acc: List<(ByteArray, Int)>,
) -> List<(ByteArray, Int)> {
  if remaining <= 0 {
    acc
  } else {
    let asset_name =
      collection_name
        |> concat(" (")
        |> concat(convert_int_to_bytes(current_index))
        |> concat(")")
    generate_tokens_recursive(
      collection_name,
      current_index + 1,
      remaining - 1,
      list.push(acc, (asset_name, 1)),
    )
  }
}

validator plutus_nft(collection_name: ByteArray, oracle_nft: PolicyId) {
  mint(redeemer: MintPolarity, policy_id: PolicyId, tx: Transaction) {
    when redeemer is {
      RMint -> {
        let Transaction { inputs, mint, .. } = tx
        expect [auth_input] = inputs_with_policy(inputs, oracle_nft)
        expect InlineDatum(input_datum) = auth_input.output.datum
        expect OracleDatum { count, max_mints, nft_mint_allowed, .. } =
          input_datum
        // implies count < max_mints
        let mint_does_not_exceed_max_mints = count + 1 <= max_mints
        let base_asset_name =
          collection_name
            |> concat(" (")
            |> concat(convert_int_to_bytes(count))
            |> concat(")")

        let only_minted_regular_nft =
          only_minted_token(mint, policy_id, base_asset_name, 1)
        let only_minted_222_real_nft = 
          only_minted_token(mint, policy_id, cip68_222(base_asset_name), 1)
        let only_minted_100_reference_nft = 
          only_minted_token(mint, policy_id, cip68_100(base_asset_name), 1)
        let only_minted_two_tokens = 
          only_minted_100_reference_nft? && only_minted_222_real_nft?
        let only_minted_one_token = or {
          only_minted_regular_nft?,
          only_minted_222_real_nft?,
        }
        and {
          mint_does_not_exceed_max_mints?,
          // only_minted_one_token?,
          or {
            only_minted_two_tokens?,
            only_minted_one_token?,
          },
          nft_mint_allowed?,
        }
      }

      RMintCip68 { nft_index } -> {
        let Transaction { inputs, mint, reference_inputs, .. } = tx
        // check reference inputs for oracle
        expect [ref_input] = inputs_with_policy(reference_inputs, oracle_nft)
        let has_oracle_ref_input =
          policies(ref_input.output.value)
            |> list.has(oracle_nft)
        expect InlineDatum(ref_datum) = ref_input.output.datum

        when ref_input.output.datum is {
          InlineDatum(input_datum) -> {
            expect OracleDatum { count, max_mints, nft_mint_allowed, .. } =
              input_datum
            // implies count < max_mints
            let reference_mint_does_not_exceed_max_mints = nft_index < max_mints
            let base_asset_name =
              collection_name
                |> concat(" (")
                |> concat(convert_int_to_bytes(nft_index))
                |> concat(")")
            let reference_asset_name = cip68_100(base_asset_name)
            let real_token_minted =
              token_minted(mint, policy_id, base_asset_name, 1)
            let only_minted_reference_token =
              token_minted(mint, policy_id, reference_asset_name, 1)

            trace mint
            and {
              reference_mint_does_not_exceed_max_mints?,
              only_minted_reference_token?,
            }
          }
          _ -> fail
        }
      }

      RBulkMint { quantity } -> {
        let Transaction { inputs, mint, .. } = tx
        expect [auth_input] = inputs_with_policy(inputs, oracle_nft)
        expect InlineDatum(input_datum) = auth_input.output.datum
        expect OracleDatum { count, max_mints, nft_mint_allowed, .. } =
          input_datum
        
        // Check that bulk mint doesn't exceed max_mints
        let mint_does_not_exceed_max_mints = count + quantity <= max_mints
        
        // Validate each NFT in the bulk mint
        let valid_bulk_mint = validate_bulk_mint(
          mint,
          policy_id,
          collection_name,
          count,
          quantity,
        )
        
        and {
          mint_does_not_exceed_max_mints?,
          valid_bulk_mint?,
          nft_mint_allowed?,
          quantity > 0,
        }
      }

      RBurn -> check_policy_only_burn(tx.mint, policy_id)
    }
  }

  // just add it as a reference input to keep stuff simple&reduce contention

  spend(
    _datum_opt,
    //TODO(Elaine): don't think we need any redeemer
    _redeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    let Transaction {
      mint,
      inputs,
      reference_inputs,
      outputs,
      extra_signatories,
      ..
    } = tx

    // check reference inputs for oracle
    expect [ref_input] = inputs_with_policy(reference_inputs, oracle_nft)
    let has_oracle_ref_input =
      policies(ref_input.output.value)
        |> list.has(oracle_nft)
    expect InlineDatum(ref_datum) = ref_input.output.datum
    expect OracleDatum { nft_trade_allowed, fee_address, .. } = ref_datum
    
    let owner_key = address_payment_key(fee_address)
    let is_owner_signed = key_signed(extra_signatories, owner_key)

    nft_trade_allowed? && has_oracle_ref_input? && is_owner_signed?
  }

  else(_) {
    fail
  }
}

test success_mint() {
  let redeemer = RMint
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
      |> tx_in_inline_datum(
          True,
          OracleDatum {
            count: 0,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: True,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      |> mint(True, 1, policy_id, "collection (0)")
      |> complete()

  plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test success_mint_cip68_222_real_token() {
  let redeemer = RMint
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
      |> tx_in_inline_datum(
          True,
          OracleDatum {
            count: 0,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: True,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      |> mint(True, 1, policy_id, cip68_222("collection (0)"))
      |> complete()

  plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)

}

test success_mint_cip68_100_reference () {
  let redeemer = RMintCip68 { nft_index: 0 }
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> ref_tx_in(
          True,
          mock_tx_hash(0),
          0,
          input_value,
          mock_script_address(0, None),
        )
      |> ref_tx_in_inline_datum(
          True,
          OracleDatum {
            count: 0,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: True,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        ) 
      |> mint(True, 1, policy_id, cip68_100("collection (0)"))
      |> complete()

  plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

type TradeNFTTestCase {
  is_nft_trade_allowed: Bool,
  is_owner_signed: Bool,
}

fn mock_trade_nft_tx(test_case: TradeNFTTestCase) -> Transaction {
  let TradeNFTTestCase { is_nft_trade_allowed, is_owner_signed} = test_case

  let nft_input_value =
    from_asset(mock_policy_id(0), "collection (0)", 1) |> add("", "", 2_000_000)

  let oracle_nft_policy = mock_policy_id(1)
  let oracle_input_value = from_asset(oracle_nft_policy, "", 1)

  let tx =
    mocktail_tx()
      |> tx_in(
          True,
          mock_tx_hash(0),
          0,
          nft_input_value,
          mock_script_address(0, None),
        )
      |> ref_tx_in(
          True,
          mock_tx_hash(1),
          1,
          oracle_input_value,
          mock_script_address(1, None),
        )
      |> ref_tx_in_inline_datum(
          True,
          OracleDatum {
            count: 1,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(2, None),
            nft_mint_allowed: True,
            nft_trade_allowed: is_nft_trade_allowed,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      
    |> tx_out(
          True,
          mock_pub_key_address(1, None),
          from_asset(mock_policy_id(0), "collection (0)", 1),
        )
      |> required_signer_hash(is_owner_signed, mock_pub_key_hash(2))
      |> complete()

  tx
}

test success_trade() {
  let tx = mock_trade_nft_tx(TradeNFTTestCase { is_nft_trade_allowed: True, is_owner_signed: True })
  plutus_nft.spend(
    "collection",
    mock_policy_id(1),
    // see `let oracle_nft_policy =...` in mock_trade_nft_tx
    None,
    None,
    mock_utxo_ref(2, 0),
    tx,
  )
}

test fail_trade() {
  let tx = mock_trade_nft_tx(TradeNFTTestCase { is_nft_trade_allowed: False, is_owner_signed: True })
  !plutus_nft.spend(
    "collection",
    mock_policy_id(1),
    // see `let oracle_nft_policy =...` in mock_trade_nft_tx
    None,
    None,
    mock_utxo_ref(2, 0),
    tx,
  )
}

test fail_mint_with_incorrect_name() {
  let redeemer = RMint
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
      |> tx_in_inline_datum(
          True,
          OracleDatum {
            count: 0,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: True,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      |> mint(True, 1, policy_id, "collection (1)")
      |> complete()

  !plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test fail_mint_with_mix() {
  let redeemer = RMint
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
      |> tx_in_inline_datum(
          True,
          OracleDatum {
            count: 0,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: True,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      |> mint(True, 1, policy_id, "collection (0)")
      |> mint(True, 1, mock_policy_id(0), "collection (0)")
      |> complete()

  !plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test success_burn() {
  let redeemer = RBurn
  let policy_id = mock_policy_id(1)

  let tx =
    mocktail_tx()
      |> mint(True, -1, policy_id, "")
      |> complete()

  plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test success_burn_with_other_minting() {
  let redeemer = RBurn
  let policy_id = mock_policy_id(1)

  let tx =
    mocktail_tx()
      |> mint(True, -1, policy_id, "")
      |> mint(True, -1, mock_policy_id(1), "")
      |> complete()
  plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test fail_burn_with_mint() {
  let redeemer = RBurn
  let policy_id = mock_policy_id(1)

  let tx =
    mocktail_tx()
      |> mint(True, 1, policy_id, "")
      |> complete()

  !plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test fail_burn_with_mix() {
  let redeemer = RBurn
  let policy_id = mock_policy_id(1)

  let tx =
    mocktail_tx()
      |> mint(True, -1, policy_id, "")
      |> mint(True, 1, policy_id, "1")
      |> complete()

  !plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test fail_mint_exceeded_max_mints() {
  let redeemer = RMint
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
      |> tx_in_inline_datum(
          True,
          OracleDatum {
            count: 10,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: True,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      |> mint(True, 1, policy_id, "collection (10)")
      |> complete()

  !plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test fail_mint_with_nft_mint_not_allowed() {
  let redeemer = RMint
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
      |> tx_in_inline_datum(
          True,
          OracleDatum {
            count: 0,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: False,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      |> mint(True, 1, policy_id, "collection (0)")
      |> complete()

  !plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test success_bulk_mint() {
  let redeemer = RBulkMint { quantity: 3 }
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
      |> tx_in_inline_datum(
          True,
          OracleDatum {
            count: 0,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: True,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      |> mint(True, 1, policy_id, "collection (0)")
      |> mint(True, 1, policy_id, "collection (1)")
      |> mint(True, 1, policy_id, "collection (2)")
      |> complete()

  plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}

test fail_bulk_mint_exceeds_max() {
  let redeemer = RBulkMint { quantity: 5 }
  let policy_id = mock_policy_id(1)
  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  let tx =
    mocktail_tx()
      |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
      |> tx_in_inline_datum(
          True,
          OracleDatum {
            count: 8,
            lovelace_price: 1_000_000,
            fee_address: mock_pub_key_address(0, None),
            nft_mint_allowed: True,
            nft_trade_allowed: True,
            expected_apr_numerator: 0,
            expected_apr_denominator: 1,
            maturation_time: 0,
            max_mints: 10,
          },
        )
      |> mint(True, 1, policy_id, "collection (8)")
      |> mint(True, 1, policy_id, "collection (9)")
      |> mint(True, 1, policy_id, "collection (10)")
      |> mint(True, 1, policy_id, "collection (11)")
      |> mint(True, 1, policy_id, "collection (12)")
      |> complete()

  !plutus_nft.mint("collection", mock_policy_id(0), redeemer, policy_id, tx)
}
