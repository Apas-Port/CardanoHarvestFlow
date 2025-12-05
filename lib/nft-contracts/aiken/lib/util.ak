use aiken/primitive/bytearray.{concat}

pub fn cip68_100(base_token_name: ByteArray) -> ByteArray {
  let asset_name = concat(#"000643b0", base_token_name)
  asset_name
}

pub fn cip68_222(base_token_name: ByteArray) -> ByteArray {
  let reference_asset_name = concat(#"000de140", base_token_name)
  reference_asset_name
}
