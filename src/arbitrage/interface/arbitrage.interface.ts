export interface OmpfinexApiResponse<T> {
  status: string;
  data: T;
}

export interface UserData {
  uid: number;
  first_name: string;
  last_name: string;
  email: string;
  birthday: string;
  phone: number;
  national_id: string;
  gender: string;
  email_verified: string;
  phone_verified: string;
  identity_card_verified: string;
  landline_phone_verified: string;
  bank_verified: string;
  address_verified: string;
  address: null;
  identity_verified: string;
  google_auth_enabled: boolean;
  referred: boolean;
  transaction_fee: number;
  total_volume: number;
  user_level: string;
  settings: Setting[];
}

interface Setting {
  name: string;
  label: string;
  type: 'boolean' | 'enum';
  value: boolean | string;
  items?: EnumItem[];
}

interface EnumItem {
  id: string;
  label: string;
}

export interface CurrencyArbitrageData {
  currencyId: string;
  currencyName: string;
  iconPath: string;
  name: string;
  comparedWith: string;
  diffPercentage: number;
  label: number;
  targetPrice: number;
  actionPrice: number;
}
