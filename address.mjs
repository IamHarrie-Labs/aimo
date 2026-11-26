// Wallet addresses in the formats an agent is likely to meet. Used by the
// local risk scan (engine.mjs) and the high-stakes test (reviewer.mjs), so a
// memory that names a payee always gets reviewed, whatever chain it is on.
const B58 = "1-9A-HJ-NP-Za-km-z";
export const WALLET_ADDRESS = new RegExp(
  [
    // EVM: 0x followed by hex, full or partial ("0xF00d")
    String.raw`\b0[xX][0-9a-fA-F]{3,}`,
    // Bitcoin: bech32 and legacy
    String.raw`\b[bB][cC]1[a-zA-Z0-9]{20,}\b`,
    String.raw`\b[13][${B58}]{25,34}\b`,
    // Solana and other base58 keys: 32-44 characters with a digit, an
    // upper-case and a lower-case letter, so long plain words never match
    String.raw`\b(?=[${B58}]*\d)(?=[${B58}]*[A-Z])(?=[${B58}]*[a-z])[${B58}]{32,44}\b`,
    // Shortened forms as wallets display them: "7xKX...AsU", "7xKX…AsU".
    // The whole token needs a digit and an upper-case letter, so prose such
    // as "3pm...thanks" or "wait...what" is left alone.
    String.raw`\b(?=[${B58}.…]*\d)(?=[${B58}.…]*[A-Z])[${B58}]{3,8}(?:\.{2,3}|…)[${B58}]{3,8}\b`,
  ].join("|"),
);
