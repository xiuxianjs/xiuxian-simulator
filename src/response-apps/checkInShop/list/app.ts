import { getBackendCheckInShop } from '@src/api/bot/checkin-shop-queries';

type Product = {
  id: number;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  monthlyLimit: number;
  bought: number;
};

type Result = {
  code: 'OK';
  data: {
    signInCoin: number;
    products: Product[];
  };
};

export default async function App(params: { uid: number; bid?: string }): Promise<Result> {
  const result = await getBackendCheckInShop(params.bid, params.uid);

  return {
    code: 'OK',
    data: {
      signInCoin: result.signInCoin,
      products: result.products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        quantity: p.quantity,
        price: p.price,
        monthlyLimit: p.monthlyLimit,
        bought: p.bought
      }))
    }
  };
}
