// Cardano wallet interface
interface Cardano {
  [key: string]: any;
  nami?: any;
  flint?: any;
  eternl?: any;
  lace?: any;
  yoroi?: any;
  typhoncip30?: any;
}

declare global {
  interface Window {
    cardano: Cardano;
  }
}

export {};