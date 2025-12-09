declare global {
  namespace NodeJS {
    interface ProcessEnv {
        BLOCKFROST_API_KEY: string;
        // NODE_ENV: 'development' | 'production';
        PWD: string;
        PAYMENT_MNEMONIC?: string;
        // PAYMENT_KEY?: string;
        // STAKING_KEY?: string;
        // PAYMENT_KEY_PATH?: string;
        // STAKING_KEY_PATH?: string;
        //not providing PARAM_UTXO_PATH will boot the protocol with a new one
        PARAM_UTXO_PATH?: string;

        COLLECTION_NAME?: string;

        //exact UNIX timestamp, no sub-second precision
        // MATURATION_TIME?: bigint;
        MATURATION_TIME?: string;

        // mint price in lovelace
        // FEE_PRICE_LOVELACE?: number;
        FEE_PRICE_LOVELACE?: string;

        //max number of NFTs that can be minted
        // MAX_MINTS?: bigint;
        MAX_MINTS?: string;

        // this information is not enforced on-chain
        // nevertheless, it is stored as a real number/fraction, in case one day it is paid out on-chain instead of off-chain
        // EXPECTED_APR_NUMERATOR?: number;
        // EXPECTED_APR_DENOMINATOR?: number;
        EXPECTED_APR_NUMERATOR?: string;


    }
  }
}

export {}