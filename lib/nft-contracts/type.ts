import { ConStr0, Integer, PubKeyAddress, Bool, mConStr0, mPubKeyAddress, mBool, conStr0, UTxO, integer, pubKeyAddress, bool, mConStr2, mConStr1, ConStr, mConStr, conStr, MConStr} from "@meshsdk/common";

export type OracleDatum = ConStr0<[Integer, Integer, PubKeyAddress, Bool, Bool, Integer, Integer, Integer, Integer]>;

export const mOracleDatum = (count: number|bigint, lovelace_price: number|bigint, fee_address_pubKeyHash: string, fee_address_stakeCredentialHash: string, nft_mint_allowed: boolean, nft_trade_allowed: boolean, expected_apr_numerator: number|bigint, expected_apr_denominator: number|bigint, maturation_time: bigint, max_mints: bigint) => {
    return mConStr0([count, lovelace_price, mPubKeyAddress(fee_address_pubKeyHash, fee_address_stakeCredentialHash), mBool(nft_mint_allowed), mBool(nft_trade_allowed), expected_apr_numerator, expected_apr_denominator, maturation_time, max_mints]);
}
export const oracleDatum = ({ count, lovelace_price, fee_address, nft_mint_allowed, nft_trade_allowed, expected_apr_numerator, expected_apr_denominator, maturation_time, max_mints }: { count: number | bigint; lovelace_price: number | bigint; fee_address: PubKeyAddress; nft_mint_allowed: Bool; nft_trade_allowed: Bool; expected_apr_numerator: number | bigint; expected_apr_denominator: number | bigint; maturation_time: bigint; max_mints: bigint; }): OracleDatum => {
    return conStr0([integer(count), integer(lovelace_price), fee_address, nft_mint_allowed, nft_trade_allowed, integer(expected_apr_numerator), integer(expected_apr_denominator), integer(maturation_time), integer(max_mints)]);
}

export type OracleData = {
    nftIndex: number | bigint;
    policyId: string;
    lovelacePrice: number | bigint;
    oracleUtxo: UTxO;
    oracleNftPolicyId: string;
    feeCollectorAddress: string;
    feeCollectorAddressObj: PubKeyAddress;
    nftMintAllowed: Bool;
    nftTradeAllowed: Bool;
    expectedAprNumerator: Integer;
    expectedAprDenominator: Integer;
    maturationTime: Integer;
    maxMints: Integer;
}

export type ParamUtxo = {
  outputIndex: number;
  txHash: string;
}

export type OracleRedeemerData =
      "MintPlutusNFT"
    | "StopOracle"
    | "EnableNFTMinting"
    | "DisableNFTMinting"
    | "EnableNFTTrading"
    | "DisableNFTTrading"

export type OracleRedeemer = ConStr0<never[]> | ConStr<3, never[]> | ConStr<4, never[]> | ConStr<5, never[]>;
export type MOracleRedeemer = MConStr<0, never[]> | MConStr<1, never[]> | MConStr<2, never[]> | MConStr<3, never[]> | MConStr<4, never[]> | MConStr<5, never[]>;
export function oracleRedeemer(redeemer: OracleRedeemerData): OracleRedeemer {
    switch (redeemer) {
        case "MintPlutusNFT": return conStr0([]);
        case "StopOracle": return conStr0([]);
        case "EnableNFTMinting": return conStr0([]);
        case "DisableNFTMinting": return conStr(3, []);
        case "EnableNFTTrading": return conStr(4, []);
        case "DisableNFTTrading": return conStr(5, []);
    }
}

export function mOracleRedeemer(redeemer: OracleRedeemerData): MOracleRedeemer {
    switch (redeemer) {
        case "MintPlutusNFT": return mConStr0([]);
        case "StopOracle": return mConStr1([]);
        case "EnableNFTMinting": return mConStr2([]);
        case "DisableNFTMinting": return mConStr(3, []);
        case "EnableNFTTrading": return mConStr(4, []);
        case "DisableNFTTrading": return mConStr(5, []);
    }
}

export type NftMintPolarityRedeemer = "RMint" | "RBurn" | "RMintCip68" | "RBulkMint"
export const mNftMintOrBurn = (polarity: "RMint" | "RBurn") => {
    switch (polarity) {
        case "RMint": return mConStr0([]);
        case "RBurn": return mConStr1([]);
    }
}
export const mRMintCip68 = (cip68TokenIndex: number) => {
    return mConStr2([cip68TokenIndex]);
}
export const mRBulkMint = (quantity: number) => {
    return mConStr(3, [quantity]);
}