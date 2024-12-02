import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import sdk from "@farcaster/frame-sdk";
import { parseUnits, formatUnits, BaseError } from "viem";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import qs from "qs";

import { Button } from "~/components/ui/Button";
import { truncateAddress } from "~/lib/truncateAddress";
import { PriceResponse, QuoteResponse } from "~/lib/types/zeroex";

interface Token {
  symbol: string;
  name: string;
  image: string;
  address: string;
  decimals: number;
}

const ETH = {
  symbol: "ETH",
  name: "Ethereum",
  image: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  decimals: 18,
};

const DEMO_TOKENS: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    image:
      "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
  },
  {
    symbol: "CLANKER",
    name: "Clanker",
    image:
      "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/295953fa-15ed-4d3c-241d-b6c1758c6200/original",
    address: "0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb",
    decimals: 18,
  },
];

const AFFILIATE_FEE = 25;
const PROTOCOL_GUILD_ADDRESS = "0x32e3C7fD24e175701A35c224f2238d18439C7dBC";

export default function Swap({ token } : { token: string }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  const sellToken = ETH;
  const [sellAmount, setSellAmount] = useState("");

  const [buyAmount, setBuyAmount] = useState("");
  const [buyToken, setBuyToken] = useState<Token>(token === 'clanker' ? DEMO_TOKENS[1] : DEMO_TOKENS[0]);

  const [getPriceError, setGetPriceError] = useState([]);

  const [price, setPrice] = useState<PriceResponse>();
  const [quote, setQuote] = useState<QuoteResponse>();

  const [isFinalized, setIsFinalized] = useState(false);

  const parsedSellAmount = sellAmount
    ? parseUnits(sellAmount, sellToken.decimals).toString()
    : undefined;

  const parsedBuyAmount = buyAmount
    ? parseUnits(buyAmount, buyToken.decimals).toString()
    : undefined;

  const [msg, setMsg] = useState("");

  const { address } = useAccount();
  const { error, data: hash, sendTransaction } = useSendTransaction();
  const { isSuccess: isConfirmed, isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  useEffect(() => {
    const params = {
      chainId: 8453,
      sellToken: sellToken.address,
      buyToken: buyToken.address,
      sellAmount: parsedSellAmount,
      buyAmount: parsedBuyAmount,
      taker: address,
      swapFeeRecipient: PROTOCOL_GUILD_ADDRESS,
      swapFeeBps: AFFILIATE_FEE,
      swapFeeToken: buyToken.address,
      tradeSurplusRecipient: PROTOCOL_GUILD_ADDRESS,
    };

    async function main() {
      const response = await fetch(`/api/price?${qs.stringify(params)}`);
      const data = await response.json();

      if (data?.validationErrors?.length > 0) {
        setGetPriceError(data.validationErrors);
      } else {
        setGetPriceError([]);
      }
      if (data.buyAmount) {
        setBuyAmount(formatUnits(data.buyAmount, buyToken.decimals));
        setPrice(data);
      }
    }

    if (sellAmount !== "") {
      main();
    }
  }, [
    sellAmount,
    sellToken.address,
    parsedSellAmount,
    parsedBuyAmount,
    address,
    buyToken.decimals,
    buyToken.address,
  ]);

  useEffect(() => {
    const params = {
      chainId: 8453,
      sellToken: sellToken.address,
      buyToken: buyToken.address,
      sellAmount: parsedSellAmount,
      buyAmount: parsedBuyAmount,
      taker: address,
      swapFeeRecipient: PROTOCOL_GUILD_ADDRESS,
      swapFeeBps: AFFILIATE_FEE,
      swapFeeToken: buyToken.address,
      tradeSurplusRecipient: PROTOCOL_GUILD_ADDRESS,
    };

    async function main() {
      const response = await fetch(`/api/quote?${qs.stringify(params)}`);
      const data = await response.json();
      setQuote(data);
    }

    if (isFinalized) {
      main();
    }
  }, [
    sellAmount,
    sellToken.address,
    parsedSellAmount,
    parsedBuyAmount,
    address,
    buyToken.decimals,
    buyToken.address,
    isFinalized,
  ]);

  const finalize = useCallback(() => {
    setIsFinalized(true);
  }, []);

  const executeSwap = useCallback(() => {
    if (quote) {
      sendTransaction({
        gas: quote.transaction.gas ? BigInt(quote?.transaction.gas) : undefined,
        to: quote?.transaction.to,
        data: quote.transaction.data,
        value: quote?.transaction.value
          ? BigInt(quote.transaction.value)
          : undefined,
      });
    }
  }, [quote, sendTransaction]);

  const linkToBaseScan = useCallback((hash?: string) => {
    if (hash) {
      sdk.actions.openUrl(`https://basescan.org/tx/${hash}`);
    }
  }, []);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      {address && (
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-500">
            {truncateAddress(address)}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Sell Token Input */}
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800"
          />
          <div className="absolute right-2 top-2 flex items-center gap-2 bg-white dark:bg-gray-700 px-2 py-1 rounded-md">
            <Image
              src={sellToken.image}
              alt={sellToken.symbol}
              width={100}
              height={100}
              className="w-6 h-6 rounded-full"
            />
            <div className="bg-transparent border-none outline-none">
              {sellToken.symbol}
            </div>
          </div>
        </div>

        {/* Buy Token Input */}
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            value={buyAmount}
            onChange={() => {}}
            placeholder="0.0"
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800"
          />
          <div className="absolute right-2 top-2 flex items-center gap-2 bg-white dark:bg-gray-700 px-2 py-1 rounded-md">
            <Image
              src={buyToken.image}
              alt={buyToken.symbol}
              width={100}
              height={100}
              className="w-6 h-6 rounded-full"
            />
            <select
              value={buyToken.symbol}
              onChange={(e) =>
                setBuyToken(
                  DEMO_TOKENS.find((t) => t.symbol === e.target.value) ||
                    DEMO_TOKENS[1]
                )
              }
              className="bg-transparent border-none outline-none"
            >
              {DEMO_TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={isFinalized ? executeSwap : finalize}>
          {isFinalized ? "Confirm" : "Swap"}
        </Button>
      </div>

      {quote && (
        <div className="mt-4">
          Receive at least{" "}
          {formatUnits(BigInt(quote.minBuyAmount), buyToken.decimals)} USDC
        </div>
      )}

      {isConfirming && (
        <div className="text-orange-500 text-center mt-4">
          ⏳ Waiting for confirmation...
        </div>
      )}
      {isConfirmed && (
        <div
          className="text-green-500 text-center mt-4"
          onClick={() => linkToBaseScan(hash)}
        >
          <p>🎉 Transaction Confirmed!</p>
          <p>Tap to View on Basescan</p>
        </div>
      )}

      {getPriceError.length > 0 && (
        <div className="text-red-500 text-sm mt-2">
          {getPriceError.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm mt-2">
          Error: {(error as BaseError).shortMessage || error.message}
        </div>
      )}

      {msg}
    </div>
  );
}
